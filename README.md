# StandupSnap

A smart daily standup note generator that transforms your natural language work updates into structured standup formats.

## Features

- **Natural Language Input**: Type or paste your work updates in free-form text
- **Structured Output**: Automatically formatted into Yesterday/Today/Blockers sections
- **Slack Integration**: Generate professional Slack-ready messages
- **History Tracking**: Save and review past standups with local storage
- **Quick Copy**: One-click copy to clipboard

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Storage**: Browser LocalStorage
- **Deployment**: Vercel/Netlify ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/VJMallina/StandupSnap.git
cd StandupSnap

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your Anthropic API key to .env
# VITE_ANTHROPIC_API_KEY=your_api_key_here

# Start development server
npm run dev
```

### Usage

1. Enter your work updates in natural language
2. Click "Generate Standup" or press Ctrl/Cmd + Enter
3. Review the structured output
4. Copy to clipboard or generate Slack message
5. Your standups are automatically saved to history

## Example

**Input:**
```
Worked on the Partners Payout API, had issues with Docker setup,
tomorrow will finish the merchant transaction processing user stories
```

**Output:**
```
Yesterday:
- Developed Partners Payout API
- Troubleshot Docker environment setup issues

Today:
- Complete merchant transaction processing user stories

Blockers:
- None
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Roadmap

- [ ] Export standups to different formats (Markdown, JSON)
- [ ] Weekly summary generation
- [ ] Team collaboration features
- [ ] Integration with Slack/Teams webhooks
- [ ] Custom templates support
- [ ] Analytics and productivity insights

## License

MIT

## Author

Ravi Sandeep ([@VJMallina](https://github.com/VJMallina))
