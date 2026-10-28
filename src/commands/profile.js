import { SlashCommandBuilder } from 'discord.js';
import { execute as executeAccount } from './account.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Shows the profile of a user')
  .addUserOption(opt => opt.setName('user').setDescription('The user profile to view').setRequired(false));

export const execute = async (interaction) => {
  return await executeAccount(interaction);
};
