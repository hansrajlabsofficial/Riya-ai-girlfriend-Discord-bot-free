import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('crash')
  .setDescription('Play the rising Crash Rocket! Cash out before the multiplier crashes!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Crash is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  // Deduct initial bet
  await deductBalance(userDoc, bet);
  await userDoc.save();

  // Determine secret crash point (Exponential distribution weighted towards 1.2x - 5.0x)
  const crashPoint = parseFloat((1.1 + (Math.pow(Math.random(), 2) * 6)).toFixed(2));
  let currentMultiplier = 1.0;
  let cashedOut = false;
  let crashed = false;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('crash_cashout').setLabel('💥 CASH OUT!').setStyle(ButtonStyle.Success)
  );

  const getEmbed = (mult, statusText) => new EmbedBuilder()
    .setTitle('🚀 Riya\'s Crash Rocket')
    .setColor('#00FFFF')
    .setDescription(`**Bet:** ${formatMoney(bet)}\n\n📈 **Multiplier:** \`${mult.toFixed(2)}x\`\n💰 **Current Profit:** ${formatMoney(Math.floor(bet * mult))}\n\n*${statusText}*`)
    .setFooter({ text: 'Riya AI Girlfriend • Crash Gambling Engine' });

  const message = await interaction.reply({ embeds: [getEmbed(currentMultiplier, '🚀 Rocket launching! Click Cash Out!')], components: [row], fetchReply: true });

  const filter = i => i.user.id === user.id && i.customId === 'crash_cashout';
  const collector = message.createMessageComponentCollector({ filter, time: 20000 });

  // Ticking interval simulating rising rocket
  const interval = setInterval(async () => {
    if (cashedOut || crashed) return;

    currentMultiplier += 0.25;

    if (currentMultiplier >= crashPoint) {
      crashed = true;
      clearInterval(interval);
      collector.stop('crashed');

      // 50% Loss Rule applied on crash (refund 50% of bet)
      const refund = Math.floor(bet * 0.50);
      const freshUser = await getUserData(user.id, interaction.guildId);
      await addBalance(freshUser, refund);
      await freshUser.save();

      const crashEmbed = new EmbedBuilder()
        .setTitle('💥 CRASHED! ROCKET EXPLODED!')
        .setColor('#FF0000')
        .setDescription(`The rocket crashed at **${crashPoint.toFixed(2)}x** before you cashed out! 💥\n\n**Result:** Loss! (50% penalty applied, ${formatMoney(refund)} returned).`)
        .setFooter({ text: 'Riya AI Girlfriend • Better luck next time!' });

      await interaction.editReply({ embeds: [crashEmbed], components: [] }).catch(() => {});
    } else {
      await interaction.editReply({ embeds: [getEmbed(currentMultiplier, '🚀 Rocket rising... Press Cash Out before crash!')], components: [row] }).catch(() => {});
    }
  }, 1200);

  collector.on('collect', async i => {
    if (crashed || cashedOut) return;
    cashedOut = true;
    clearInterval(interval);

    const winAmount = Math.floor(bet * currentMultiplier);
    const freshUser = await getUserData(user.id, interaction.guildId);
    await addBalance(freshUser, winAmount);
    await freshUser.save();

    const winEmbed = new EmbedBuilder()
      .setTitle('🎉 CRASH CASHOUT VICTORY!')
      .setColor('#00FF7F')
      .setDescription(`Awesome timing! You cashed out at **${currentMultiplier.toFixed(2)}x**!\n\n**Total Payout:** ${formatMoney(winAmount)}`)
      .setFooter({ text: 'Riya AI Girlfriend • Rocket Winnings Collected!' });

    await i.update({ embeds: [winEmbed], components: [] });
  });
};
