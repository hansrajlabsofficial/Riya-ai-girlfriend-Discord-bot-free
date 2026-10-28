import { SlashCommandBuilder } from 'discord.js';
import { startGlobalPrivateCall, hangupGlobalPrivateCall, getPrivateCallStatus } from '../services/globalPrivateCallService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('globalprivatecall')
  .setDescription('Initiate or hang up a private 1-on-1 DM hotline call with another user!')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start dialing to connect with another user in a private DM hotline call')
  )
  .addSubcommand(sub =>
    sub.setName('hangup')
      .setDescription('Hang up your current private DM phone call')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Check the status of your active private DM phone call')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand(false) || 'start';

    if (subcommand === 'start') {
      return await startGlobalPrivateCall(interaction);
    }
    if (subcommand === 'hangup') {
      return await hangupGlobalPrivateCall(interaction);
    }
    if (subcommand === 'status') {
      return await getPrivateCallStatus(interaction);
    }

  } catch (error) {
    logger.error('Error executing /globalprivatecall command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to process global private call action.', ephemeral: true }).catch(() => {});
    }
  }
};
