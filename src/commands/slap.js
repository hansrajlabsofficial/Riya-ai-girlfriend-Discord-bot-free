import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('slap')
  .setDescription('Slap someone for fun!')
  .addUserOption(opt => opt.setName('user').setDescription('Target to slap').setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setDescription(`👋 <@${interaction.user.id}> slapped <@${target.id}> across the face! Ouch, Baka! 💥`);

  await interaction.reply({ embeds: [embed] });
};
