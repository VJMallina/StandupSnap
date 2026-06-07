import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } from 'docx';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class StandaloneMomService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    private tenantService: TenantService,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  private validateMeetingDate(meetingDate: string) {
    const date = new Date(meetingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) throw new BadRequestException('Meeting date cannot be in the future');
    return date;
  }

  private async resolveProjectAndSprint(
    projectId: string,
    sprintId?: string,
  ): Promise<{ project: Project; sprint: Sprint | null }> {
    const [projectRepo, sprintRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(Sprint),
    ]);

    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    let sprint: Sprint | null = null;
    if (sprintId) {
      sprint = await sprintRepo.findOne({ where: { id: sprintId }, relations: ['project'] });
      if (!sprint) throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
      if (sprint.project.id !== project.id) throw new BadRequestException('Sprint must belong to the selected project');
    }

    return { project, sprint };
  }

  private computeMeetingType(meetingType: StandaloneMeetingType, customMeetingType?: string) {
    if ((meetingType === StandaloneMeetingType.CUSTOM || meetingType === StandaloneMeetingType.OTHER) && customMeetingType) {
      return { meetingType, customMeetingType };
    }
    return { meetingType, customMeetingType: null };
  }

  async create(dto: CreateStandaloneMomDto, userId: string, orgId?: string): Promise<StandaloneMom> {
    const repo = await this.tenantService.getRepository(StandaloneMom);
    const meetingDate = this.validateMeetingDate(dto.meetingDate);
    const { project, sprint } = await this.resolveProjectAndSprint(dto.projectId, dto.sprintId);
    const { meetingType, customMeetingType } = this.computeMeetingType(dto.meetingType, dto.customMeetingType);

    const mom = repo.create({
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
      ...(orgId ? { organizationId: orgId } : {}),
    });

    return repo.save(mom);
  }

  async update(id: string, dto: UpdateStandaloneMomDto, userId: string): Promise<StandaloneMom> {
    const repo = await this.tenantService.getRepository(StandaloneMom);
    const mom = await repo.findOne({ where: { id, archived: false }, relations: ['project', 'sprint'] });
    if (!mom) throw new NotFoundException('MOM not found');

    if (dto.meetingDate) mom.meetingDate = this.validateMeetingDate(dto.meetingDate);

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
    return repo.save(mom);
  }

  async findOne(id: string, organizationId?: string): Promise<StandaloneMom> {
    const repo = await this.tenantService.getRepository(StandaloneMom);
    const mom = await repo.findOne({
      where: { id, archived: false, ...(organizationId ? { organizationId } : {}) },
      relations: ['project', 'sprint', 'createdBy', 'updatedBy'],
    });
    if (!mom) throw new NotFoundException('MOM not found');
    return mom;
  }

  async findAll(filter: FilterStandaloneMomDto, organizationId?: string) {
    if (filter.dateFrom && filter.dateTo && new Date(filter.dateTo) < new Date(filter.dateFrom)) {
      throw new BadRequestException('Invalid date range');
    }

    const repo = await this.tenantService.getRepository(StandaloneMom);
    const qb = repo
      .createQueryBuilder('mom')
      .leftJoinAndSelect('mom.project', 'project')
      .leftJoinAndSelect('mom.sprint', 'sprint')
      .leftJoinAndSelect('mom.createdBy', 'createdBy')
      .leftJoinAndSelect('mom.updatedBy', 'updatedBy')
      .where('mom.project = :projectId', { projectId: filter.projectId })
      .andWhere('mom.archived = false');

    if (organizationId) qb.andWhere('mom.organizationId = :organizationId', { organizationId });

    if (filter.sprintId) qb.andWhere('mom.sprint = :sprintId', { sprintId: filter.sprintId });
    if (filter.meetingType) qb.andWhere('mom.meetingType = :meetingType', { meetingType: filter.meetingType });
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
    const repo = await this.tenantService.getRepository(StandaloneMom);
    const mom = await this.findOne(id);
    mom.archived = true;
    mom.updatedBy = { id: userId } as User;
    return repo.save(mom);
  }

  async remove(id: string): Promise<void> {
    const repo = await this.tenantService.getRepository(StandaloneMom);
    const mom = await repo.findOne({ where: { id } });
    if (!mom) throw new NotFoundException('MOM not found');
    await repo.remove(mom);
  }

  async generateWithAI(dto: GenerateStandaloneMomDto) {
    const systemPrompt = `You are an expert meeting minutes assistant. Analyze the raw meeting notes and return a single valid JSON object with exactly these fields:

- agenda: string — topics/agenda items discussed (bullet points or paragraph)
- discussionSummary: string — key discussion points and context
- decisions: string — final decisions or conclusions reached
- actionItems: array — list of action item objects, each with:
    { "task": "what needs to be done", "owner": "person responsible (empty string if unknown)", "dueDate": "YYYY-MM-DD (empty string if not mentioned)" }

RULES:
1. actionItems MUST be a JSON array, never a string.
2. If no action items are found, return an empty array: [].
3. If a section has no content, use an empty string "".
4. Extract due dates into YYYY-MM-DD format when possible; otherwise use "".
5. Use clear, concise language.

Example of correct actionItems format:
[
  { "task": "Update the deployment pipeline", "owner": "Alice", "dueDate": "2024-06-15" },
  { "task": "Send meeting summary to stakeholders", "owner": "Bob", "dueDate": "" }
]

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
          headers: { Authorization: `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
          timeout: 30000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return this.fallbackParse(dto.text);
        parsed = JSON.parse(jsonMatch[0]);
      }

      const rawActions = parsed.actionItems ?? parsed.action_items ?? parsed.actions ?? [];
      let actionItems: string;
      if (Array.isArray(rawActions)) {
        const normalized = rawActions
          .map((i: any) => ({
            task: String(i.task || i.description || i.item || '').trim(),
            owner: String(i.owner || i.assignee || i.responsible || '').trim(),
            dueDate: String(i.dueDate || i.due_date || i.date || '').trim(),
          }))
          .filter((i) => i.task);
        actionItems = normalized.length ? JSON.stringify(normalized) : '';
      } else {
        // Model returned a string despite instructions — store as-is so the
        // frontend's line-split fallback can still render something useful
        actionItems = String(rawActions || '');
      }

      return {
        agenda: String(parsed.agenda || parsed.Agenda || ''),
        discussionSummary: String(parsed.discussionSummary || parsed.discussion_summary || parsed.discussion || parsed.summary || ''),
        decisions: String(parsed.decisions || parsed.Decisions || parsed.decisionsTaken || ''),
        actionItems,
      };
    } catch (error) {
      console.error('AI generation error:', error.response?.data || error.message);
      return this.fallbackParse(dto.text);
    }
  }

  private fallbackParse(text: string) {
    return { agenda: '', discussionSummary: text, decisions: '', actionItems: '' };
  }

  async extractTranscript(file: any): Promise<string> {
    if (!file) throw new BadRequestException('Enter notes or upload a transcript.');
    const mime = file.mimetype;
    if (mime === 'text/plain') return file.buffer.toString('utf-8');
    if (mime === 'application/pdf') {
      try {
        const result = await (pdfParse as any)(file.buffer);
        if (!result.text || !result.text.trim()) throw new Error('empty');
        return result.text;
      } catch {
        throw new BadRequestException('Could not extract content from file. Try uploading a different file.');
      }
    }
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/msword') {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        if (!result.value || !result.value.trim()) throw new Error('empty');
        return result.value;
      } catch {
        throw new BadRequestException('Could not extract content from file. Try uploading a different file.');
      }
    }
    throw new BadRequestException('Unsupported file format. Upload TXT, PDF, or DOCX.');
  }

  private parseActionItemsForExport(raw: string | null): Array<{ task: string; owner: string; dueDate: string }> {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((i: any) => ({
            task: String(i.task || ''),
            owner: String(i.owner || ''),
            dueDate: String(i.dueDate || ''),
          }))
          .filter((i) => i.task);
      }
    } catch {}
    // Plain-text fallback — one line per task
    return raw.split('\n').filter((l) => l.trim()).map((l) => ({ task: l.trim(), owner: '', dueDate: '' }));
  }

  async download(id: string, format: 'txt' | 'docx') {
    const mom = await this.findOne(id);
    const meetingDateString = mom.meetingDate instanceof Date
      ? mom.meetingDate.toISOString().slice(0, 10)
      : String(mom.meetingDate);

    const titleLine   = `Title: ${mom.title}`;
    const dateLine    = `Date: ${meetingDateString}`;
    const typeLine    = `Meeting Type: ${mom.customMeetingType || mom.meetingType}`;
    const projectLine = `Project: ${mom.project?.name || mom.project?.id}`;
    const sprintLine  = mom.sprint ? `Sprint: ${mom.sprint.name}` : 'Sprint: N/A';

    const actionItems = this.parseActionItemsForExport(mom.actionItems);

    if (format === 'txt') {
      const actionItemsTxt = actionItems.length
        ? [
            'Task                                          | Owner            | Due Date',
            '----------------------------------------------|------------------|----------',
            ...actionItems.map((i) =>
              `${i.task.padEnd(46)}| ${(i.owner || '—').padEnd(17)}| ${i.dueDate || '—'}`
            ),
          ].join('\n')
        : 'No action items';

      const textBody = [
        titleLine, dateLine, typeLine, projectLine, sprintLine,
        '', 'Agenda:', mom.agenda || '',
        '', 'Discussion Summary:', mom.discussionSummary || '',
        '', 'Decisions:', mom.decisions || '',
        '', 'Action Items:', actionItemsTxt,
      ].join('\n');

      return { buffer: Buffer.from(textBody, 'utf-8'), fileName: `MOM_${mom.id}.txt`, contentType: 'text/plain' };
    }

    // Build action items table for DOCX
    const headerCell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        width: { size: text === 'Task' ? 60 : 20, type: WidthType.PERCENTAGE },
      });

    const dataCell = (text: string) =>
      new TableCell({ children: [new Paragraph({ text })] });

    const actionItemsSection = actionItems.length
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [headerCell('Task'), headerCell('Owner'), headerCell('Due Date')],
            }),
            ...actionItems.map(
              (i) =>
                new TableRow({
                  children: [
                    dataCell(i.task),
                    dataCell(i.owner || '—'),
                    dataCell(i.dueDate || '—'),
                  ],
                }),
            ),
          ],
        })
      : new Paragraph({ text: 'No action items' });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: mom.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: dateLine }),
          new Paragraph({ text: typeLine }),
          new Paragraph({ text: projectLine }),
          new Paragraph({ text: sprintLine }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Agenda', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: mom.agenda || '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Discussion Summary', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: mom.discussionSummary || '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Decisions', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: mom.decisions || '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Action Items', heading: HeadingLevel.HEADING_2 }),
          actionItemsSection,
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return { buffer, fileName: `MOM_${mom.id}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
}
