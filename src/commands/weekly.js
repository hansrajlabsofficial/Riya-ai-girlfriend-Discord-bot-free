import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';

export const data = new SlashCommandBuilder()
  .setName('weekly')
  .setDescription('Claim your weekly allowance of $50,000 & 500 XP!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  const now = Date.now();
  const lastWeekly = userDoc.cooldowns?.weekly || 0;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  if (now - lastWeekly < WEEK_MS) {
    const remainingMs = WEEK_MS - (now - lastWeekly);
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return interaction.reply({
      content: `⏳ You already claimed your weekly reward! Come back in **${days} days ${hours} hours**!`,
      ephemeral: true
    });
  }

  userDoc.cooldowns.weekly = now;

  const weeklyReward = 50000;
  const xpReward = 500;

  await addBalance(userDoc, weeklyReward);
  const xpResult = addXp(userDoc, xpReward);
  await userDoc.save();

  const embed = new EmbedBuilder()
    .setTitle('🎁 WEEKLY ALLOWANCE CLAIMED!')
    .setColor('#FFD700')
    .setDescription(`Woohoo! Riya handed you your weekly stipend! 💰`)
    .addFields(
      { name: '💵 Cash Reward', value: formatMoney(weeklyReward), inline: true },
      { name: '⭐ XP Reward', value: `+${xpReward} XP`, inline: true },
      { name: '👛 Wallet Balance', value: formatMoney(userDoc.balance), inline: true }
    )
    .setFooter({ text: xpResult.leveledUp ? `🎉 LEVEL UP! Reached Level ${xpResult.newLevel}!` : 'Riya AI Girlfriend • See you next week!' });

  return interaction.reply({ embeds: [embed] });
};
