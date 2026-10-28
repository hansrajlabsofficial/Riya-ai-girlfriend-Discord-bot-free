import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('pay')
  .setDescription('Send coins to another user')
  .addUserOption(opt => opt.setName('user').setDescription('Target recipient').setRequired(true))
  .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1));

export const execute = async (interaction) => {
  const recipient = interaction.options.getUser('user');
  const amt = interaction.options.getInteger('amount');

  if (recipient.id === interaction.user.id || recipient.bot) {
    return await interaction.reply({ content: '❌ You cannot transfer money to yourself or a bot!', ephemeral: true });
  }

  const senderDoc = await getUserData(interaction.user.id, interaction.guildId);
  const recipientDoc = await getUserData(recipient.id, interaction.guildId);

  if (!await deductBalance(senderDoc, amt)) {
    return await interaction.reply({ content: `❌ Insufficient wallet balance to send **${formatMoney(amt)}**!`, ephemeral: true });
  }

  await addBalance(recipientDoc, amt);
  await saveUserData(senderDoc);
  await saveUserData(recipientDoc);

  const embed = new EmbedBuilder()
    .setColor('#00FF7F')
    .setTitle('💸 Transfer Successful')
    .setDescription(`✅ Successfully sent **${formatMoney(amt)}** to <@${recipient.id}>!`);

  await interaction.reply({ embeds: [embed] });
};
