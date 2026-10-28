import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const WYR_QUESTIONS = [
  {
    optionA: '🍕 Eat unlimited delicious pizza forever',
    optionB: '🍦 Eat unlimited gourmet ice cream forever'
  },
  {
    optionA: '🌌 Travel to the stars in outer space',
    optionB: '🌊 Explore the deepest unexplored ocean'
  },
  {
    optionA: '⚡ Have the power of super speed',
    optionB: '🦅 Have the power of flight'
  },
  {
    optionA: '🍿 Watch endless romantic anime with Riya',
    optionB: '🎮 Play competitive gaming tournaments all day'
  }
];

export const data = new SlashCommandBuilder()
  .setName('wyr')
  .setDescription('Play Would You Rather with interactive voting buttons!');

export const execute = async (interaction) => {
  const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
  let votesA = 0;
  let votesB = 0;
  const voters = new Set();

  const getRow = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wyr_a').setLabel('Option A').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wyr_b').setLabel('Option B').setStyle(ButtonStyle.Success)
  );

  const getEmbed = () => {
    const total = votesA + votesB;
    const pctA = total > 0 ? Math.round((votesA / total) * 100) : 0;
    const pctB = total > 0 ? Math.round((votesB / total) * 100) : 0;

    return new EmbedBuilder()
      .setTitle('🤔 Would You Rather?')
      .setColor('#FF69B4')
      .setDescription(`**Option A:** ${q.optionA} (${votesA} votes - ${pctA}%)\n\n**Option B:** ${q.optionB} (${votesB} votes - ${pctB}%)\n\n*Click a button below to cast your vote!*`)
      .setFooter({ text: 'Riya AI Girlfriend • Interactive Social Game' });
  };

  const msg = await interaction.reply({ embeds: [getEmbed()], components: [getRow()], fetchReply: true });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (voters.has(i.user.id)) {
      return i.reply({ content: '❌ You already voted in this poll!', ephemeral: true });
    }

    voters.add(i.user.id);
    if (i.customId === 'wyr_a') votesA++;
    else if (i.customId === 'wyr_b') votesB++;

    await i.update({ embeds: [getEmbed()], components: [getRow()] });
  });
};
