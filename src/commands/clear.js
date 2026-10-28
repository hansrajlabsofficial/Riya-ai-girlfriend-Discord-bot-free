import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { execute as executeDelete } from './delete.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Bulk clear/purge messages from the current channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(opt =>
    opt
      .setName('amount')
      .setDescription('Number of messages to clear (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('Only clear messages sent by this specific user (optional)')
      .setRequired(false)
  );

export const execute = async (interaction) => {
  return await executeDelete(interaction);
};
