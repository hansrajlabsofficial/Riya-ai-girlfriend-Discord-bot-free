import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Play Blackjack (21) against the dealer')
  .addIntegerOption(opt => opt.setName('bet').setDescription('Bet amount ($)').setRequired(true).setMinValue(100));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const userDoc = await getUserData(interaction.user.id, interaction.guildId);

  if (!await deductBalance(userDoc, bet)) {
    return await interaction.reply({ content: `❌ You need at least **${formatMoney(bet)}** to play Blackjack!`, ephemeral: true });
  }

  const pScore = Math.floor(Math.random() * 6) + 16;
  const dScore = Math.floor(Math.random() * 6) + 16;

  let outcomeMsg = '';
  if (pScore > 21) {
    outcomeMsg = `💥 **Bust!** You scored **${pScore}** and lost **${formatMoney(bet)}**!`;
  } else if (dScore > 21 || pScore > dScore) {
    const win = bet * 2;
    await addBalance(userDoc, win);
    outcomeMsg = `🎉 **You Win!** Your score: **${pScore}** vs Dealer: **${dScore}**! Won **${formatMoney(win)}**! 🃏💸`;
  } else if (pScore === dScore) {
    await addBalance(userDoc, bet);
    outcomeMsg = `🤝 **Push!** Both scored **${pScore}**! Bet refunded.`;
  } else {
    outcomeMsg = `❌ **Dealer Wins!** Your score: **${pScore}** vs Dealer: **${dScore}**! Lost **${formatMoney(bet)}**!`;
  }

  await saveUserData(userDoc);

  const embed = new EmbedBuilder()
    .setColor('#00FF7F')
    .setTitle('🃏 Blackjack 21')
    .setDescription(
      `🃏 **Your Score:** **${pScore}**\n` +
      `🎰 **Dealer Score:** **${dScore}**\n\n` +
      outcomeMsg
    );

  await interaction.reply({ embeds: [embed] });
};
