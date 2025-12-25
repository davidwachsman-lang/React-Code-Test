#!/usr/bin/env node
/**
 * Frontend startup wrapper
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const vitePath = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(vitePath)) {
  console.error('❌ vite.js not found at:', vitePath);
  process.exit(1);
}

const viteProcess = spawn('node', [vitePath], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env
});

viteProcess.on('error', (error) => {
  console.error('❌ Vite error:', error);
  process.exit(1);
});

viteProcess.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Vite exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle signals
process.on('SIGINT', () => {
  viteProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
  process.exit(0);
});


