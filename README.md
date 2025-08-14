# HTMX AI Streamer

A real-time streaming interface for llama.cpp server using HTMX SSE extensions and Node.js with TypeScript.

## Prerequisites

- Node.js (v18+)
- A running llama.cpp server on `http://127.0.0.1:9090`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Features

- Real-time streaming of LLM responses
- Clean, responsive web interface
- Server-sent events (SSE) for efficient streaming
- TypeScript support
- Error handling and connection management

## Project Structure

```
├── src/
│   └── server.ts          # Express server with SSE endpoint
├── public/
│   └── index.html         # Frontend with HTMX SSE
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

- `GET /` - Serves the main interface
- `POST /api/stream` - SSE endpoint for streaming LLM responses

## Usage

1. Make sure your llama.cpp server is running on port 9090
2. Start this application with `npm run dev`
3. Navigate to `http://localhost:3000`
4. Enter a prompt and click "Send Message"
5. Watch the AI response stream in real-time

The interface will automatically handle connection states, errors, and completion events.