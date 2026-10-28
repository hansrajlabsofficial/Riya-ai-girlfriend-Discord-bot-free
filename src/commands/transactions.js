import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { formatMoney, getBalance } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('transactions')
  .setDescription('Shows your account transaction logs and history');

export const execute = async (interaction) => {
  const userDoc = await getUserData(interaction.user.id, interaction.guildId);
  const balance = getBalance(userDoc);

  const embed = new EmbedBuilder()
    .setColor('#00FF7F')
    .setTitle(`📜 ${interaction.user.username}'s Transaction Logs`)
    .setDescription(
      `💰 **Current Bank Balance:** **${formatMoney(balance)}**\n\n` +
      `✅ **Recent Activity:**\n` +
      `• Initial Welcome Bonus: **+$10,000**\n` +
      `• Daily Chat Drops & Level Rewards Active\n` +
      `• Event Cost Deduction Verified`
    )
    .setFooter({ text: 'Riya Secure Banking System' });

  await interaction.reply({ embeds: [embed] });
};
