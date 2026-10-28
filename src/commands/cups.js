import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('cups')
  .setDescription('Play the Shell Game! Pick 1 of 3 cups to find the hidden ball!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Cups is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  const winningCup = Math.floor(Math.random() * 3) + 1;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cup_1').setLabel('🥤 Cup 1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cup_2').setLabel('🥤 Cup 2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cup_3').setLabel('🥤 Cup 3').setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('🎪 Shell Game - Pick a Cup!')
    .setColor('#FF00FF')
    .setDescription(`**Bet:** ${formatMoney(bet)}\n\nRiya shuffled the 3 cups! Under which cup is the magic ball ⚽ hidden?`)
    .setFooter({ text: 'Pick Cup 1, 2, or 3!' });

  const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === user.id;
  const collector = message.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    const pickedCup = parseInt(i.customId.replace('cup_', ''));

    if (pickedCup === winningCup) {
      // WIN! 2.5x payout
      const winAmount = Math.floor(bet * 2.5);
      const freshUser = await getUserData(user.id, interaction.guildId);
      await addBalance(freshUser, winAmount - bet);
      await freshUser.save();

      const winEmbed = new EmbedBuilder()
        .setTitle('🎉 BALL FOUND! YOU WIN!')
        .setColor('#00FF7F')
        .setDescription(`⚽ Sharp eyes! The ball was under **Cup ${winningCup}**!\n\n**Payout (2.5x):** ${formatMoney(winAmount)}`)
        .setFooter({ text: 'Riya AI Girlfriend • Shell Game Winner!' });

      return i.update({ embeds: [winEmbed], components: [] });
    } else {
      // LOSS! 50% penalty rule
      const penalty = Math.floor(bet * 0.50);
      const freshUser = await getUserData(user.id, interaction.guildId);
      await deductBalance(freshUser, penalty);
      await freshUser.save();

      const lossEmbed = new EmbedBuilder()
        .setTitle('❌ MISSED! EMPTY CUP!')
        .setColor('#FF0000')
        .setDescription(`Empty! **Cup ${pickedCup}** had nothing. The ball was under **Cup ${winningCup}**! ⚽\n\n**Result:** Loss! (50% penalty applied: lost **${formatMoney(penalty)}**).`)
        .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });

      return i.update({ embeds: [lossEmbed], components: [] });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({ content: '⏰ Shell game session timed out.', embeds: [], components: [] }).catch(() => {});
    }
  });
};
