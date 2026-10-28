import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';

export const data = new SlashCommandBuilder()
  .setName('cd')
  .setDescription('View active action cooldowns')
  .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user') || interaction.user;
  const userDoc = await getUserData(target.id, interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle(`⏳ ${target.username}'s Active Cooldowns`)
    .addFields(
      { name: '🎁 /daily', value: userDoc.lastDailyClaim ? '⌛ Cooldown Active' : '✅ Ready to Claim!', inline: true },
      { name: '📝 /daily_quiz', value: userDoc.lastDailyQuiz ? '⌛ Cooldown Active' : '✅ Ready!', inline: true },
      { name: '📌 /daily_task', value: userDoc.lastDailyTask ? '⌛ Cooldown Active' : '✅ Ready!', inline: true }
    );

  await interaction.reply({ embeds: [embed] });
};
