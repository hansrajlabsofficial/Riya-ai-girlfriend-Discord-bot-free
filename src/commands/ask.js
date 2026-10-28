import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, deductBalance, getBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('Request coins or financial assistance from another player!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User you are asking for money')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Amount of coins requested')
      .setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const requester = interaction.user;

  if (target.id === requester.id) return interaction.reply({ content: '❌ You cannot ask money from yourself!', ephemeral: true });
  if (target.bot) return interaction.reply({ content: '🤖 Bots cannot give money!', ephemeral: true });
  if (amount <= 0) return interaction.reply({ content: '❌ Requested amount must be greater than $0!', ephemeral: true });

  const targetDoc = await getUserData(target.id, interaction.guildId);
  if (getBalance(targetDoc) < amount) {
    return interaction.reply({ content: `❌ **${target.username}** does not have **${formatMoney(amount)}** in their wallet!`, ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ask_give').setLabel(`💸 Give ${formatMoney(amount)}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ask_refuse').setLabel('❌ Refuse Request').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle('🥺 Financial Assistance Request')
    .setColor('#FFB6C1')
    .setDescription(`**${requester.username}** is politely asking **${target.username}** for a gift of **${formatMoney(amount)}**!\n\n**${target.username}**, will you share your wealth?`)
    .setFooter({ text: 'Riya AI Girlfriend • Money Request Engine' });

  const msg = await interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === target.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'ask_refuse') {
      return i.update({ content: `❌ **${target.username}** politely refused the money request.`, embeds: [], components: [] });
    }

    const freshTarget = await getUserData(target.id, interaction.guildId);
    const freshReq = await getUserData(requester.id, interaction.guildId);

    if (getBalance(freshTarget) < amount) {
      return i.update({ content: '❌ Transaction failed! Sender no longer has enough balance.', embeds: [], components: [] });
    }

    await deductBalance(freshTarget, amount);
    await addBalance(freshReq, amount);
    await freshTarget.save();
    await freshReq.save();

    const successEmbed = new EmbedBuilder()
      .setTitle('💖 GENEROUS GIFT GIVEN!')
      .setColor('#00FF7F')
      .setDescription(`How sweet! **${target.username}** gave **${formatMoney(amount)}** to **${requester.username}**! 💖`)
      .setFooter({ text: 'Riya AI Girlfriend • Generosity Rewarded!' });

    await i.update({ content: null, embeds: [successEmbed], components: [] });
  });
};
