#!/usr/bin/env node
/**
 * Server Launcher Script
 * Automatically detects Node.js and starts both frontend and backend servers
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Find Node.js installation
 */
function findNode() {
  // First, try if node is in PATH (most common case)
  try {
    const nodePath = execSync('which node', { encoding: 'utf-8' }).trim();
    if (nodePath && existsSync(nodePath)) {
      return nodePath;
    }
  } catch (e) {
    // Node not in PATH, continue to check common locations
  }

  // Check common installation paths
  const commonPaths = [
    '/opt/homebrew/bin/node',        // Apple Silicon Homebrew
    '/usr/local/bin/node',            // Intel Homebrew / direct install
    '/usr/bin/node',                  // System install
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Check for nvm installations
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    try {
      const nvmVersionsDir = join(homeDir, '.nvm/versions/node');
      if (existsSync(nvmVersionsDir)) {
        const versions = readdirSync(nvmVersionsDir).sort();
        if (versions.length > 0) {
          // Use the latest version
          const latestVersion = versions[versions.length - 1];
          const nodePath = join(nvmVersionsDir, latestVersion, 'bin/node');
          if (existsSync(nodePath)) {
            return nodePath;
          }
        }
      }
    } catch (e) {
      // nvm not found, continue
    }
  }

  return null;
}

/**
 * Get npm path (usually in same directory as node)
 */
function getNpmPath(nodePath) {
  if (!nodePath) return 'npm';
  
  const npmPath = join(dirname(nodePath), 'npm');
  if (existsSync(npmPath)) {
    return npmPath;
  }
  
  // Fallback to npm in PATH
  return 'npm';
}

/**
 * Start servers using concurrently
 */
function startServers() {
  const nodePath = findNode();
  
  if (!nodePath) {
    console.error('❌ Node.js not found!');
    console.error('');
    console.error('Please install Node.js:');
    console.error('  - Visit https://nodejs.org/ and download the installer');
    console.error('  - Or use Homebrew: brew install node');
    console.error('  - Or use nvm: nvm install node');
    process.exit(1);
  }

  const npmPath = getNpmPath(nodePath);
  const nodeVersion = execSync(`${nodePath} --version`, { encoding: 'utf-8' }).trim();
  
  console.log(`✅ Found Node.js ${nodeVersion} at: ${nodePath}`);
  
  // Free up ports if they're in use
  try {
    const ports = [3001, 5173];
    for (const port of ports) {
      try {
        const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
        if (pid) {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`🔄 Freed port ${port}`);
        }
      } catch (e) {
        // Port is already free, continue
      }
    }
  } catch (e) {
    // lsof might not be available, continue anyway
  }
  
  console.log('🚀 Starting servers...\n');

  // Check if node_modules exists (dependencies installed)
  if (!existsSync(join(projectRoot, 'node_modules'))) {
    console.error('❌ node_modules not found. Please run: npm install');
    process.exit(1);
  }

  // Start both servers using the start:all script
  // This uses concurrently which is configured in package.json
  // Use spawn without shell to avoid deprecation warning
  const serverProcess = spawn(
    npmPath,
    ['run', 'start:all'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, PATH: `${dirname(nodePath)}:${process.env.PATH}` }
    }
  );

  serverProcess.on('error', (error) => {
    console.error('Process spawn error:', error);
  });

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping servers...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });

  serverProcess.on('exit', (code, signal) => {
    process.exit(code || 0);
  });
}

// Run the launcher
startServers();

