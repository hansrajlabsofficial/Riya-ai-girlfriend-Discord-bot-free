import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ROASTS = [
  "You're like a cloud. When you disappear, it becomes a beautiful bright day! ☀️",
  "I'd agree with you, but then we'd both be wrong! 😜",
  "Your WiFi connection has a higher response rate than your brain! 💻",
  "You bring so much joy... whenever you leave the room! 🚪",
  "I am not saying you are lazy, but even your shadow sits down when you stand up! 😂"
];

export const data = new SlashCommandBuilder()
  .setName('roast')
  .setDescription('Deliver a funny, playful roast to a user!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user to roast')
      .setRequired(false));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user') || interaction.user;
  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];

  const embed = new EmbedBuilder()
    .setTitle('🔥 Playful Roast Served!')
    .setColor('#FF4500')
    .setDescription(`Hey <@${target.id}>!\n\n*"${roast}"* 🔥`)
    .setFooter({ text: 'Riya AI Girlfriend • Just kidding, all in good fun!' });

  return interaction.reply({ embeds: [embed] });
};
