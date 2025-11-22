import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Snap, SnapRAG } from '../entities/snap.entity';
import { Card, CardStatus, CardRAG } from '../entities/card.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { DailySnapLock } from '../entities/daily-snap-lock.entity';
import { DailySummary } from '../entities/daily-summary.entity';
import { CardRAGHistory } from '../entities/card-rag-history.entity';
import { CreateSnapDto } from './dto/create-snap.dto';
import { UpdateSnapDto } from './dto/update-snap.dto';
import { LockDailySnapsDto } from './dto/lock-daily-snaps.dto';
import { OverrideRAGDto } from './dto/override-rag.dto';

export interface ParsedSnapData {
  done: string;
  toDo: string;
  blockers: string;
  suggestedRAG: SnapRAG;
}

@Injectable()
export class SnapService {
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(
    @InjectRepository(Snap)
    private snapRepository: Repository<Snap>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(DailySnapLock)
    private lockRepository: Repository<DailySnapLock>,
    @InjectRepository(DailySummary)
    private summaryRepository: Repository<DailySummary>,
    @InjectRepository(CardRAGHistory)
    private ragHistoryRepository: Repository<CardRAGHistory>,
    private configService: ConfigService,
  ) {
    // Use Ollama (free, open-source) instead of paid APIs
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'qwen2.5:7b';
  }

  /**
   * M8-UC01: Create Snap (Daily Update)
   * - SM creates a snap for a card in an Active sprint
   * - AI parses raw input to generate structured Done/ToDo/Blockers
   * - AI suggests RAG status
   * - SM can override AI output
   */
  async create(createSnapDto: CreateSnapDto, userId: string): Promise<Snap> {
    try {
      console.log('[SnapService.create] Starting snap creation:', { cardId: createSnapDto.cardId, userId });
      const { cardId, rawInput, done, toDo, blockers, suggestedRAG, finalRAG } = createSnapDto;

      // 1. Validate card exists and load with relations
      const card = await this.cardRepository.findOne({
        where: { id: cardId },
        relations: ['sprint', 'snaps'],
      });

      if (!card) {
        console.error('[SnapService.create] Card not found:', cardId);
        throw new NotFoundException('Card not found');
      }

      console.log('[SnapService.create] Card found:', { cardId: card.id, sprintId: card.sprint?.id });

    // 2. Business Validation: Card must have ET specified
    if (!card.estimatedTime || card.estimatedTime <= 0) {
      throw new BadRequestException('Card must have Estimated Time (ET) specified to create snap');
    }

    // 3. Validate sprint is Active and not Closed
    if (card.sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Cannot create snaps for cards in non-Active sprints');
    }

    if (card.sprint.isClosed) {
      throw new BadRequestException('Cannot create snaps after sprint closure');
    }

    // 5. Check if today's snap is already locked
    const today = new Date().toISOString().split('T')[0];
    const isLocked = await this.isDayLocked(card.sprint.id, today);
    if (isLocked) {
      throw new BadRequestException('Cannot create snaps after daily snap lock has been applied');
    }

    // 6. Validate snap date is within sprint range
    const snapDate = new Date(today);
    const sprintStart = new Date(card.sprint.startDate);
    const sprintEnd = new Date(card.sprint.endDate);

    if (snapDate < sprintStart || snapDate > sprintEnd) {
      throw new BadRequestException('Snap date must be within sprint date range');
    }

    // 7. AI Parsing (if done/toDo/blockers not provided manually)
    let parsedData: ParsedSnapData | null = null;
    if (!done && !toDo && !blockers && !suggestedRAG) {
      // Use AI to parse the raw input
      parsedData = await this.parseSnapWithAI(rawInput, card);
    }

    // 8. Create snap entity
    const snap = this.snapRepository.create({
      cardId,
      createdById: userId,
      rawInput,
      done: done || parsedData?.done || null,
      toDo: toDo || parsedData?.toDo || null,
      blockers: blockers || parsedData?.blockers || null,
      suggestedRAG: suggestedRAG || parsedData?.suggestedRAG || null,
      finalRAG: finalRAG || parsedData?.suggestedRAG || null, // Default to suggested if not overridden
      snapDate,
      isLocked: false,
    });

      // 9. Save snap
      console.log('[SnapService.create] Saving snap...');
      const savedSnap = await this.snapRepository.save(snap);
      console.log('[SnapService.create] Snap saved:', savedSnap.id);

      // 10. Auto-transition card to IN_PROGRESS on first snap (if NOT_STARTED)
      if (card.status === CardStatus.NOT_STARTED) {
        console.log('[SnapService.create] Transitioning card to IN_PROGRESS');
        await this.cardRepository.update(card.id, { status: CardStatus.IN_PROGRESS });
      }

      // 11. Update card RAG status based on snap
      console.log('[SnapService.create] Updating card RAG...');
      await this.updateCardRAG(cardId);

      // 12. Return snap with relations
      console.log('[SnapService.create] Fetching snap with relations...');
      const result = await this.snapRepository.findOne({
        where: { id: savedSnap.id },
        relations: ['card', 'createdBy'],
      });

      if (!result) {
        console.error('[SnapService.create] Failed to retrieve created snap:', savedSnap.id);
        throw new Error('Failed to retrieve created snap');
      }

      console.log('[SnapService.create] Snap creation successful');
      return result;
    } catch (error) {
      console.error('[SnapService.create] Error creating snap:', error);
      throw error;
    }
  }

