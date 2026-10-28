import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, deductBalance, getBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Initiate a secure cash transfer trade with another player!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to trade with')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Amount of coins you want to send in trade')
      .setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const sender = interaction.user;

  if (target.id === sender.id) return interaction.reply({ content: '❌ You cannot trade with yourself!', ephemeral: true });
  if (target.bot) return interaction.reply({ content: '🤖 Bots cannot trade!', ephemeral: true });
  if (amount <= 0) return interaction.reply({ content: '❌ Trade amount must be greater than $0!', ephemeral: true });

  const senderDoc = await getUserData(sender.id, interaction.guildId);
  const targetDoc = await getUserData(target.id, interaction.guildId);

  if (getBalance(senderDoc) < amount) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(amount)}** in your wallet!`, ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('trade_accept').setLabel('✅ Accept Trade').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('trade_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle('🤝 Trade Offer Request')
    .setColor('#00FFFF')
    .setDescription(`**${sender.username}** wants to offer **${formatMoney(amount)}** to **${target.username}**!\n\n**${target.username}**, do you accept this trade?`)
    .setFooter({ text: 'Riya AI Girlfriend • Trade system active for 60s' });

  const message = await interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === target.id;
  const collector = message.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'trade_accept') {
      const freshSender = await getUserData(sender.id, interaction.guildId);
      if (getBalance(freshSender) < amount) {
        return i.update({ content: '❌ Trade failed! Sender no longer has enough funds.', embeds: [], components: [] });
      }

      await deductBalance(freshSender, amount);
      await addBalance(targetDoc, amount);
      await freshSender.save();
      await targetDoc.save();

      const successEmbed = new EmbedBuilder()
        .setTitle('🎉 TRADE COMPLETED SUCCESSFULLY!')
        .setColor('#00FF7F')
        .setDescription(`🤝 Trade executed! **${sender.username}** sent **${formatMoney(amount)}** to **${target.username}**!`)
        .setFooter({ text: 'Riya AI Girlfriend • Thank you for trading safely!' });

      await i.update({ content: null, embeds: [successEmbed], components: [] });
    } else {
      await i.update({ content: `❌ **${target.username}** declined the trade offer.`, embeds: [], components: [] });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({ content: '⏰ Trade offer expired.', embeds: [], components: [] }).catch(() => {});
    }
  });
};
