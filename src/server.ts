import express from 'express';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import https from 'https';
import selfsigned from 'selfsigned';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3000;

// Generate SSL certificate in-memory
function getSSLCredentials() {
  console.log('Generating self-signed SSL certificate in-memory...');
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { 
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 2, value: '*.localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '0.0.0.0' }
      ]
    }]
  });
  
  console.log('SSL certificate generated in-memory.');
  
  return { key: pems.private, cert: pems.cert };
}

// Parse command line arguments for llama.cpp endpoints
const args = process.argv.slice(2);
const LLAMA_ENDPOINTS = [];

// Default endpoint if none provided
if (args.length === 0) {
  LLAMA_ENDPOINTS.push('http://127.0.0.1:9090');
} else {
  // Parse endpoints from command line arguments
  for (const arg of args) {
    if (arg.startsWith('http://') || arg.startsWith('https://')) {
      LLAMA_ENDPOINTS.push(arg);
    }
  }
  
  // If no valid endpoints found, use default
  if (LLAMA_ENDPOINTS.length === 0) {
    LLAMA_ENDPOINTS.push('http://127.0.0.1:9090');
  }
}

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Endpoint to get available llama.cpp endpoints
app.get('/api/endpoints', (req, res) => {
  res.json({ endpoints: LLAMA_ENDPOINTS });
});

app.post('/api/stream', async (req, res) => {
  const { messages, endpoint } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Validate and use provided endpoint or default to first one
  const llamaServerUrl = endpoint && LLAMA_ENDPOINTS.includes(endpoint) 
    ? endpoint 
    : LLAMA_ENDPOINTS[0];
  
  console.log(`Using llama.cpp endpoint: ${llamaServerUrl}`);

  // Preprocess messages to ensure alternating user/assistant pattern
  function preprocessMessages(messages) {
    const processedMessages = [];
    let systemMessage = null;
    
    // Extract system message if it exists
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg;
        break;
      }
    }
    
    // Add system message first if it exists
    if (systemMessage) {
      processedMessages.push(systemMessage);
    }
    
    // Process remaining messages, ensuring alternating pattern
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    let lastRole = null;
    
    for (const msg of nonSystemMessages) {
      if (msg.role === 'user') {
        // If last message was also user, insert empty assistant message
        if (lastRole === 'user') {
          processedMessages.push({ role: 'assistant', content: '' });
        }
        processedMessages.push(msg);
        lastRole = 'user';
      } else if (msg.role === 'assistant') {
        // If last message was also assistant, insert empty user message
        if (lastRole === 'assistant') {
          processedMessages.push({ role: 'user', content: '' });
        }
        processedMessages.push(msg);
        lastRole = 'assistant';
      }
    }
    
    return processedMessages;
  }
  
  const processedMessages = preprocessMessages(messages);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Create AbortController to cancel llama.cpp request if client disconnects
  const abortController = new AbortController();
  let llamaResponse = null;
  
  // Listen for client disconnect
  res.on('close', () => {
    console.log('Client disconnected, aborting llama.cpp request');
    abortController.abort();
    if (llamaResponse && llamaResponse.body) {
      llamaResponse.body.destroy();
    }
  });

  try {
    const requestPayload = {
      messages: processedMessages,
      stream: true,
    };
    
    console.log('Starting llama.cpp request...');
    
    llamaResponse = await fetch(`${llamaServerUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: abortController.signal
    });

    if (!llamaResponse.ok) {
      throw new Error(`HTTP error! status: ${llamaResponse.status}`);
    }

    if (!llamaResponse.body) {
      throw new Error('No response body');
    }

    console.log('Llama.cpp connected, starting stream...');

    let buffer = '';
    
    llamaResponse.body.on('data', (chunk) => {
      if (res.destroyed || res.writableEnded) {
        return; // Client already disconnected
      }
      
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
              if (!res.destroyed && !res.writableEnded) {
                res.write('event: token\n');
                res.write(`data: ${JSON.stringify({ content: data.choices[0].delta.content })}\n\n`);
              }
            }
            if (data.choices && data.choices[0] && data.choices[0].finish_reason) {
              if (!res.destroyed && !res.writableEnded) {
                res.write('event: end\n');
                res.write('data: Stream completed\n\n');
                res.end();
              }
              return;
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }
    });

    llamaResponse.body.on('end', () => {
      console.log('Llama.cpp stream ended');
      if (!res.destroyed && !res.writableEnded) {
        res.write('event: end\n');
        res.write('data: Stream completed\n\n');
        res.end();
      }
    });

    llamaResponse.body.on('error', (error) => {
      // Silently handle all stream errors without logging
      if (!res.destroyed && !res.writableEnded) {
        if (!res.headersSent) {
          res.write('event: error\n');
          res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        }
        res.end();
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return; // Don't send error to already disconnected client
    }
    
    // Silently handle all streaming errors without logging
    if (!res.destroyed && !res.writableEnded) {
      if (!res.headersSent) {
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({ error: 'Failed to connect to LLM server' })}\n\n`);
      }
      res.end();
    }
  }
});

// Start HTTPS server on port 3000
function startServer() {
  try {
    // Get SSL credentials
    const sslCredentials = getSSLCredentials();
    
    // Create HTTPS server
    const httpsServer = https.createServer(sslCredentials, app);
    
    // Start HTTPS server
    httpsServer.listen(PORT, '0.0.0.0', () => {
      console.log(`HTTPS Server running on https://0.0.0.0:${PORT}`);
      console.log(`Available llama.cpp endpoints:`);
      LLAMA_ENDPOINTS.forEach((endpoint, index) => {
        console.log(`  ${index + 1}. ${endpoint}${index === 0 ? ' (default)' : ''}`);
      });
      console.log(`\nNote: You may need to accept the self-signed certificate in your browser.`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();