  /**
   * Parse snap input with AI without saving
   * Returns the parsed data for user review
   */
  async parseOnly(cardId: string, rawInput: string): Promise<ParsedSnapData> {
    // 1. Find card
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ['sprint'],
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // 2. Parse with AI
    const parsedData = await this.parseSnapWithAI(rawInput, card);

    return parsedData;
  }

  /**
   * M8-UC02: Edit Snap
   * - Only today's snaps can be edited
   * - Only before daily lock
   * - Can regenerate AI parsing
   */
  async update(id: string, updateSnapDto: UpdateSnapDto, userId: string): Promise<Snap> {
    const { regenerate, ...updateData } = updateSnapDto;

    // 1. Find snap with relations
    const snap = await this.snapRepository.findOne({
      where: { id },
      relations: ['card', 'card.sprint'],
    });

    if (!snap) {
      throw new NotFoundException('Snap not found');
    }

    // 2. Validate ownership (only creator can edit, unless user has EDIT_ANY_SNAP permission)
    if (snap.createdById !== userId) {
      // Note: Permission check should be done in controller with PermissionsGuard
      // This is additional validation
      throw new ForbiddenException('You can only edit your own snaps');
    }

    // 3. Validate snap is from today
    const today = new Date().toISOString().split('T')[0];
    const snapDateStr = new Date(snap.snapDate).toISOString().split('T')[0];

    if (snapDateStr !== today) {
      throw new BadRequestException('Only today\'s snaps can be edited');
    }

    // 4. Validate snap is not locked
    if (snap.isLocked) {
      throw new BadRequestException('Cannot edit locked snaps');
    }

    // 5. Validate daily lock not applied
    const isLocked = await this.isDayLocked(snap.card.sprint.id, today);
    if (isLocked) {
      throw new BadRequestException('Cannot edit snaps after daily lock has been applied');
    }

    // 6. Validate sprint is Active
    if (snap.card.sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Cannot edit snaps for cards in non-Active sprints');
    }

    // 7. Handle regenerate flag - re-run AI parsing
    if (regenerate && updateData.rawInput) {
      const parsedData = await this.parseSnapWithAI(updateData.rawInput, snap.card);
      updateData.done = parsedData.done;
      updateData.toDo = parsedData.toDo;
      updateData.blockers = parsedData.blockers;
      updateData.suggestedRAG = parsedData.suggestedRAG;
      // Keep finalRAG as user's override, or use suggested if not set
      if (!updateData.finalRAG) {
        updateData.finalRAG = parsedData.suggestedRAG;
      }
    }

    // 8. Update snap
    Object.assign(snap, updateData);
    const updatedSnap = await this.snapRepository.save(snap);

    // 9. Recalculate card RAG
    await this.updateCardRAG(snap.cardId);

    // 10. Return updated snap with relations
    return this.snapRepository.findOne({
      where: { id: updatedSnap.id },
      relations: ['card', 'createdBy'],
    });
  }

