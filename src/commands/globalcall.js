import { SlashCommandBuilder } from 'discord.js';
import { startGlobalCall, hangupGlobalCall, getCallStatus } from '../services/globalCallService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('globalcall')
  .setDescription('Initiate or hang up an inter-server 1-on-1 hotline phone call!')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start dialing to connect with another server on the global hotline')
  )
  .addSubcommand(sub =>
    sub.setName('hangup')
      .setDescription('Hang up your server\'s current global phone call')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Check the status of your server\'s global phone call')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand(false) || 'start';

    if (subcommand === 'start') {
      return await startGlobalCall(interaction);
    }
    if (subcommand === 'hangup') {
      return await hangupGlobalCall(interaction);
    }
    if (subcommand === 'status') {
      return await getCallStatus(interaction);
    }

  } catch (error) {
    logger.error('Error executing /globalcall command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to process global call action.', ephemeral: true }).catch(() => {});
    }
  }
};
