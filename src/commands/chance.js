import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('chance')
  .setDescription('Customizable Odds Bet! Choose your win percentage and multiplier!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('win_percent')
      .setDescription('Your chosen win percentage (10% to 90%)')
      .setRequired(true)
      .setMinValue(10)
      .setMaxValue(90));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const winPercent = interaction.options.getInteger('win_percent');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Chance is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  const multiplier = parseFloat((99 / winPercent).toFixed(2));
  const roll = Math.floor(Math.random() * 100) + 1; // 1 to 100
  const isWin = roll <= winPercent;

  const embed = new EmbedBuilder()
    .setTitle('🎲 Custom Odds Chance Game')
    .setColor('#9400D3')
    .addFields(
      { name: '💰 Bet', value: formatMoney(bet), inline: true },
      { name: '🎯 Target Win Chance', value: `Below ${winPercent}%`, inline: true },
      { name: '📈 Multiplier', value: `${multiplier}x`, inline: true },
      { name: '🎲 Roll Result', value: `\`[ ${roll} ]\``, inline: true }
    );

  if (isWin) {
    const winAmount = Math.floor(bet * multiplier);
    await addBalance(userDoc, winAmount - bet);
    await userDoc.save();

    embed.setColor('#00FF7F')
      .setDescription(`🎉 **SUCCESSFUL ROLL!** Your roll **${roll}** was within the target range (1-${winPercent})!\n\n**Payout:** ${formatMoney(winAmount)}`)
      .setFooter({ text: 'Riya AI Girlfriend • Chance Game Winner!' });
  } else {
    const penalty = Math.floor(bet * 0.50);
    await deductBalance(userDoc, penalty);
    await userDoc.save();

    embed.setColor('#FF0000')
      .setDescription(`❌ **FAILED ROLL!** Your roll **${roll}** exceeded your target range (${winPercent}).\n\n**Result:** Loss! (50% penalty applied: lost **${formatMoney(penalty)}**).`)
      .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });
  }

  return interaction.reply({ embeds: [embed] });
};