  /**
   * M8-UC03: Delete Snap
   * - Only today's snaps can be deleted
   * - Only before daily lock
   */
  async remove(id: string, userId: string): Promise<void> {
    // 1. Find snap
    const snap = await this.snapRepository.findOne({
      where: { id },
      relations: ['card', 'card.sprint'],
    });

    if (!snap) {
      throw new NotFoundException('Snap not found');
    }

    // 2. Validate ownership
    if (snap.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own snaps');
    }

    // 3. Validate snap is from today
    const today = new Date().toISOString().split('T')[0];
    const snapDateStr = new Date(snap.snapDate).toISOString().split('T')[0];

    if (snapDateStr !== today) {
      throw new BadRequestException('Only today\'s snaps can be deleted');
    }

    // 4. Validate snap is not locked
    if (snap.isLocked) {
      throw new BadRequestException('Cannot delete locked snaps');
    }

    // 5. Validate daily lock not applied
    const isLocked = await this.isDayLocked(snap.card.sprint.id, today);
    if (isLocked) {
      throw new BadRequestException('Cannot delete snaps after daily lock has been applied');
    }

    // 6. Validate sprint is Active
    if (snap.card.sprint.status === SprintStatus.COMPLETED || snap.card.sprint.isClosed) {
      throw new BadRequestException('Cannot delete snaps for completed or closed sprints');
    }

    const cardId = snap.cardId;

    // 7. Delete snap
    await this.snapRepository.remove(snap);

    // 8. Recalculate card RAG after deletion
    await this.updateCardRAG(cardId);
  }

  /**
   * Get snap by ID
   */
  async findOne(id: string): Promise<Snap> {
    const snap = await this.snapRepository.findOne({
      where: { id },
      relations: ['card', 'createdBy'],
    });

    if (!snap) {
      throw new NotFoundException('Snap not found');
    }

    return snap;
  }

