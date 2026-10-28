import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('View cash in wallet, bank balance & financial statistics!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user (leave empty to view your own)')
      .setRequired(false));

export const execute = async (interaction) => {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userDoc = await getUserData(targetUser.id, interaction.guildId);

  const walletCash = getBalance(userDoc);
  const bankSavings = userDoc.bank || 0;
  const netWorth = walletCash + bankSavings;
  const itemCount = userDoc.inventory ? userDoc.inventory.length : 0;

  const embed = new EmbedBuilder()
    .setTitle(`👛 Financial Portfolio: ${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setColor('#00FF7F')
    .addFields(
      { name: '💵 Wallet Cash', value: formatMoney(walletCash), inline: true },
      { name: '🏦 Bank Safe Savings', value: formatMoney(bankSavings), inline: true },
      { name: '💎 Net Worth', value: formatMoney(netWorth), inline: true },
      { name: '🎒 Inventory Items', value: `${itemCount} items`, inline: true },
      { name: '⭐ Level', value: `Level ${userDoc.level || 1}`, inline: true }
    )
    .setFooter({ text: 'Riya AI Girlfriend • Use /deposit & /withdraw for bank transfers!' });

  return interaction.reply({ embeds: [embed] });
};
