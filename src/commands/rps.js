import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addXp } from '../services/rpgService.js';
import { addBalance, deductBalance } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('rps')
  .setDescription('Play Rock, Paper, Scissors against Riya for bonus Affection XP and money!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor('#9400D3')
      .setTitle('✂️ Rock, Paper, Scissors with Riya')
      .setDescription('Choose your move below, Baka! Win = **+$5,000 Cash** | Loss = **-$2,500 Cash (50% Loss Penalty)**!')
      .setFooter({ text: 'You have 30 seconds to make your choice.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Primary)
    );

    const rpsMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('rps_');
    const collector = rpsMsg.createMessageComponentCollector({ filter, time: 30000 });

    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };

    collector.on('collect', async i => {
      const userChoice = i.customId.replace('rps_', '');
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let resultMsg = `You chose **${emojis[userChoice]}** | Riya chose **${emojis[botChoice]}**\n\n`;

      if (userChoice === botChoice) {
        await addBalance(userDoc, 2500);
        await saveUserData(userDoc);
        resultMsg += `🤝 **It's a Tie!** Riya laughs: *"Arrey Baka, great minds think alike!"* **+$2,500 Cash!** 💸☕`;
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        await addBalance(userDoc, 5000);
        const xpResult = addXp(userDoc, 50);
        userDoc.moodScore = Math.min(100, (userDoc.moodScore || 50) + 5);
        await saveUserData(userDoc);

        resultMsg += `🎉 **YOU WIN!** Riya claps her hands: *"Bov mast! You beat me fair and square, Baka!"* **+50 Affection XP & +$5,000 Cash!** 💸💕`;
        if (xpResult.leveledUp) {
          resultMsg += `\n🎊 **LEVEL UP!** You reached **Level ${xpResult.newLevel}**!`;
        }
      } else {
        await deductBalance(userDoc, 2500);
        await saveUserData(userDoc);
        resultMsg += `😜 **Riya Wins!** Riya sticks out her tongue: *"Hehe! Gamer skill right there!"* **Lost -$2,500 Cash (50% Penalty)!** 💸🎮🔥`;
      }

      await i.reply({ content: resultMsg });
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        await interaction.followUp({ content: '⏰ RPS match timed out!', ephemeral: true }).catch(() => {});
      }
    });

  } catch (error) {
    logger.error('Error executing /rps:', error);
    await interaction.reply({ content: '❌ Failed to start Rock Paper Scissors.', ephemeral: true });
  }
};
