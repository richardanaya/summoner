# Summoner

A real-time streaming interface for llama.cpp server using HTMX SSE extensions and Node.js with TypeScript.

## Prerequisites

- Node.js (v18+)
- A running llama.cpp server (default: `http://127.0.0.1:9090`)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project (for production):
```bash
npm run build
```

3. Start the server:

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
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
npm start http://your-llama-server:9090
```

**Multiple endpoints:**
```bash
npm run dev http://server1:9090 http://server2:8080 https://server3:443
npm start http://127.0.0.1:9090 http://192.168.1.100:8080
```

**Custom port:**
```bash
PORT=8080 npm run dev
PORT=4000 npm start
```

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript 
- `npm start` - Start production server from built files

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

### Basic Usage

1. Make sure your llama.cpp server is running (default: `http://127.0.0.1:9090`)
2. Start the application:
   ```bash
   npm run dev
   ```
3. Navigate to `https://localhost:3000`
4. Accept the self-signed SSL certificate when prompted
5. Enter a prompt and click "Send Message"
6. Watch the AI response stream in real-time

### Advanced Usage

**Using custom llama.cpp endpoints:**
```bash
# Single custom endpoint
npm run dev http://192.168.1.100:8080

# Multiple endpoints (first one is default)
npm run dev http://127.0.0.1:9090 http://backup-server:8080
```

**Running on different port:**
```bash
PORT=8080 npm run dev
```

**Production deployment:**
```bash
npm run build
PORT=80 npm start http://your-llama-server:9090
```

The interface will automatically:
- Handle connection states and errors
- Manage multiple endpoint failover
- Stream responses in real-time
- Generate SSL certificates for HTTPS
