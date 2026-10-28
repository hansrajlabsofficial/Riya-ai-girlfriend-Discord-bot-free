import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

const HORSES = [
  { id: 1, name: '⚡ Lightning Bolt', emoji: '🐎' },
  { id: 2, name: '💖 Secret Romance', emoji: '🐎' },
  { id: 3, name: '🌙 Midnight Star', emoji: '🐎' },
  { id: 4, name: '👑 Royal Diamond', emoji: '🐎' }
];

export const data = new SlashCommandBuilder()
  .setName('horseracing')
  .setDescription('Bet on a live animated horse race and win 4x payout!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('horse')
      .setDescription('Select your champion horse (1-4)')
      .setRequired(true)
      .addChoices(
        { name: '1. ⚡ Lightning Bolt', value: 1 },
        { name: '2. 💖 Secret Romance', value: 2 },
        { name: '3. 🌙 Midnight Star', value: 3 },
        { name: '4. 👑 Royal Diamond', value: 4 }
      ));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet') || 100;
  const selectedHorseId = interaction.options.getInteger('horse') || 1;
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Horse Racing is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  // Deduct initial bet
  await deductBalance(userDoc, bet);
  await userDoc.save();

  const chosenHorse = HORSES.find(h => h.id === selectedHorseId) || HORSES[0];
  const positions = [0, 0, 0, 0];
  const finishLine = 12;
  let winner = null;

  const renderTrack = () => {
    let trackText = '';
    for (let i = 0; i < 4; i++) {
      const h = HORSES[i];
      const pos = positions[i];
      const dotsBefore = '.'.repeat(pos);
      const dotsAfter = '.'.repeat(finishLine - pos);
      const isChosen = h.id === chosenHorse.id ? '⭐' : '';
      trackText += `${isChosen} **${h.name}**: \`[${dotsBefore}${h.emoji}${dotsAfter}🚩]\`\n`;
    }
    return trackText;
  };

  const getEmbed = (status) => new EmbedBuilder()
    .setTitle('🏇 Grand Riya Championship Horse Race')
    .setColor('#00FFFF')
    .setDescription(`**Bet:** ${formatMoney(bet)} on **${chosenHorse.name}**\n\n${renderTrack()}\n\n*${status}*`)
    .setFooter({ text: 'Riya AI Girlfriend • Live Animated Derby' });

  await interaction.reply({ embeds: [getEmbed('🚩 AND THEY ARE OFF!')] });

  const interval = setInterval(async () => {
    if (winner) return;

    for (let i = 0; i < 4; i++) {
      const move = Math.floor(Math.random() * 3) + 1; // move 1 to 3 steps
      positions[i] = Math.min(finishLine, positions[i] + move);
      if (positions[i] >= finishLine && !winner) {
        winner = HORSES[i];
      }
    }

    if (winner) {
      clearInterval(interval);

      if (winner.id === chosenHorse.id) {
        // WIN! 4x Payout
        const winAmount = bet * 4;
        const freshUser = await getUserData(user.id, interaction.guildId);
        await addBalance(freshUser, winAmount);
        await freshUser.save();

        const winEmbed = new EmbedBuilder()
          .setTitle('🎉 YOUR HORSE WON THE RACE!')
          .setColor('#00FF7F')
          .setDescription(`🏆 CHAMPION! **${chosenHorse.name}** crossed the finish line first!\n\n${renderTrack()}\n\n**Total Payout (4x):** ${formatMoney(winAmount)}`)
          .setFooter({ text: 'Riya AI Girlfriend • Derby Winner!' });

        await interaction.editReply({ embeds: [winEmbed] }).catch(() => {});
      } else {
        // LOSS! 50% penalty rule applied
        const refund = Math.floor(bet * 0.50);
        const freshUser = await getUserData(user.id, interaction.guildId);
        await addBalance(freshUser, refund);
        await freshUser.save();

        const lossEmbed = new EmbedBuilder()
          .setTitle('❌ RACE OVER! YOUR HORSE LOST!')
          .setColor('#FF0000')
          .setDescription(`Oof! **${winner.name}** won the race! Your horse **${chosenHorse.name}** finished behind.\n\n${renderTrack()}\n\n**Result:** Loss! (50% penalty applied, ${formatMoney(refund)} returned).`)
          .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });

        await interaction.editReply({ embeds: [lossEmbed] }).catch(() => {});
      }
    } else {
      await interaction.editReply({ embeds: [getEmbed('🏇 The horses are sprinting around the bend!')] }).catch(() => {});
    }
  }, 1500);
};
