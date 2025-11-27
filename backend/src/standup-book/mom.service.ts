import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Mom } from '../entities/mom.entity';
import { Sprint } from '../entities/sprint.entity';
import { User } from '../entities/user.entity';
import { CreateMomDto } from './dto/create-mom.dto';
import { UpdateMomDto } from './dto/update-mom.dto';
import { GenerateMomDto } from './dto/generate-mom.dto';
import { DailyLock } from '../entities/daily-lock.entity';

@Injectable()
export class MomService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    @InjectRepository(Mom)
    private momRepository: Repository<Mom>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(DailyLock)
    private dailyLockRepository: Repository<DailyLock>,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  /**
   * SB-UC10: Create MOM for Selected Sprint Day
   */
  async create(createMomDto: CreateMomDto, userId: string): Promise<Mom> {
    const { sprintId, date, rawInput, agenda, keyDiscussionPoints, decisionsTaken, actionItems } = createMomDto;

    // Find sprint
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
    }

    // Validate date is within sprint range
    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);

    if (targetDate < sprintStart || targetDate > sprintEnd) {
      throw new BadRequestException('MOM date must be within sprint date range');
    }

    // Check if day is locked (day-level lock check)
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });

    if (dayLock && dayLock.isLocked) {
      throw new ForbiddenException('Cannot create MOM for a locked day');
    }

    // Check if MOM already exists for this day
    const existingMom = await this.momRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate },
    });

    if (existingMom) {
      throw new BadRequestException('MOM already exists for this day. Use update instead.');
    }

    // Create MOM
    const mom = this.momRepository.create({
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

    return this.momRepository.save(mom);
  }

  /**
   * SB-UC11: Edit MOM for Selected Sprint Day
   */
  async update(momId: string, updateMomDto: UpdateMomDto, userId: string): Promise<Mom> {
    const mom = await this.momRepository.findOne({
      where: { id: momId },
      relations: ['sprint'],
    });

    if (!mom) {
      throw new NotFoundException(`MOM with ID ${momId} not found`);
    }

    // Check if day is locked (day-level lock check)
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: mom.sprint.id }, date: mom.date, slotNumber: IsNull() },
    });

    if (dayLock && dayLock.isLocked) {
      throw new ForbiddenException('Cannot edit MOM for a locked day');
    }

    // Update fields
    if (updateMomDto.rawInput !== undefined) mom.rawInput = updateMomDto.rawInput;
    if (updateMomDto.agenda !== undefined) mom.agenda = updateMomDto.agenda;
    if (updateMomDto.keyDiscussionPoints !== undefined) mom.keyDiscussionPoints = updateMomDto.keyDiscussionPoints;
    if (updateMomDto.decisionsTaken !== undefined) mom.decisionsTaken = updateMomDto.decisionsTaken;
    if (updateMomDto.actionItems !== undefined) mom.actionItems = updateMomDto.actionItems;

    mom.updatedBy = { id: userId } as User;

    return this.momRepository.save(mom);
  }

  /**
   * Find MOM by ID
   */
  async findById(momId: string): Promise<Mom | null> {
    return this.momRepository.findOne({
      where: { id: momId },
      relations: ['sprint', 'createdBy', 'updatedBy'],
    });
  }

  /**
   * Find MOM for a specific sprint day
   */
  async findBySprintAndDate(sprintId: string, date: string): Promise<Mom | null> {
    const targetDate = new Date(date);

    return this.momRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate },
      relations: ['sprint', 'createdBy', 'updatedBy'],
    });
  }

  /**
   * Find all MOMs for a sprint
   */
  async findAllBySprint(sprintId: string): Promise<Mom[]> {
    return this.momRepository.find({
      where: { sprint: { id: sprintId } },
      relations: ['sprint', 'createdBy', 'updatedBy'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Delete MOM (only if day not locked)
   */
  async remove(momId: string): Promise<void> {
    const mom = await this.momRepository.findOne({
      where: { id: momId },
      relations: ['sprint'],
    });

    if (!mom) {
      throw new NotFoundException(`MOM with ID ${momId} not found`);
    }

    // Check if day is locked (day-level lock check)
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: mom.sprint.id }, date: mom.date, slotNumber: IsNull() },
    });

    if (dayLock && dayLock.isLocked) {
      throw new ForbiddenException('Cannot delete MOM for a locked day');
    }

    await this.momRepository.remove(mom);
  }

  /**
   * Generate MOM using AI with Groq
   */
  async generateMomWithAI(generateMomDto: GenerateMomDto): Promise<{
    agenda: string;
    keyDiscussionPoints: string;
    decisionsTaken: string;
    actionItems: string;
  }> {
    const { rawInput } = generateMomDto;

    const prompt = `You are a meeting minutes assistant. Your job is to READ, ANALYZE, and CATEGORIZE meeting notes into structured fields.

MEETING NOTES:
${rawInput}

INSTRUCTIONS - READ CAREFULLY:

1. ANALYZE the text thoroughly and identify different types of content:
   - What topics were discussed? → agenda
   - What insights, opinions, concerns were shared? → keyDiscussionPoints
   - What was decided or concluded? → decisionsTaken
   - What tasks were assigned? → actionItems

2. CATEGORIZE each sentence/point into the correct field:

   "agenda" = The meeting topics, subjects, and areas that were discussed
   - Meeting purpose or topics
   - Areas covered in the discussion
   - What the meeting was about
   - Example: "Sprint planning, API development strategy, database selection"

   "keyDiscussionPoints" = The actual discussion, insights, concerns, opinions, and information shared
   - What people talked about
   - Insights or concerns raised
   - Options considered
   - Pros and cons discussed
   - Questions raised
   - Example: "Team discussed prioritizing backend work. Performance concerns were raised about the current database. Security requirements need to be considered."

   "decisionsTaken" = Specific decisions, conclusions, or agreements that were FINALIZED
   - Clear decisions that were made
   - Agreements reached
   - Conclusions drawn
   - What was approved or rejected
   - Example: "Decided to use PostgreSQL for database. Approved backend-first approach. Design review scheduled for next Monday."

   "actionItems" = Specific tasks, follow-ups, or work items assigned to people
   - Who needs to do what
   - Deliverables with owners
   - Follow-up tasks
   - Format: "Person/Team: Task description"
   - Example: "John: Implement authentication\nSarah: Design database schema\nTeam: Complete design review by Monday"

3. EXTRACT and REPHRASE content professionally
   - Read each sentence and categorize it
   - Multiple sentences can go to the same field
   - Some content may fit multiple categories (use your judgment for the best fit)
   - Use bullet points or line breaks for clarity
   - If a field truly has no content, write "None" or "No specific [field] mentioned"

EXAMPLES:

Input: "We discussed the sprint planning and decided to focus on backend APIs first. There were concerns about frontend dependencies. John will handle authentication, Sarah will work on database schema. We agreed to use PostgreSQL. Need to review the design by next Monday."
Output: {"agenda":"Sprint planning, backend API development priorities, database technology selection","keyDiscussionPoints":"Team discussed prioritizing backend APIs. Concerns raised about frontend dependencies and coordination. Evaluated database options for the project.","decisionsTaken":"Backend APIs will be developed first. PostgreSQL selected as database. Design review scheduled for next Monday.","actionItems":"John: Implement authentication module\\nSarah: Design and implement database schema\\nTeam: Complete design review by next Monday"}

Input: "Meeting about the new feature. We talked about user authentication flow and how to handle sessions. Some team members suggested JWT while others preferred session cookies. We need to do more research. No final decision yet. Bob will research JWT options and Alice will look into session management."
Output: {"agenda":"New feature planning - user authentication implementation","keyDiscussionPoints":"Discussed authentication flow and session handling approaches. JWT tokens and session cookies were both proposed. Team expressed need for more research before deciding. Trade-offs between both approaches were considered.","decisionsTaken":"No final decision on authentication method. Further research required before choosing approach.","actionItems":"Bob: Research JWT token options and present findings\\nAlice: Investigate session cookie management and security implications"}

Input: "Quick standup. Everyone on track. No blockers. John finished login page. Sarah working on API. Mike will start testing tomorrow."
Output: {"agenda":"Daily standup status update","keyDiscussionPoints":"Team progress review. All members reporting on-track status. No impediments or blockers reported.","decisionsTaken":"None","actionItems":"Sarah: Continue API development\\nMike: Begin testing phase tomorrow"}

Input: "Client escalation meeting. Database performance is critical issue. Client wants 50% improvement in 2 weeks. We discussed optimization strategies - indexing, caching, query optimization. Team committed to the timeline. Emergency sprint starting Monday. Everyone will focus on performance. David leads the effort."
Output: {"agenda":"Client escalation - database performance critical issue","keyDiscussionPoints":"Database performance identified as critical issue requiring immediate attention. Client demanding 50% improvement within 2-week deadline. Team discussed multiple optimization approaches including indexing, caching, and query optimization. Urgency emphasized.","decisionsTaken":"Team committed to 2-week deadline for 50% performance improvement. Emergency sprint will start Monday. All team members will focus on performance work. David assigned as technical lead for the effort.","actionItems":"David: Lead database performance optimization effort\\nTeam: Focus all development on performance improvements\\nTeam: Begin emergency sprint on Monday"}

CRITICAL RULES:
- Separate content into the RIGHT fields - don't put everything in one field
- "Discussion" goes to keyDiscussionPoints, "Decision" goes to decisionsTaken
- Action items MUST have an owner/person assigned (format: "Person: Task")
- Be thorough but concise
- Use \\n (escaped newline) to separate multiple items in action items, NOT actual line breaks
- Return ONLY valid JSON with no additional text or explanation

Return ONLY valid JSON (use \\n for line breaks):
{"agenda":"...","keyDiscussionPoints":"...","decisionsTaken":"...","actionItems":"Person A: Task 1\\nPerson B: Task 2"}`;

    try {
      console.log('[MomService.generateMomWithAI] Calling Groq API');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.groqModel,
          messages: [
            {
              role: 'system',
              content: 'You are a meeting minutes assistant. You analyze meeting notes, categorize content into specific fields, and return ONLY valid JSON with no additional text or explanation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      console.log('[MomService.generateMomWithAI] Raw response:', content);

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        console.warn('[MomService.generateMomWithAI] No JSON found, using fallback');
        return this.fallbackParse(rawInput);
      }

      // Clean up JSON string - handle multiline strings by properly parsing
      let jsonString = jsonMatch[0];
      let parsed;

      try {
        // First try: parse as-is (might work if properly formatted)
        parsed = JSON.parse(jsonString);
        console.log('[MomService.generateMomWithAI] Parsed successfully on first try');
      } catch (firstError) {
        // Second try: Fix common issues with unescaped control characters
        console.log('[MomService.generateMomWithAI] First parse failed, trying cleanup:', firstError.message);

        // Replace literal newlines/tabs/carriage returns with escaped versions
        jsonString = jsonString
          .replace(/\r\n/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, ' ');

        parsed = JSON.parse(jsonString);
        console.log('[MomService.generateMomWithAI] Parsed successfully after cleanup');
      }

      console.log('[MomService.generateMomWithAI] Parsed data:', parsed);

      return {
        agenda: parsed.agenda || 'No agenda specified',
        keyDiscussionPoints: parsed.keyDiscussionPoints || rawInput,
        decisionsTaken: parsed.decisionsTaken || 'No decisions recorded',
        actionItems: parsed.actionItems || 'No action items',
      };
    } catch (error: any) {
      console.error('[MomService.generateMomWithAI] Error:', error.message);
      if (error.response?.data) {
        console.error('[MomService.generateMomWithAI] Groq API error:', error.response.data);
      }
      // Fallback to manual parsing
      return this.fallbackParse(rawInput);
    }
  }

  /**
   * Fallback parsing when AI fails
   */
  private fallbackParse(rawInput: string): {
    agenda: string;
    keyDiscussionPoints: string;
    decisionsTaken: string;
    actionItems: string;
  } {
    console.warn('[MomService.fallbackParse] Using fallback parsing');

    return {
      agenda: 'Meeting discussion',
      keyDiscussionPoints: rawInput,
      decisionsTaken: 'To be reviewed',
      actionItems: 'To be determined',
    };
  }
}