  /**
   * Get all snaps for a card (with yesterday and older context)
   * Used in M8-UC01 and M8-UC02 to show prior context
   */
  async findByCard(cardId: string): Promise<Snap[]> {
    const card = await this.cardRepository.findOne({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.snapRepository.find({
      where: { cardId },
      relations: ['createdBy'],
      order: { snapDate: 'DESC', createdAt: 'DESC' }, // Most recent first
    });
  }

  /**
   * Get all snaps for a sprint on a specific date
   * Used for daily snap view and summary generation
   */
  async findBySprintAndDate(sprintId: string, date: string): Promise<Snap[]> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    // Get all cards for this sprint
    const cards = await this.cardRepository.find({
      where: { sprint: { id: sprintId } },
    });

    const cardIds = cards.map((c) => c.id);

    if (cardIds.length === 0) {
      return [];
    }

    // Use query builder to avoid date comparison issues
    return this.snapRepository
      .createQueryBuilder('snap')
      .leftJoinAndSelect('snap.card', 'card')
      .leftJoinAndSelect('snap.createdBy', 'createdBy')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .where('snap.card_id IN (:...cardIds)', { cardIds })
      .andWhere('snap.snapDate = :date', { date })
      .orderBy('snap.createdAt', 'ASC')
      .getMany();
  }

  /**
   * M8-UC04: Lock Daily Snaps
   * - Locks all snaps for a specific date in a sprint
   * - Prevents further edits/deletes
   * - Triggers daily summary generation
   */
  async lockDailySnaps(dto: LockDailySnapsDto, userId: string): Promise<DailySnapLock> {
    const { sprintId, lockDate } = dto;

    // 1. Validate sprint
    const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    // 2. Validate sprint is Active (allow locking for Completed as well for historical data)
    if (sprint.isClosed) {
      throw new BadRequestException('Cannot lock snaps for closed sprints');
    }

    // 3. Check if already locked
    const existingLock = await this.lockRepository
      .createQueryBuilder('lock')
      .where('lock.sprintId = :sprintId', { sprintId })
      .andWhere('lock.lockDate = :lockDate', { lockDate })
      .getOne();

    if (existingLock) {
      throw new BadRequestException('Daily snaps for this date are already locked');
    }

    // 4. Get all snaps for this sprint and date
    const snaps = await this.findBySprintAndDate(sprintId, lockDate);

    // 5. Lock all snaps
    for (const snap of snaps) {
      snap.isLocked = true;
    }
    await this.snapRepository.save(snaps);

    // 6. Create lock record
    const lock = this.lockRepository.create({
      sprintId,
      lockDate: new Date(lockDate),
      lockedById: userId,
      isAutoLocked: false,
    });

    const savedLock = await this.lockRepository.save(lock);

    // 7. Generate daily summary
    await this.generateDailySummary(sprintId, lockDate);

    return savedLock;
  }

  /**
   * Auto-lock daily snaps (called by scheduler)
   */
  async autoLockDailySnaps(sprintId: string, lockDate: string): Promise<void> {
    // 1. Validate sprint
    const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
    if (!sprint || sprint.isClosed) {
      return; // Skip if sprint not found or closed
    }

    // 2. Check if already locked
    const existingLock = await this.lockRepository
      .createQueryBuilder('lock')
      .where('lock.sprintId = :sprintId', { sprintId })
      .andWhere('lock.lockDate = :lockDate', { lockDate })
      .getOne();

    if (existingLock) {
      return; // Already locked
    }

    // 3. Get all snaps for this date
    const snaps = await this.findBySprintAndDate(sprintId, lockDate);

    // 4. Lock all snaps
    for (const snap of snaps) {
      snap.isLocked = true;
    }
    await this.snapRepository.save(snaps);

    // 5. Create lock record (no user)
    const lock = this.lockRepository.create({
      sprintId,
      lockDate: new Date(lockDate),
      lockedById: null,
      isAutoLocked: true,
    });

    await this.lockRepository.save(lock);

    // 6. Generate daily summary
    await this.generateDailySummary(sprintId, lockDate);
  }

  /**
   * M8-UC05: Generate Daily Overall Standup Summary
   * - Aggregates all snaps for a date
   * - Groups by team member or card
   * - Calculates RAG overview
   */
  async generateDailySummary(sprintId: string, date: string): Promise<DailySummary> {
    // 1. Check if already generated
    const existing = await this.summaryRepository
      .createQueryBuilder('summary')
      .where('summary.sprintId = :sprintId', { sprintId })
      .andWhere('summary.summaryDate = :date', { date })
      .getOne();

    if (existing) {
      return existing; // Already generated
    }

    // 2. Get all snaps for this date
    const snaps = await this.findBySprintAndDate(sprintId, date);

    // 3. Aggregate content
    const doneItems: string[] = [];
    const toDoItems: string[] = [];
    const blockerItems: string[] = [];

    // 4. Group by assignee for structure
    const byAssignee = new Map<string, { name: string; snaps: Snap[] }>();

    for (const snap of snaps) {
      const assigneeName = snap.card.assignee
        ? snap.card.assignee.fullName
        : 'Unassigned';

      if (!byAssignee.has(assigneeName)) {
        byAssignee.set(assigneeName, { name: assigneeName, snaps: [] });
      }
      byAssignee.get(assigneeName).snaps.push(snap);

      // Aggregate content
      if (snap.done) {
        doneItems.push(`[${snap.card.title}] ${snap.done}`);
      }
      if (snap.toDo) {
        toDoItems.push(`[${snap.card.title}] ${snap.toDo}`);
      }
      if (snap.blockers) {
        blockerItems.push(`[${snap.card.title}] ${snap.blockers}`);
      }
    }

    // 5. Calculate RAG overview
    const cardRAG = { green: 0, amber: 0, red: 0 };
    const assigneeRAG = { green: 0, amber: 0, red: 0 };

    // Card-level RAG
    for (const snap of snaps) {
      if (snap.finalRAG === SnapRAG.GREEN) cardRAG.green++;
      else if (snap.finalRAG === SnapRAG.AMBER) cardRAG.amber++;
      else if (snap.finalRAG === SnapRAG.RED) cardRAG.red++;
    }

    // Assignee-level RAG (simplified: based on worst RAG for each assignee)
    for (const [_, data] of byAssignee) {
      let worstRAG = SnapRAG.GREEN;
      for (const snap of data.snaps) {
        if (snap.finalRAG === SnapRAG.RED) {
          worstRAG = SnapRAG.RED;
          break;
        } else if (snap.finalRAG === SnapRAG.AMBER) {
          worstRAG = SnapRAG.AMBER;
        }
      }

      if (worstRAG === SnapRAG.GREEN) assigneeRAG.green++;
      else if (worstRAG === SnapRAG.AMBER) assigneeRAG.amber++;
      else if (worstRAG === SnapRAG.RED) assigneeRAG.red++;
    }

    // Sprint-level RAG (based on which color outnumbers the other two combined)
    let sprintLevel = 'green';
    if (cardRAG.red > cardRAG.green + cardRAG.amber) {
      sprintLevel = 'red';
    } else if (cardRAG.amber > cardRAG.green + cardRAG.red) {
      sprintLevel = 'amber';
    } else if (cardRAG.green > cardRAG.amber + cardRAG.red) {
      sprintLevel = 'green';
    } else {
      // If no clear majority, default to the worst status present
      if (cardRAG.red > 0) sprintLevel = 'red';
      else if (cardRAG.amber > 0) sprintLevel = 'amber';
      else sprintLevel = 'green';
    }

    // 6. Create summary
    const summary = this.summaryRepository.create({
      sprintId,
      summaryDate: new Date(date),
      done: doneItems.join('\n'),
      toDo: toDoItems.join('\n'),
      blockers: blockerItems.join('\n'),
      ragOverview: {
        cardLevel: cardRAG,
        assigneeLevel: assigneeRAG,
        sprintLevel,
      },
      fullData: {
        byAssignee: Array.from(byAssignee.entries()).map(([name, data]) => ({
          assignee: name,
          snaps: data.snaps.map((s) => ({
            cardTitle: s.card.title,
            done: s.done,
            toDo: s.toDo,
            blockers: s.blockers,
            rag: s.finalRAG,
          })),
        })),
      },
    });

    return this.summaryRepository.save(summary);
  }

  /**
   * Get daily summary for a sprint and date
   */
  async getDailySummary(sprintId: string, date: string): Promise<DailySummary> {
    const summary = await this.summaryRepository
      .createQueryBuilder('summary')
      .leftJoinAndSelect('summary.sprint', 'sprint')
      .where('summary.sprintId = :sprintId', { sprintId })
      .andWhere('summary.summaryDate = :date', { date })
      .getOne();

    if (!summary) {
      throw new NotFoundException('Daily summary not found for this date');
    }

    return summary;
  }

  /**
   * Get all summaries for a project with optional filters
   */
  async getSummariesByProject(
    projectId: string,
    sprintId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DailySummary[]> {
    const query = this.summaryRepository
      .createQueryBuilder('summary')
      .leftJoinAndSelect('summary.sprint', 'sprint')
      .where('sprint.project_id = :projectId', { projectId });

    if (sprintId) {
      query.andWhere('summary.sprintId = :sprintId', { sprintId });
    }

    if (startDate) {
      query.andWhere('summary.summaryDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('summary.summaryDate <= :endDate', { endDate });
    }

    return query
      .orderBy('summary.summaryDate', 'DESC')
      .getMany();
  }

  /**
   * Check if a specific date is locked for a sprint
   */
  async isDayLocked(sprintId: string, date: string): Promise<boolean> {
    const lock = await this.lockRepository
      .createQueryBuilder('lock')
      .where('lock.sprintId = :sprintId', { sprintId })
      .andWhere('lock.lockDate = :date', { date })
      .getOne();

    return !!lock;
  }

  /**
   * AI Parsing Helper - Parse raw input with Ollama (free, open-source)
   */
  private async parseSnapWithAI(rawInput: string, card: Card): Promise<ParsedSnapData> {
    try {
      const prompt = `Parse this standup update into JSON format.

Card: ${card.title}
Update: ${rawInput}

Return ONLY this JSON structure:
{"done":"completed work","toDo":"next tasks","blockers":"issues or empty string","suggestedRAG":"green or amber or red"}

Rules:
- done: What was finished/completed
- toDo: What will be done next
- blockers: Problems or "" if none
- suggestedRAG: green=on track, amber=minor issues, red=major problems`;

      console.log('[SnapService.parseSnapWithAI] Calling Ollama at:', this.ollamaUrl);

      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 500,
          },
        },
        {
          timeout: 60000,
        }
      );

      const content = response.data?.response || '';
      console.log('[SnapService.parseSnapWithAI] Raw response:', content);

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        console.warn('[SnapService.parseSnapWithAI] No JSON found, attempting manual parse');
        // Try to extract content manually
        return this.manualParse(rawInput);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[SnapService.parseSnapWithAI] Parsed:', parsed);

      // Validate and map RAG status
      let rag = SnapRAG.AMBER;
      if (parsed.suggestedRAG) {
        const ragLower = parsed.suggestedRAG.toLowerCase();
        if (ragLower === 'green') rag = SnapRAG.GREEN;
        else if (ragLower === 'red') rag = SnapRAG.RED;
        else rag = SnapRAG.AMBER;
      }

      return {
        done: parsed.done || '',
        toDo: parsed.toDo || parsed.todo || '',
        blockers: parsed.blockers || '',
        suggestedRAG: rag,
      };
    } catch (error: any) {
      console.error('[SnapService.parseSnapWithAI] Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('[SnapService.parseSnapWithAI] Cannot connect to Ollama at', this.ollamaUrl);
      }
      // Fallback to manual parsing
      return this.manualParse(rawInput);
    }
  }

