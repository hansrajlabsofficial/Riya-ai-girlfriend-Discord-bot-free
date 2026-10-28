import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addXp } from '../services/rpgService.js';
import { addBalance, deductBalance } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Guess a secret number between 1 and 10 that Riya is thinking of for cash and XP!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const targetNumber = Math.floor(Math.random() * 10) + 1;

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🎲 Guess Riya\'s Secret Number (1 - 10)')
      .setDescription('Riya is thinking of a number from **1 to 10**! Click a button below to guess, Baka!\n\nCorrect = **+$10,000 Cash** | Wrong = **-$5,000 Cash (50% Loss Penalty)**!')
      .setFooter({ text: 'You have 30 seconds.' });

    const row1 = new ActionRowBuilder();
    for (let num = 1; num <= 5; num++) {
      row1.addComponents(
        new ButtonBuilder().setCustomId(`guess_num_${num}`).setLabel(`${num}`).setStyle(ButtonStyle.Primary)
      );
    }

    const row2 = new ActionRowBuilder();
    for (let num = 6; num <= 10; num++) {
      row2.addComponents(
        new ButtonBuilder().setCustomId(`guess_num_${num}`).setLabel(`${num}`).setStyle(ButtonStyle.Primary)
      );
    }

    const guessMsg = await interaction.reply({ embeds: [embed], components: [row1, row2], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('guess_num_');
    const collector = guessMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
      const guessedNum = parseInt(i.customId.replace('guess_num_', ''), 10);

      if (guessedNum === targetNumber) {
        await addBalance(userDoc, 10000);
        const xpResult = addXp(userDoc, 75);
        userDoc.moodScore = Math.min(100, (userDoc.moodScore || 50) + 10);
        await saveUserData(userDoc);

        let winMsg = `🎯 **BINGO!** The secret number was **${targetNumber}**!\n\nRiya gasps: *"Arrey Baka! Are you reading my mind?! You guessed it perfectly!"* **+75 Affection XP & +$10,000 Cash!** 💸💖✨☕`;
        if (xpResult.leveledUp) {
          winMsg += `\n🎊 **LEVEL UP!** You are now **Relationship Level ${xpResult.newLevel}**!`;
        }
        await i.reply({ content: winMsg });
      } else {
        await deductBalance(userDoc, 5000);
        await saveUserData(userDoc);
        await i.reply({
          content: `❌ Aww, so close! You guessed **${guessedNum}**, but Riya was thinking of **${targetNumber}**!\n\n💸 **Lost -$5,000 Cash (50% Loss Penalty)!** Try again next time, Baka! 💕`
        });
      }

      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        await interaction.followUp({ content: '⏰ Number guessing match timed out!', ephemeral: true }).catch(() => {});
      }
    });

  } catch (error) {
    logger.error('Error executing /guess command:', error);
    await interaction.reply({ content: '❌ Failed to start guessing game.', ephemeral: true });
  }
};
