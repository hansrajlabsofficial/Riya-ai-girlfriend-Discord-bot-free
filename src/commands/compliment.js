import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const COMPLIMENTS = [
  "Your smile literally lights up the entire Discord server! ✨",
  "You have the kindest heart and warmest soul! 💖",
  "Everything is 100x more fun whenever you are around! 🌸",
  "You're smarter than a supercomputer and cuter than a kitten! 🐱",
  "If happiness had a face, it would look just like you! 🥰"
];

export const data = new SlashCommandBuilder()
  .setName('compliment')
  .setDescription('Send a sweet, wholesome compliment to someone special!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user (leave empty for Riya to compliment you!)')
      .setRequired(false));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user') || interaction.user;
  const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

  const embed = new EmbedBuilder()
    .setTitle('💌 Wholesome Compliment')
    .setColor('#FF69B4')
    .setDescription(`Hey <@${target.id}>!\n\n*"${compliment}"* 💖`)
    .setFooter({ text: 'Riya AI Girlfriend • Spreading love & positivity!' });

  return interaction.reply({ embeds: [embed] });
};
