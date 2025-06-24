#!/usr/bin/env node

/**
 * Example Etherbase Client Configuration
 * 
 * This is an example of how to use the Etherbase client scripts.
 * 
 * To use:
 * 1. Copy simple-client.js.example to simple-client.js
 * 2. Set your private key via environment variable: export PRIVATE_KEY=0x...
 * 3. Run: node simple-client.js
 * 
 * SECURITY WARNING:
 * - Never commit your actual private key to git
 * - Always use environment variables for sensitive data
 * - The example scripts are excluded from git for security
 */

const WebSocket = require('ws');

// Configuration - use environment variables for sensitive data
const config = {
  wsWriterUrl: 'ws://127.0.0.1:8081/write',
  privateKey: process.env.PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE',
  sourceAddress: process.env.SOURCE_ADDRESS || '0x5e65E44e177cA1d239D873483D3dD475C0C6E80e'
};

// Validate configuration
if (!config.privateKey || config.privateKey === 'YOUR_PRIVATE_KEY_HERE') {
  console.error('❌ Error: Private key not set!');
  console.error('Set it via environment variable: export PRIVATE_KEY=0x...');
  process.exit(1);
}

class EtherbaseClient {
  constructor(config) {
    this.config = config;
    this.ws = null;
  }

  connect() {
    const wsUrl = `${this.config.wsWriterUrl}?privateKey=${this.config.privateKey}`;
    console.log('🔗 Connecting to etherbase writer service...');
    
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ Connected successfully');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', message);
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
  }

  emitEvent(eventName, eventArgs) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');
      return;
    }

    const message = {
      type: 'emit_event',
      data: {
        contractAddress: this.config.sourceAddress,
        name: eventName,
        args: eventArgs
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 Emitted event: ${eventName}`, eventArgs);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function main() {
  console.log('🚀 Etherbase Client Example');
  console.log('============================\n');
  
  const client = new EtherbaseClient(config);
  client.connect();

  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Emit a test event
  client.emitEvent('TestEvent', {
    test: 'Hello from example client!'
  });

  // Keep alive for a bit
  setTimeout(() => {
    client.disconnect();
  }, 5000);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EtherbaseClient;
