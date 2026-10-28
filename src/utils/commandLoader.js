import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsDir = path.resolve(__dirname, '../commands');

let cachedMap = null;
let cachedJSON = null;

export const loadAllCommands = async () => {
  if (cachedMap && cachedJSON) {
    return { commandsMap: cachedMap, commandsJSON: cachedJSON };
  }

  const commandsMap = new Map();
  const commandsJSON = [];

  try {
    const files = readdirSync(commandsDir).filter((file) => file.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(commandsDir, file);
      const fileUrl = pathToFileURL(filePath).href;
      
      try {
        const commandModule = await import(fileUrl);
        if (commandModule.data && commandModule.data.name && typeof commandModule.execute === 'function') {
          commandsMap.set(commandModule.data.name, commandModule);
          const json = typeof commandModule.data.toJSON === 'function' ? commandModule.data.toJSON() : commandModule.data;
          // Enable User-Installable App & Direct Messages everywhere across Discord
          if (!json.integration_types) {
            json.integration_types = [0, 1]; // 0: GuildInstall, 1: UserInstall
          }
          if (!json.contexts) {
            json.contexts = [0, 1, 2]; // 0: Guild, 1: BotDM, 2: PrivateChannel
          }
          commandsJSON.push(json);
        } else {
          logger.warn(`Command file ${file} missing 'data' or 'execute' export.`);
        }
      } catch (err) {
        logger.error(`Failed to load command file ${file}:`, err);
      }
    }
  } catch (err) {
    logger.error('Failed to read commands directory:', err);
  }

  cachedMap = commandsMap;
  cachedJSON = commandsJSON;

  return { commandsMap, commandsJSON };
};
