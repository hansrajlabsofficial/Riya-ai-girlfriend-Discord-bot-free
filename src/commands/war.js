import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

const CARDS = [
  { rank: '2', val: 2 }, { rank: '3', val: 3 }, { rank: '4', val: 4 }, { rank: '5', val: 5 },
  { rank: '6', val: 6 }, { rank: '7', val: 7 }, { rank: '8', val: 8 }, { rank: '9', val: 9 },
  { rank: '10', val: 10 }, { rank: 'J', val: 11 }, { rank: 'Q', val: 12 }, { rank: 'K', val: 13 }, { rank: 'A', val: 14 }
];

export const data = new SlashCommandBuilder()
  .setName('war')
  .setDescription('Play Casino High-Card War vs Riya the Dealer!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for War is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  // Draw cards
  const playerCard = CARDS[Math.floor(Math.random() * CARDS.length)];
  const dealerCard = CARDS[Math.floor(Math.random() * CARDS.length)];

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Casino High-Card War')
    .setColor('#FF1493')
    .addFields(
      { name: '🎴 Your Card', value: `\`[ ${playerCard.rank} ]\``, inline: true },
      { name: '🃏 Dealer Card', value: `\`[ ${dealerCard.rank} ]\``, inline: true }
    );

  if (playerCard.val > dealerCard.val) {
    // WIN! 2x Payout
    const winAmount = bet * 2;
    await addBalance(userDoc, bet); // Net +bet
    await userDoc.save();

    embed.setColor('#00FF7F')
      .setDescription(`🎉 **VICTORY!** Your card **${playerCard.rank}** beats dealer **${dealerCard.rank}**!\n\n**Payout:** ${formatMoney(winAmount)}`)
      .setFooter({ text: 'Riya AI Girlfriend • Casino War Winner!' });
  } else if (playerCard.val < dealerCard.val) {
    // LOSS! 50% Penalty rule
    const penalty = Math.floor(bet * 0.50);
    await deductBalance(userDoc, penalty);
    await userDoc.save();

    embed.setColor('#FF0000')
      .setDescription(`💀 **DEFEAT!** Dealer's **${dealerCard.rank}** beats your **${playerCard.rank}**!\n\n**Result:** Loss! (50% penalty applied: lost **${formatMoney(penalty)}**).`)
      .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });
  } else {
    // TIE! Bet returned
    embed.setColor('#FFFF00')
      .setDescription(`⚖️ **TIE!** Both cards were **${playerCard.rank}**! Your bet was returned in full.`)
      .setFooter({ text: 'Riya AI Girlfriend • Push / Tie' });
  }

  return interaction.reply({ embeds: [embed] });
};