  /**
   * Manual parsing fallback when AI fails
   */
  private manualParse(rawInput: string): ParsedSnapData {
    const lower = rawInput.toLowerCase();

    // Simple keyword-based parsing
    let done = '';
    let toDo = '';
    let blockers = '';

    // Look for common patterns
    if (lower.includes('completed') || lower.includes('finished') || lower.includes('done')) {
      done = rawInput;
    }
    if (lower.includes('working on') || lower.includes('next') || lower.includes('will') || lower.includes('tomorrow')) {
      toDo = rawInput;
    }
    if (lower.includes('blocked') || lower.includes('waiting') || lower.includes('issue') || lower.includes('problem')) {
      blockers = rawInput;
    }

    // If no patterns matched, put in done
    if (!done && !toDo && !blockers) {
      done = rawInput;
    }

    // Determine RAG based on keywords
    let rag = SnapRAG.GREEN;
    if (lower.includes('blocked') || lower.includes('critical') || lower.includes('stuck')) {
      rag = SnapRAG.RED;
    } else if (lower.includes('issue') || lower.includes('delay') || lower.includes('waiting')) {
      rag = SnapRAG.AMBER;
    }

    return { done, toDo, blockers, suggestedRAG: rag };
  }

  /**
   * Update Card RAG based on snaps
   * Logic: Analyze snap frequency, content, and RAG trend
   */
  private async updateCardRAG(cardId: string): Promise<void> {
    // Get snaps separately to avoid cascade issues
    const snaps = await this.snapRepository.find({
      where: { cardId },
      order: { snapDate: 'DESC', createdAt: 'DESC' },
    });

    if (snaps.length === 0) {
      return; // No snaps yet
    }

    // Get recent snaps (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSnaps = snaps.filter(
      (s) => new Date(s.snapDate) >= sevenDaysAgo,
    );

