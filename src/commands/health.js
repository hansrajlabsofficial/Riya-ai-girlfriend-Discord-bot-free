import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';

export const data = new SlashCommandBuilder()
  .setName('health')
  .setDescription('Check player health status')
  .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user') || interaction.user;
  const userDoc = await getUserData(target.id, interaction.guildId);

  const hp = userDoc.hp || 100;
  const maxHp = userDoc.maxHp || 100;

  const embed = new EmbedBuilder()
    .setColor(hp > 50 ? '#00FF7F' : hp > 20 ? '#FFA500' : '#FF0000')
    .setTitle(`❤️ ${target.username}'s Health Status`)
    .setDescription(`**HP:** **${hp} / ${maxHp}** ❤️\n\n*Use potions or rest to restore HP!*`);

  await interaction.reply({ embeds: [embed] });
};
