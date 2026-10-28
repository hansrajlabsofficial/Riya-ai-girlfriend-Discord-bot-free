import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { DAILY_QUIZZES, addXp } from '../services/rpgService.js';
import { addBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('daily_quiz')
  .setDescription('Take a daily relationship quiz with Riya to earn bonus Affection XP and $10,000!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    // 24 hour cooldown check
    const now = new Date();
    if (userDoc.lastDailyQuiz) {
      const diffHours = (now - new Date(userDoc.lastDailyQuiz)) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        return await interaction.reply({
          content: `⏰ You've already taken today's quiz! Please wait **${remainingHours} hours** before taking the next one.`,
          ephemeral: true
        });
      }
    }

    const quiz = DAILY_QUIZZES[Math.floor(Math.random() * DAILY_QUIZZES.length)];

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('📝 Daily Girlfriend Quiz')
      .setDescription(`**Question:**\n${quiz.question}`)
      .setFooter({ text: 'Select your answer below! Correct = +$10,000 | Wrong = -$5,000' });

    const row = new ActionRowBuilder();
    quiz.options.forEach((opt, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_ans_${index}`)
          .setLabel(`Option ${index + 1}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    let descriptionWithOptions = `**Question:**\n${quiz.question}\n\n`;
    quiz.options.forEach((opt, idx) => {
      descriptionWithOptions += `**${idx + 1}.** ${opt}\n`;
    });
    embed.setDescription(descriptionWithOptions);

    const quizMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('quiz_ans_');
    const collector = quizMsg.createMessageComponentCollector({ filter, time: 45000 });

    collector.on('collect', async i => {
      const selectedIndex = parseInt(i.customId.replace('quiz_ans_', ''), 10);
      userDoc.lastDailyQuiz = new Date();

      if (selectedIndex === quiz.correctAnswer) {
        const QUIZ_MONEY_REWARD = 10000;
        await addBalance(userDoc, QUIZ_MONEY_REWARD);
        const xpResult = addXp(userDoc, quiz.xpReward);
        userDoc.moodScore = Math.min(100, (userDoc.moodScore || 50) + 10);
        await saveUserData(userDoc);

        let replyText = `🎉 **Correct Answer!** Riya is super impressed! You earned **+${quiz.xpReward} Affection XP** and **+$10,000 Bank Balance**! 💸💕`;
        if (xpResult.leveledUp) {
          replyText += `\n🎊 **LEVEL UP!** You are now **Relationship Level ${xpResult.newLevel}**!`;
        }

        await i.reply({ content: replyText });
      } else {
        await deductBalance(userDoc, 5000);
        await saveUserData(userDoc);
        await i.reply({
          content: `❌ Oops! That wasn't the right answer! You lost **-$5,000 Bank Balance (50% Loss Penalty)**! Come back tomorrow for another quiz! 💸💕`
        });
      }

      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        await interaction.followUp({ content: '⏰ Quiz time expired!', ephemeral: true }).catch(() => {});
      }
    });

  } catch (error) {
    logger.error('Error executing /daily_quiz:', error);
    await interaction.reply({ content: '❌ Failed to launch daily quiz.', ephemeral: true });
  }
};
