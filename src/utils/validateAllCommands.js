import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsDir = path.resolve(__dirname, '../commands');

export async function validateAllCommands() {
  const files = readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  console.log(`\n======================================================`);
  console.log(`🔍 VALIDATING ALL SLASH COMMANDS (${files.length} files found)`);
  console.log(`======================================================\n`);

  let validCount = 0;
  const errors = [];
  const warnings = [];
  const commandMap = new Map();
  const summaryList = [];

  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    const fileUrl = pathToFileURL(filePath).href;

    try {
      const mod = await import(fileUrl);

      // Check export 'data'
      if (!mod.data) {
        errors.push({ file, error: "Missing export 'data'" });
        continue;
      }

      // Check export 'execute'
      if (!mod.execute || typeof mod.execute !== 'function') {
        errors.push({ file, error: "Missing or invalid export 'execute' function" });
        continue;
      }

      // Validate toJSON structure
      let json;
      try {
        json = mod.data.toJSON();
      } catch (jsonErr) {
        errors.push({ file, error: `data.toJSON() failed: ${jsonErr.message}` });
        continue;
      }

      // Discord API Name validation: 1-32 chars, lowercase, no spaces
      if (!json.name || typeof json.name !== 'string') {
        errors.push({ file, error: 'Command missing valid name string' });
        continue;
      }

      if (!/^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u.test(json.name)) {
        errors.push({ file, error: `Invalid command name '${json.name}'. Must be 1-32 lowercase characters with no spaces or special symbols.` });
        continue;
      }

      if (json.name !== json.name.toLowerCase()) {
        errors.push({ file, error: `Command name '${json.name}' must be lowercase.` });
        continue;
      }

      // Discord API Description validation: 1-100 characters
      if (!json.description || json.description.length === 0 || json.description.length > 100) {
        errors.push({ file, error: `Description length must be between 1 and 100 characters (Current: ${json.description?.length || 0})` });
        continue;
      }

      // Duplicate command name check
      if (commandMap.has(json.name)) {
        errors.push({ file, error: `Duplicate command name '${json.name}' already declared in file ${commandMap.get(json.name)}` });
        continue;
      }

      commandMap.set(json.name, file);
      validCount++;

      summaryList.push({
        name: `/${json.name}`,
        file,
        optionsCount: json.options?.length || 0,
        subcommands: (json.options || []).filter(o => o.type === 1).map(s => s.name)
      });

    } catch (err) {
      errors.push({ file, error: err.stack || err.message });
    }
  }

  // Discord API Limit Check: Global Application Commands (Max 100)
  console.log(`📊 Total Valid Commands: ${validCount} / ${files.length}`);
  console.log(`🌐 Discord Global Application Limit: ${validCount} / 100 slots used`);

  if (validCount > 100) {
    errors.push({ file: 'GLOBAL', error: `Too many global slash commands! Current: ${validCount}, Discord limit: 100.` });
  }

  if (errors.length > 0) {
    console.error(`\n❌ FOUND ${errors.length} COMMAND ERRORS:`);
    errors.forEach(e => console.error(`  • [${e.file}]: ${e.error}`));
    return { success: false, validCount, errors, summaryList };
  } else {
    console.log(`\n✅ ALL ${validCount} COMMANDS ARE 100% CLEAN, ERROR-FREE, AND DISCORD API COMPLIANT!`);
    return { success: true, validCount, errors: [], summaryList };
  }
}

// Self-run when invoked directly
if (process.argv[1] && process.argv[1].endsWith('validateAllCommands.js')) {
  validateAllCommands().then(res => {
    if (!res.success) process.exit(1);
    process.exit(0);
  });
}
