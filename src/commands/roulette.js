import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, deductBalance, addBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('roulette')
  .setDescription('Spin the Roulette wheel and bet on Red, Black, or Green!')
  .addIntegerOption(opt => opt.setName('bet').setDescription('Bet amount ($)').setRequired(true).setMinValue(100))
  .addStringOption(opt =>
    opt.setName('choice')
      .setDescription('Bet choice')
      .setRequired(true)
      .addChoices(
        { name: '🔴 RED (2x)', value: 'RED' },
        { name: '⚫ BLACK (2x)', value: 'BLACK' },
        { name: '🟢 GREEN (14x)', value: 'GREEN' }
      )
  );

export const execute = async (interaction) => {
  try {
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('choice');
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    if (!await deductBalance(userDoc, bet)) {
      return await interaction.reply({ content: `❌ You need at least **${formatMoney(bet)}** to play Roulette!`, ephemeral: true });
    }

    const outcomes = ['RED', 'BLACK', 'RED', 'BLACK', 'RED', 'BLACK', 'GREEN'];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];

    let winText = '';
    if (result === choice) {
      const multiplier = choice === 'GREEN' ? 14 : 2;
      const winAmt = bet * multiplier;
      await addBalance(userDoc, winAmt);
      winText = `🎉 **Result:** **${result}**! You won **${formatMoney(winAmt)}**! 🎰💸`;
    } else {
      winText = `❌ **Result:** **${result}**! You lost your bet of **${formatMoney(bet)}**!`;
    }

    await saveUserData(userDoc);

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('🎰 Minigame • Roulette')
      .setDescription(
        `You have placed a Bet of **${formatMoney(bet)} 🪙** on **${choice}**!\n\n` +
        winText
      )
      .setFooter({ text: 'Riya Casino Engine ✨' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('casino_war').setLabel('Play War').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('casino_blackjack').setLabel('Play BlackJack').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('casino_more').setLabel('More').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });

  } catch (error) {
    logger.error('Error executing /roulette command:', error);
    await interaction.reply({ content: '❌ Failed to spin roulette.', ephemeral: true });
  }
};