    let newRAG: CardRAG;

    if (recentSnaps.length === 0) {
      newRAG = CardRAG.RED; // No recent updates
    } else {
      // Calculate RAG based on latest snap's finalRAG
      const latestSnap = recentSnaps[0];

      // Map SnapRAG to CardRAG
      if (latestSnap.finalRAG === SnapRAG.GREEN) {
        newRAG = CardRAG.GREEN;
      } else if (latestSnap.finalRAG === SnapRAG.AMBER) {
        newRAG = CardRAG.AMBER;
      } else if (latestSnap.finalRAG === SnapRAG.RED) {
        newRAG = CardRAG.RED;
      } else {
        newRAG = CardRAG.AMBER; // Default
      }
    }

    // Update only the RAG status field to avoid cascade issues
    await this.cardRepository.update(cardId, { ragStatus: newRAG });
  }

  /**
   * M9-UC01: System Computes RAG Suggestion
   * Advanced RAG calculation based on timeline, blockers, and progress
   */
  private async calculateSystemRAG(card: Card, snap: Snap): Promise<SnapRAG> {
    // 1. Check if card has Done content
    const hasDone = snap.done && snap.done.trim().length > 0;
    const hasBlockers = snap.blockers && snap.blockers.trim().length > 0;

    // 2. Calculate timeline deviation
    const timelineDeviation = await this.calculateTimelineDeviation(card);

    // 3. Check for consecutive days without Done
    const consecutiveDaysWithoutDone = await this.getConsecutiveDaysWithoutDone(card.id);

    // 4. Apply RAG logic
    // RED conditions:
    if (consecutiveDaysWithoutDone >= 2) {
      return SnapRAG.RED; // No Done for 2+ days
    }
    if (timelineDeviation > 30) {
      return SnapRAG.RED; // Major delay (>30%)
    }
    if (hasBlockers && this.isSevereBlocker(snap.blockers)) {
      return SnapRAG.RED; // Severe blockers
    }

    // AMBER conditions:
    if (timelineDeviation > 0 && timelineDeviation <= 30) {
      return SnapRAG.AMBER; // Minor delay (<30%)
    }
    if (hasBlockers) {
      return SnapRAG.AMBER; // Any blockers present
    }
    if (!hasDone) {
      return SnapRAG.AMBER; // No progress today
    }

    // GREEN: On track
    return SnapRAG.GREEN;
  }

  /**
   * Calculate timeline deviation as percentage
   * Based on ET and days elapsed since card start
   */
  private async calculateTimelineDeviation(card: Card): Promise<number> {
    if (!card.estimatedTime || card.estimatedTime <= 0) {
      return 0;
    }

    // Get card start date (first snap date or created date)
    const snaps = await this.snapRepository.find({
      where: { cardId: card.id },
      order: { snapDate: 'ASC' },
    });

    const startDate = snaps.length > 0
      ? new Date(snaps[0].snapDate)
      : new Date(card.createdAt);

    const today = new Date();
    const daysElapsed = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Assume 8-hour work day
    const expectedHours = (daysElapsed + 1) * 8;
    const estimatedHours = card.estimatedTime;

    // Calculate deviation percentage
    const deviation = ((expectedHours - estimatedHours) / estimatedHours) * 100;

    return Math.max(0, deviation);
  }

  /**
   * Get number of consecutive days without Done
   */
  private async getConsecutiveDaysWithoutDone(cardId: string): Promise<number> {
    const recentSnaps = await this.snapRepository.find({
      where: { cardId },
      order: { snapDate: 'DESC' },
      take: 7, // Check last 7 days
    });

    let count = 0;
    for (const snap of recentSnaps) {
      if (!snap.done || snap.done.trim().length === 0) {
        count++;
      } else {
        break; // Stop at first snap with Done
      }
    }

    return count;
  }

  /**
   * Determine if blockers are severe
   */
  private isSevereBlocker(blockers: string): boolean {
    if (!blockers) return false;

    const severeKeywords = [
      'blocked',
      'critical',
      'urgent',
      'severe',
      'major',
      'cannot proceed',
      'showstopper',
      'production down',
      'client escalation',
    ];

    const blockersLower = blockers.toLowerCase();
    return severeKeywords.some(keyword => blockersLower.includes(keyword));
  }

  /**
   * M9-UC02: SM Overrides RAG
   */
  async overrideRAG(snapId: string, dto: OverrideRAGDto, userId: string): Promise<Snap> {
    // 1. Find snap
    const snap = await this.snapRepository.findOne({
      where: { id: snapId },
      relations: ['card', 'card.sprint'],
    });

    if (!snap) {
      throw new NotFoundException('Snap not found');
    }

    // 2. Validate snap is from today
    const today = new Date().toISOString().split('T')[0];
    const snapDate = new Date(snap.snapDate).toISOString().split('T')[0];

    if (snapDate !== today) {
      throw new BadRequestException('Can only override RAG for today\'s snaps');
    }

    // 3. Validate daily lock not applied
    const isLocked = await this.isDayLocked(snap.card.sprint.id, today);
    if (isLocked || snap.isLocked) {
      throw new BadRequestException('Cannot override RAG after daily lock');
    }

    // 4. Update snap with override
    snap.finalRAG = dto.ragStatus;

    const updatedSnap = await this.snapRepository.save(snap);

    // 5. Update card RAG
    await this.updateCardRAG(snap.cardId);

    // 6. Log override in history (for audit)
    // Note: This will be permanently saved when daily lock occurs

    return updatedSnap;
  }

  /**
   * M9-UC07: RAG History Tracking
   * Save RAG to history when daily lock occurs
   */
  async saveRAGHistory(cardId: string, date: string, overriddenById?: string): Promise<void> {
    // Get card with latest snap for this date
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ['snaps'],
    });

    if (!card || !card.ragStatus) {
      return; // No RAG to save
    }

    // Check if snap exists for this date
    const snap = await this.snapRepository.findOne({
      where: {
        cardId,
        snapDate: new Date(date),
      },
    });

    const isOverridden = snap?.suggestedRAG !== snap?.finalRAG;

    // Check if history already exists
    const existing = await this.ragHistoryRepository.findOne({
      where: {
        cardId,
        date: new Date(date),
      },
    });

    if (existing) {
      // Update existing
      existing.ragStatus = card.ragStatus;
      existing.isOverridden = isOverridden;
      if (overriddenById) {
        existing.overriddenById = overriddenById;
      }
      await this.ragHistoryRepository.save(existing);
    } else {
      // Create new
      const history = this.ragHistoryRepository.create({
        cardId,
        date: new Date(date),
        ragStatus: card.ragStatus,
        isOverridden,
        overriddenById,
      });
      await this.ragHistoryRepository.save(history);
    }
  }

  /**
   * Get RAG history for a card
   */
  async getRAGHistory(cardId: string): Promise<CardRAGHistory[]> {
    return this.ragHistoryRepository.find({
      where: { cardId },
      order: { date: 'DESC' },
      relations: ['overriddenBy'],
    });
  }

  /**
   * M9-UC05: Sprint-Level RAG Aggregation
   * Applies worst-case logic (Red > Amber > Green)
   */
  async getSprintRAG(sprintId: string): Promise<{
    ragStatus: CardRAG;
    breakdown: { green: number; amber: number; red: number };
  }> {
    // Get all cards in sprint
    const cards = await this.cardRepository.find({
      where: { sprint: { id: sprintId } },
    });

    const breakdown = { green: 0, amber: 0, red: 0 };

    for (const card of cards) {
      if (card.ragStatus === CardRAG.GREEN) breakdown.green++;
      else if (card.ragStatus === CardRAG.AMBER) breakdown.amber++;
      else if (card.ragStatus === CardRAG.RED) breakdown.red++;
    }

    // Worst-case logic
    let ragStatus: CardRAG;
    if (breakdown.red > 0) {
      ragStatus = CardRAG.RED;
    } else if (breakdown.amber > 0) {
      ragStatus = CardRAG.AMBER;
    } else {
      ragStatus = CardRAG.GREEN;
    }

    return { ragStatus, breakdown };
  }

  /**
   * M9-UC06: Project-Level RAG Aggregation
   * Aggregates across all sprints in a project
   */
  async getProjectRAG(projectId: string): Promise<{
    ragStatus: CardRAG;
    breakdown: { green: number; amber: number; red: number };
    sprintBreakdown: Array<{
      sprintId: string;
      sprintName: string;
      ragStatus: CardRAG;
    }>;
  }> {
    // Get all sprints in project
    const sprints = await this.sprintRepository.find({
      where: { project: { id: projectId } },
    });

    const breakdown = { green: 0, amber: 0, red: 0 };
    const sprintBreakdown = [];

    for (const sprint of sprints) {
      const sprintRAG = await this.getSprintRAG(sprint.id);

      sprintBreakdown.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        ragStatus: sprintRAG.ragStatus,
      });

      // Aggregate
      if (sprintRAG.ragStatus === CardRAG.GREEN) breakdown.green++;
      else if (sprintRAG.ragStatus === CardRAG.AMBER) breakdown.amber++;
      else if (sprintRAG.ragStatus === CardRAG.RED) breakdown.red++;
    }

    // Worst-case logic
    let ragStatus: CardRAG;
    if (breakdown.red > 0) {
      ragStatus = CardRAG.RED;
    } else if (breakdown.amber > 0) {
      ragStatus = CardRAG.AMBER;
    } else {
      ragStatus = CardRAG.GREEN;
    }

    return { ragStatus, breakdown, sprintBreakdown };
  }
}
