import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { loadAllCommands } from '../utils/commandLoader.js';

export const name = 'guildCreate';

export const execute = async (guild) => {
  logger.info(`🎉 Riya was added to a new server: ${guild.name} (${guild.id})!`);

  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  try {
    const { commandsJSON } = await loadAllCommands();

    // Immediately deploy all slash commands directly to the newly joined guild for instant availability
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, guild.id),
      { body: commandsJSON }
    );
    logger.info(`✨ Instantly deployed ${commandsJSON.length} slash commands to new guild: ${guild.name}!`);
  } catch (error) {
    logger.error(`Failed to deploy commands for new guild ${guild.id}:`, error);
  }
};
