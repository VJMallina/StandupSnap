import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GenerateStandupDto {
  rawInput: string;
}

export interface StandupResponse {
  yesterday: string;
  today: string;
  blockers: string;
  formattedOutput: string;
}

@Injectable()
export class StandupService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(private configService: ConfigService) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    console.log(`✓ Using Groq with model ${this.groqModel}`);
  }

  async generateStandup(dto: GenerateStandupDto): Promise<StandupResponse> {
    const { rawInput } = dto;

    const prompt = `You are a helpful assistant that converts free-form work updates into structured standup format.

Parse the following work update and extract:
1. Yesterday: What was completed
2. Today: What will be worked on
3. Blockers: Any issues or blockers (write "None" if there are no blockers)

Input:
${rawInput}

Respond in JSON format:
{
  "yesterday": "bullet points of completed work",
  "today": "bullet points of planned work",
  "blockers": "bullet points of blockers or 'None'"
}`;

    try {
      // Call Groq API
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.groqModel,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that converts free-form work updates into structured standup format. Return ONLY valid JSON with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const text = response.data?.choices?.[0]?.message?.content || '';

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Format the output
      const formattedOutput = this.formatStandup(
        parsed.yesterday,
        parsed.today,
        parsed.blockers,
      );

      return {
        yesterday: parsed.yesterday,
        today: parsed.today,
        blockers: parsed.blockers,
        formattedOutput,
      };
    } catch (error: any) {
      console.error('Error generating standup:', error.message);
      if (error.response?.data) {
        console.error('Groq API error:', error.response.data);
      }
      throw new Error(`Failed to generate standup: ${error.message}`);
    }
  }

  private formatStandup(
    yesterday: string,
    today: string,
    blockers: string,
  ): string {
    return `Yesterday:
${yesterday}

Today:
${today}

Blockers:
${blockers}`;
  }
}
