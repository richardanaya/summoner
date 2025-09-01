# Summoner

A real-time streaming interface for llama.cpp server using HTMX SSE extensions and Node.js with TypeScript.

## Prerequisites

- Node.js (v18+)
- A running llama.cpp server (default: `http://127.0.0.1:9090`)

## Setup

1. Install dependencies:
```bash
npm install
npm run dev
```

4. Open your browser to `https://localhost:3000`

## Configuration Options

### Environment Variables

- `PORT` - Server port (default: 3000)

### Command Line Arguments

You can specify custom llama.cpp endpoints as command line arguments:

**Single endpoint:**
```bash
npm run dev http://192.168.1.100:8080
```

**Multiple endpoints:**
```bash
npm run dev http://server1:9090 http://server2:8080 https://server3:443
```

**Custom port:**
```bash
PORT=8080 npm run dev
PORT=4000 npm start
```

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
