import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const MOVES = [
  "slapped with a giant floppy fish 🐟",
  "threw a wet pillow with pinpoint accuracy 🛏️",
  "summoned a herd of angry wild goats 🐐",
  "cast a spell that turned their shoes into jelly 👞",
  "launched a high-velocity flying pancake 🥞"
];

export const data = new SlashCommandBuilder()
  .setName('fight')
  .setDescription('Engage in a comical, slapstick fight with another player!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Opponent to fight')
      .setRequired(true));

export const execute = async (interaction) => {
  const opponent = interaction.options.getUser('user');
  const challenger = interaction.user;

  if (opponent.id === challenger.id) return interaction.reply({ content: '❌ Why fight yourself when you can love yourself? 💕', ephemeral: true });

  const move1 = MOVES[Math.floor(Math.random() * MOVES.length)];
  const move2 = MOVES[Math.floor(Math.random() * MOVES.length)];

  const winner = Math.random() < 0.5 ? challenger : opponent;

  const embed = new EmbedBuilder()
    .setTitle('🥊 Comical Slapstick Brawl!')
    .setColor('#FFA500')
    .setDescription(
      `💥 **Round 1:** **${challenger.username}** ${move1} at **${opponent.username}**!\n` +
      `💥 **Round 2:** **${opponent.username}** retaliated and ${move2}!\n\n` +
      `🏆 **WINNER:** <@${winner.id}> stood victorious amidst the chaos!`
    )
    .setFooter({ text: 'Riya AI Girlfriend • Playful Fight Arena' });

  return interaction.reply({ embeds: [embed] });
};
