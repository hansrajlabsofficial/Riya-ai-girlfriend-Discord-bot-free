import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getRandomDailyTask } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('daily_task')
  .setDescription('Get your daily relationship task to earn XP and make Aura happy!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const now = new Date();
    if (userDoc.lastDailyTask) {
      const diffHours = (now - new Date(userDoc.lastDailyTask)) / (1000 * 60 * 60);
      if (diffHours < 24 && userDoc.currentDailyTask && userDoc.currentDailyTask.completed) {
        const remainingHours = Math.ceil(24 - diffHours);
        return await interaction.reply({
          content: `⏰ You've already completed today's daily task! Please wait **${remainingHours} hours** for a new task.`,
          ephemeral: true
        });
      }
    }

    // Assign new daily task if not set or expired
    if (!userDoc.currentDailyTask || (now - new Date(userDoc.lastDailyTask)) / (1000 * 60 * 60) >= 24) {
      const task = getRandomDailyTask();
      userDoc.currentDailyTask = {
        id: task.id,
        description: task.description,
        xpReward: task.xpReward,
        completed: false
      };
      userDoc.lastDailyTask = now;
      await saveUserData(userDoc);
    }

    const task = userDoc.currentDailyTask;

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('📌 Your Daily Girlfriend Task')
      .setDescription(`**Task:** ${task.description}\n\n**Reward:** **+${task.xpReward} Affection XP** & **+$10,000 Bank Balance** 💸`)
      .addFields({ name: 'Status', value: task.completed ? '✅ Completed!' : '⌛ In Progress (Perform the action in chat to auto-complete!)' })
      .setFooter({ text: 'Daily tasks reset every 24 hours!' });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error executing /daily_task:', error);
    await interaction.reply({ content: '❌ Failed to fetch daily task.', ephemeral: true });
  }
};
