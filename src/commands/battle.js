import { SlashCommandBuilder } from 'discord.js';
import { execute as executeAttack } from './attack.js';

export const data = new SlashCommandBuilder()
  .setName('battle')
  .setDescription('Challenge another player to a battle')
  .addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true));

export const execute = async (interaction) => {
  return await executeAttack(interaction);
};
