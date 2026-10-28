import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from './logger.js';
import { loadAllCommands } from './commandLoader.js';

const GUILD_IDS = [
  '1388437540461346877',
  '1480210158348009704',
  '1517106528258097182',
  '1517567073390428340'
];

export const registerAllGuilds = async () => {
  if (!config.discordToken || !config.clientId) {
    logger.error('DISCORD_TOKEN or CLIENT_ID missing in environment variables.');
    process.exit(1);
  }

  const { commandsJSON } = await loadAllCommands();
  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  logger.info(`Loaded ${commandsJSON.length} slash commands for instant guild registration...`);

  // 1. Wipe & Re-register Global Slash Commands
  try {
    logger.info('Registering Global Application Slash Commands...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: commandsJSON });
    logger.info('✅ Successfully registered global slash commands!');
  } catch (err) {
    logger.error('Failed global registration:', err);
  }

  // 2. Instant Guild Slash Commands for every connected server
  for (const guildId of GUILD_IDS) {
    try {
      logger.info(`Registering ${commandsJSON.length} instant slash commands for Guild ID: ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: commandsJSON });
      logger.info(`🎉 INSTANT SUCCESS: Registered all slash commands for Guild ${guildId}!`);
    } catch (err) {
      logger.error(`Failed guild registration for ${guildId}:`, err);
    }
  }

  logger.info('✨ ALL GUILD SLASH COMMANDS REGISTRATION COMPLETE!');
  process.exit(0);
};

registerAllGuilds();
