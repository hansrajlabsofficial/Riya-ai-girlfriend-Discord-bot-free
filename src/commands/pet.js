import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('pet')
  .setDescription('Pet a user to show affection')
  .addUserOption(opt => opt.setName('user').setDescription('Target to pet').setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const embed = new EmbedBuilder()
    .setColor('#FFB6C1')
    .setDescription(`🖐️ <@${interaction.user.id}> gently pats <@${target.id}> on the head! So cute! 🌸✨`);

  await interaction.reply({ embeds: [embed] });
};
