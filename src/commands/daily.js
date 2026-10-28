import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily bank balance reward and build your login streak!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const now = new Date();
    const BASE_DAILY = 10000;

    if (userDoc.lastDailyClaim) {
      const diffHours = (now - new Date(userDoc.lastDailyClaim)) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        return await interaction.reply({
          content: `⏰ You have already claimed today's daily reward! Please wait **${remainingHours} hours** before claiming again.`,
          ephemeral: true
        });
      }

      // Check if streak is preserved (claimed within 48 hours)
      if (diffHours < 48) {
        userDoc.dailyStreak = (userDoc.dailyStreak || 0) + 1;
      } else {
        userDoc.dailyStreak = 1; // Streak reset
      }
    } else {
      userDoc.dailyStreak = 1;
    }

    userDoc.lastDailyClaim = now.toISOString();

    const streakBonus = (userDoc.dailyStreak - 1) * 1000;
    const totalReward = BASE_DAILY + streakBonus;

    await addBalance(userDoc, totalReward);
    await saveUserData(userDoc);

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('🎁 Daily Reward Claimed!')
      .setDescription(
        `🎉 Congratulations <@${interaction.user.id}>!\n\n` +
        `💵 **Base Reward:** **${formatMoney(BASE_DAILY)}**\n` +
        `🔥 **Streak Bonus (${userDoc.dailyStreak} Days):** **+${formatMoney(streakBonus)}**\n\n` +
        `💰 **Total Received:** **${formatMoney(totalReward)}**`
      )
      .setFooter({ text: 'Come back in 24 hours to keep your daily streak alive!' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /daily command:', error);
    await interaction.reply({ content: '❌ Failed to claim daily reward.', ephemeral: true });
  }
};
