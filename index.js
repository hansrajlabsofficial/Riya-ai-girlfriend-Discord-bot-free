/**
 * Root entry point for cloud PaaS hosts and containers.
 * Ensures dependencies exist, then delegates to src/index.js
 */
import fs from 'fs';
import { execSync } from 'child_process';

if (!fs.existsSync('./node_modules') || !fs.existsSync('./node_modules/discord.js')) {
  console.log('📦 [Cloud Boot] node_modules missing. Installing dependencies...');
  try {
    execSync('npm install --production --no-audit --no-fund', { stdio: 'inherit' });
    console.log('✅ [Cloud Boot] Dependencies installed successfully!');
  } catch (err) {
    console.error('⚠️ [Cloud Boot] npm install failed:', err.message);
  }
}

import('./src/index.js');
