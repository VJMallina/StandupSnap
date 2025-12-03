import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Express } from 'express';
import { StandaloneMom, StandaloneMeetingType } from '../entities/standalone-mom.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { User } from '../entities/user.entity';
import { CreateStandaloneMomDto } from './dto/create-standalone-mom.dto';
import { UpdateStandaloneMomDto } from './dto/update-standalone-mom.dto';
import { FilterStandaloneMomDto } from './dto/filter-standalone-mom.dto';
import { GenerateStandaloneMomDto } from './dto/generate-ai.dto';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

@Injectable()
export class StandaloneMomService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    @InjectRepository(StandaloneMom)
    private standaloneMomRepo: Repository<StandaloneMom>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Sprint)
    private sprintRepo: Repository<Sprint>,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  private validateMeetingDate(meetingDate: string) {
    const date = new Date(meetingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      throw new BadRequestException('Meeting date cannot be in the future');
    }
    return date;
  }

  private async resolveProjectAndSprint(projectId: string, sprintId?: string): Promise<{ project: Project; sprint: Sprint | null }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    let sprint: Sprint | null = null;
    if (sprintId) {
      sprint = await this.sprintRepo.findOne({ where: { id: sprintId }, relations: ['project'] });
      if (!sprint) {
        throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
      }
      if (sprint.project.id !== project.id) {
        throw new BadRequestException('Sprint must belong to the selected project');
      }
    }

    return { project, sprint };
  }

  private computeMeetingType(meetingType: StandaloneMeetingType, customMeetingType?: string) {
    if ((meetingType === StandaloneMeetingType.CUSTOM || meetingType === StandaloneMeetingType.OTHER) && customMeetingType) {
      return { meetingType, customMeetingType };
    }
    return { meetingType, customMeetingType: null };
  }

  async create(dto: CreateStandaloneMomDto, userId: string): Promise<StandaloneMom> {
    const meetingDate = this.validateMeetingDate(dto.meetingDate);
    const { project, sprint } = await this.resolveProjectAndSprint(dto.projectId, dto.sprintId);
    const { meetingType, customMeetingType } = this.computeMeetingType(dto.meetingType, dto.customMeetingType);

    const mom = this.standaloneMomRepo.create({
      project,
      sprint: sprint || null,
      title: dto.title,
      meetingDate,
      meetingType,
      customMeetingType,
      rawNotes: dto.rawNotes || null,
      agenda: dto.agenda || null,
      discussionSummary: dto.discussionSummary || null,
      decisions: dto.decisions || null,
      actionItems: dto.actionItems || null,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    return this.standaloneMomRepo.save(mom);
  }

  async update(id: string, dto: UpdateStandaloneMomDto, userId: string): Promise<StandaloneMom> {
    const mom = await this.standaloneMomRepo.findOne({
      where: { id, archived: false },
      relations: ['project', 'sprint'],
    });
    if (!mom) throw new NotFoundException('MOM not found');

    if (dto.meetingDate) {
      mom.meetingDate = this.validateMeetingDate(dto.meetingDate);
    }

    if (dto.sprintId || dto.projectId) {
      const projectId = dto.projectId || mom.project.id;
      const sprintId = dto.sprintId || mom.sprint?.id;
      const { project, sprint } = await this.resolveProjectAndSprint(projectId, sprintId);
      mom.project = project;
      mom.sprint = sprint;
    }

    if (dto.title !== undefined) mom.title = dto.title;
    if (dto.rawNotes !== undefined) mom.rawNotes = dto.rawNotes;
    if (dto.agenda !== undefined) mom.agenda = dto.agenda;
    if (dto.discussionSummary !== undefined) mom.discussionSummary = dto.discussionSummary;
    if (dto.decisions !== undefined) mom.decisions = dto.decisions;
    if (dto.actionItems !== undefined) mom.actionItems = dto.actionItems;
    if (dto.meetingType !== undefined) {
      const { meetingType, customMeetingType } = this.computeMeetingType(dto.meetingType, dto.customMeetingType);
      mom.meetingType = meetingType;
      mom.customMeetingType = customMeetingType;
    }

    mom.updatedBy = { id: userId } as User;
    return this.standaloneMomRepo.save(mom);
  }

  async findOne(id: string): Promise<StandaloneMom> {
    const mom = await this.standaloneMomRepo.findOne({
      where: { id, archived: false },
      relations: ['project', 'sprint', 'createdBy', 'updatedBy'],
    });
    if (!mom) throw new NotFoundException('MOM not found');
    return mom;
  }

  async findAll(filter: FilterStandaloneMomDto) {
    if (filter.dateFrom && filter.dateTo && new Date(filter.dateTo) < new Date(filter.dateFrom)) {
      throw new BadRequestException('Invalid date range');
    }

    const qb = this.standaloneMomRepo
      .createQueryBuilder('mom')
      .leftJoinAndSelect('mom.project', 'project')
      .leftJoinAndSelect('mom.sprint', 'sprint')
      .leftJoinAndSelect('mom.createdBy', 'createdBy')
      .leftJoinAndSelect('mom.updatedBy', 'updatedBy')
      .where('mom.project = :projectId', { projectId: filter.projectId })
      .andWhere('mom.archived = false');

    if (filter.sprintId) {
      qb.andWhere('mom.sprint = :sprintId', { sprintId: filter.sprintId });
    }
    if (filter.meetingType) {
      qb.andWhere('mom.meetingType = :meetingType', { meetingType: filter.meetingType });
    }
    if (filter.search) {
      const search = `%${filter.search}%`;
      qb.andWhere(
        '(mom.title ILIKE :search OR mom.agenda ILIKE :search OR mom.discussionSummary ILIKE :search OR mom.decisions ILIKE :search OR mom.actionItems ILIKE :search)',
        { search },
      );
    }
    if (filter.dateFrom) qb.andWhere('mom.meetingDate >= :from', { from: filter.dateFrom });
    if (filter.dateTo) qb.andWhere('mom.meetingDate <= :to', { to: filter.dateTo });
    if (filter.createdBy) qb.andWhere('mom.createdBy = :createdBy', { createdBy: filter.createdBy });
    if (filter.updatedBy) qb.andWhere('mom.updatedBy = :updatedBy', { updatedBy: filter.updatedBy });

    qb.orderBy('mom.updatedAt', 'DESC');

    return qb.getMany();
  }

  async archive(id: string, userId: string): Promise<StandaloneMom> {
    const mom = await this.findOne(id);
    mom.archived = true;
    mom.updatedBy = { id: userId } as User;
    return this.standaloneMomRepo.save(mom);
  }

  async remove(id: string): Promise<void> {
    const mom = await this.standaloneMomRepo.findOne({ where: { id } });
    if (!mom) throw new NotFoundException('MOM not found');
    await this.standaloneMomRepo.remove(mom);
  }

  async generateWithAI(dto: GenerateStandaloneMomDto) {
    const systemPrompt = `You are an expert meeting minutes assistant. Your task is to analyze raw meeting notes and extract structured information into a JSON format.

IMPORTANT: You must return ONLY a valid JSON object with these exact fields:
- agenda: The main topics/agenda items discussed (bullet points or paragraph)
- discussionSummary: Key discussion points, context, and what was talked about
- decisions: Final decisions or conclusions reached (clearly state each decision)
- actionItems: Action items with owner and due date (format: "Task description - Owner: Name, Due: Date")

INSTRUCTIONS:
1. Extract the agenda from meeting topics, objectives, or discussion points
2. Summarize the main discussion, conversations, and context
3. Identify explicit decisions, agreements, or conclusions
4. List all action items with owners and deadlines when mentioned
5. If a section is not found in the notes, use "Not mentioned" or "No [section] recorded"
6. Use clear, concise language and bullet points where appropriate
7. For action items, always try to identify who is responsible and when it's due

EXAMPLE INPUT:
"Team discussed the new feature release. John presented the progress. We decided to launch on March 15th. Sarah will review documentation by March 10th. Mike raised concerns about testing."

EXAMPLE OUTPUT:
{
  "agenda": "New feature release discussion and launch planning",
  "discussionSummary": "John presented current progress on the new feature. Mike raised concerns about testing coverage and timeline. Team discussed launch readiness and documentation requirements.",
  "decisions": "Launch date confirmed for March 15th. Additional testing will be conducted before launch.",
  "actionItems": "Review and finalize documentation - Owner: Sarah, Due: March 10th"
}

Now parse the following meeting notes:`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.text },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || '';

      // Try to parse JSON directly first (since we're using json_object format)
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Fallback: extract JSON from markdown code blocks or text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return this.fallbackParse(dto.text);
        parsed = JSON.parse(jsonMatch[0]);
      }

      return {
        agenda: parsed.agenda || parsed.Agenda || 'No agenda specified',
        discussionSummary: parsed.discussionSummary || parsed.discussion_summary || parsed.discussion || parsed.summary || 'No discussion summary',
        decisions: parsed.decisions || parsed.Decisions || parsed.decisionsTaken || 'No decisions recorded',
        actionItems: parsed.actionItems || parsed.action_items || parsed.actions || 'No action items',
      };
    } catch (error) {
      console.error('AI generation error:', error.response?.data || error.message);
      return this.fallbackParse(dto.text);
    }
  }

  private fallbackParse(text: string) {
    return {
      agenda: 'Meeting discussion',
      discussionSummary: text,
      decisions: 'To be reviewed',
      actionItems: 'To be determined',
    };
  }

  async extractTranscript(file: any): Promise<string> {
    if (!file) {
      throw new BadRequestException('Enter notes or upload a transcript.');
    }

    const mime = file.mimetype;
    if (mime === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    if (mime === 'application/pdf') {
      try {
        const result = await (pdfParse as any)(file.buffer);
        if (!result.text || !result.text.trim()) throw new Error('empty');
        return result.text;
      } catch (err) {
        throw new BadRequestException('Could not extract content from file. Try uploading a different file.');
      }
    }

    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        if (!result.value || !result.value.trim()) throw new Error('empty');
        return result.value;
      } catch (err) {
        throw new BadRequestException('Could not extract content from file. Try uploading a different file.');
      }
    }

    throw new BadRequestException('Unsupported file format. Upload TXT, PDF, or DOCX.');
  }

  async download(id: string, format: 'txt' | 'docx') {
    const mom = await this.findOne(id);
    const titleLine = `Title: ${mom.title}`;
    const meetingDateString =
      mom.meetingDate instanceof Date ? mom.meetingDate.toISOString().slice(0, 10) : String(mom.meetingDate);
    const dateLine = `Date: ${meetingDateString}`;
    const typeLine = `Meeting Type: ${mom.customMeetingType || mom.meetingType}`;
    const projectLine = `Project: ${mom.project?.name || mom.project?.id}`;
    const sprintLine = mom.sprint ? `Sprint: ${mom.sprint.name}` : 'Sprint: N/A';

    const textBody = [
      titleLine,
      dateLine,
      typeLine,
      projectLine,
      sprintLine,
      '',
      'Agenda:',
      mom.agenda || '',
      '',
      'Discussion Summary:',
      mom.discussionSummary || '',
      '',
      'Decisions:',
      mom.decisions || '',
      '',
      'Action Items:',
      mom.actionItems || '',
    ].join('\n');

    if (format === 'txt') {
      return { buffer: Buffer.from(textBody, 'utf-8'), fileName: `MOM_${mom.id}.txt`, contentType: 'text/plain' };
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: mom.title, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `${dateLine}` }),
            new Paragraph({ text: `${typeLine}` }),
            new Paragraph({ text: `${projectLine}` }),
            new Paragraph({ text: `${sprintLine}` }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'Agenda', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: mom.agenda || '' }),
            new Paragraph({ text: 'Discussion Summary', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: mom.discussionSummary || '' }),
            new Paragraph({ text: 'Decisions', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: mom.decisions || '' }),
            new Paragraph({ text: 'Action Items', heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: mom.actionItems || '' }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    return {
      buffer,
      fileName: `MOM_${mom.id}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }
}
