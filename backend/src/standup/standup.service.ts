import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'qwen2.5:7b';
    console.log(`✓ Using Ollama at ${this.ollamaUrl} with model ${this.ollamaModel}`);
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
      // Call Ollama API
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.response;

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
    } catch (error) {
      console.error('Error generating standup:', error);
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
