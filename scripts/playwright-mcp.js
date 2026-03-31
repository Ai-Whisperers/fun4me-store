#!/usr/bin/env node
/**
 * Cross-platform Playwright MCP launcher
 * Detects OS and runs the appropriate command
 */
const { spawn } = require('child_process');
const os = require('os');

const platform = os.platform();

let command, args;

if (platform === 'win32') {
  // Windows: use cmd /c npx
  command = 'cmd';
  args = ['/c', 'npx', '-y', '@playwright/mcp@latest'];
} else {
  // Linux/macOS: use npx directly
  command = 'npx';
  args = ['-y', '@playwright/mcp@latest'];
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.error('Failed to start Playwright MCP:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});
