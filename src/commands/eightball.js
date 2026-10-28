import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('Ask the magic 8-ball a question!')
  .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true));

export const execute = async (interaction) => {
  const q = interaction.options.getString('question');
  const responses = [
    '🎱 It is certain, Baka!',
    '🎱 Without a doubt!',
    '🎱 Most likely, yes! 💕',
    '🎱 Reply hazy, try again later.',
    '🎱 Ask again after compiling code!',
    '🎱 Don\'t count on it, Baka!',
    '🎱 My sources say no.'
  ];
  const reply = responses[Math.floor(Math.random() * responses.length)];

  const embed = new EmbedBuilder()
    .setColor('#9400D3')
    .setTitle('🎱 Magic 8-Ball')
    .addFields(
      { name: 'Question', value: q },
      { name: 'Answer', value: reply }
    );

  await interaction.reply({ embeds: [embed] });
};
