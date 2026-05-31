import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Mom } from '../entities/mom.entity';
import { Sprint } from '../entities/sprint.entity';
import { User } from '../entities/user.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { CreateMomDto } from './dto/create-mom.dto';
import { UpdateMomDto } from './dto/update-mom.dto';
import { GenerateMomDto } from './dto/generate-mom.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class MomService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    private tenantService: TenantService,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  async create(createMomDto: CreateMomDto, userId: string): Promise<Mom> {
    const { sprintId, date, rawInput, agenda, keyDiscussionPoints, decisionsTaken, actionItems } = createMomDto;
    const [momRepo, sprintRepo, dailyLockRepo] = await Promise.all([
      this.tenantService.getRepository(Mom),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(DailyLock),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId }, relations: ['project'] });
    if (!sprint) throw new NotFoundException(`Sprint with ID ${sprintId} not found`);

    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    if (targetDate < sprintStart || targetDate > sprintEnd) {
      throw new BadRequestException('MOM date must be within sprint date range');
    }

    const dayLock = await dailyLockRepo.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });
    if (dayLock && dayLock.isLocked) throw new ForbiddenException('Cannot create MOM for a locked day');

    const existingMom = await momRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate } });
    if (existingMom) throw new BadRequestException('MOM already exists for this day. Use update instead.');

    const mom = momRepo.create({
      sprint,
      date: targetDate,
      rawInput,
      agenda,
      keyDiscussionPoints,
      decisionsTaken,
      actionItems,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    return momRepo.save(mom);
  }

  async update(momId: string, updateMomDto: UpdateMomDto, userId: string): Promise<Mom> {
    const [momRepo, dailyLockRepo] = await Promise.all([
      this.tenantService.getRepository(Mom),
      this.tenantService.getRepository(DailyLock),
    ]);

    const mom = await momRepo.findOne({ where: { id: momId }, relations: ['sprint'] });
    if (!mom) throw new NotFoundException(`MOM with ID ${momId} not found`);

    const dayLock = await dailyLockRepo.findOne({
      where: { sprint: { id: mom.sprint.id }, date: mom.date, slotNumber: IsNull() },
    });
    if (dayLock && dayLock.isLocked) throw new ForbiddenException('Cannot edit MOM for a locked day');

    if (updateMomDto.rawInput !== undefined) mom.rawInput = updateMomDto.rawInput;
    if (updateMomDto.agenda !== undefined) mom.agenda = updateMomDto.agenda;
    if (updateMomDto.keyDiscussionPoints !== undefined) mom.keyDiscussionPoints = updateMomDto.keyDiscussionPoints;
    if (updateMomDto.decisionsTaken !== undefined) mom.decisionsTaken = updateMomDto.decisionsTaken;
    if (updateMomDto.actionItems !== undefined) mom.actionItems = updateMomDto.actionItems;
    mom.updatedBy = { id: userId } as User;

    return momRepo.save(mom);
  }

  async findById(momId: string): Promise<Mom | null> {
    const momRepo = await this.tenantService.getRepository(Mom);
    return momRepo.findOne({ where: { id: momId }, relations: ['sprint', 'createdBy', 'updatedBy'] });
  }

  async findBySprintAndDate(sprintId: string, date: string): Promise<Mom | null> {
    const momRepo = await this.tenantService.getRepository(Mom);
    const targetDate = new Date(date);
    return momRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate }, relations: ['sprint', 'createdBy', 'updatedBy'] });
  }

  async findAllBySprint(sprintId: string): Promise<Mom[]> {
    const momRepo = await this.tenantService.getRepository(Mom);
    return momRepo.find({ where: { sprint: { id: sprintId } }, relations: ['sprint', 'createdBy', 'updatedBy'], order: { date: 'ASC' } });
  }

  async remove(momId: string): Promise<void> {
    const [momRepo, dailyLockRepo] = await Promise.all([
      this.tenantService.getRepository(Mom),
      this.tenantService.getRepository(DailyLock),
    ]);

    const mom = await momRepo.findOne({ where: { id: momId }, relations: ['sprint'] });
    if (!mom) throw new NotFoundException(`MOM with ID ${momId} not found`);

    const dayLock = await dailyLockRepo.findOne({
      where: { sprint: { id: mom.sprint.id }, date: mom.date, slotNumber: IsNull() },
    });
    if (dayLock && dayLock.isLocked) throw new ForbiddenException('Cannot delete MOM for a locked day');

    await momRepo.remove(mom);
  }

  async generateMomWithAI(generateMomDto: GenerateMomDto): Promise<{
    agenda: string;
    keyDiscussionPoints: string;
    decisionsTaken: string;
    actionItems: string;
  }> {
    const { rawInput } = generateMomDto;

    const prompt = `You are a meeting minutes assistant. Analyze the meeting notes and return ONLY valid JSON (use \\n for line breaks):
{"agenda":"...","keyDiscussionPoints":"...","decisionsTaken":"...","actionItems":"Person A: Task 1\\nPerson B: Task 2"}

Meeting notes:
${rawInput}`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.groqModel,
          messages: [
            { role: 'system', content: 'You are a meeting minutes assistant. Return ONLY valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        },
        {
          headers: { Authorization: `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
          timeout: 30000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return this.fallbackParse(rawInput);

      let jsonString = jsonMatch[0];
      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        jsonString = jsonString.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, ' ');
        parsed = JSON.parse(jsonString);
      }

      return {
        agenda: parsed.agenda || 'No agenda specified',
        keyDiscussionPoints: parsed.keyDiscussionPoints || rawInput,
        decisionsTaken: parsed.decisionsTaken || 'No decisions recorded',
        actionItems: parsed.actionItems || 'No action items',
      };
    } catch (error: any) {
      console.error('[MomService.generateMomWithAI] Error:', error.message);
      return this.fallbackParse(rawInput);
    }
  }

  private fallbackParse(rawInput: string) {
    return { agenda: 'Meeting discussion', keyDiscussionPoints: rawInput, decisionsTaken: 'To be reviewed', actionItems: 'To be determined' };
  }
}
