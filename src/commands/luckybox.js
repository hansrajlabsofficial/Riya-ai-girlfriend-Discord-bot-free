import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, hasBalance, deductBalance, addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('luckybox')
  .setDescription('Open a Lucky Box to win up to 5X your bet!')
  .addIntegerOption(opt =>
    opt.setName('amount')
      .setDescription('The amount of cash to bet (e.g. 100)')
      .setRequired(true)
      .setMinValue(1)
  );

const COOLDOWN_MS = 3000; // 3 seconds cooldown

export const execute = async (interaction) => {
  try {
    const authorUser = interaction.user;
    const bet = interaction.options.getInteger('amount');

    // 1. Validate numerical amount
    if (!bet || bet <= 0 || isNaN(bet)) {
      return await interaction.reply({
        content: '⚠️ **Invalid Bet Amount!** Please specify a valid numerical amount to bet. Example: `/luckybox amount:100` or `xopenbox 100`.',
        ephemeral: true
      });
    }

    const userDoc = await getUserData(authorUser.id, interaction.guildId);

    // 2. Cooldown Check (3s)
    const now = Date.now();
    const lastPlay = userDoc.cooldowns?.luckybox || 0;
    if (now - lastPlay < COOLDOWN_MS) {
      const waitSec = ((COOLDOWN_MS - (now - lastPlay)) / 1000).toFixed(1);
      return await interaction.reply({
        content: `⏳ **Slow down!** Please wait **${waitSec}s** before opening another Lucky Box!`,
        ephemeral: true
      });
    }

    // 3. Balance Check
    if (!hasBalance(userDoc, bet)) {
      return await interaction.reply({
        content: `❌ **Transaction Denied!** You do not have enough funds for this bet. Your balance is **${formatMoney(getBalance(userDoc))}**.`,
        ephemeral: true
      });
    }

    // Set cooldown
    if (!userDoc.cooldowns) userDoc.cooldowns = {};
    userDoc.cooldowns.luckybox = now;

    // Deduct initial bet
    await deductBalance(userDoc, bet);

    // 4. Probability Roll (Exact Math Odds: 45% Lose, 15% Break Even, 25% 2X, 12% 3X, 3% 5X)
    const roll = Math.floor(Math.random() * 100); // 0 to 99

    let outcomeType = 'LOSE';
    let multiplier = 0;
    let winAmount = 0;
    let color = '#FF0000'; // Red
    let descriptionText = '';

    if (roll < 45) {
      // 💥 45% Chance: LOSE (0x)
      outcomeType = 'LOSE';
      multiplier = 0;
      winAmount = 0;
      color = '#FF0000'; // Red
      descriptionText = `💥 **BOOM! The box was rigged!** You found nothing but dust. You lost **${formatMoney(bet)}**.`;
    } else if (roll < 60) {
      // 💸 15% Chance: BREAK EVEN (1x)
      outcomeType = 'BREAK_EVEN';
      multiplier = 1;
      winAmount = bet * 1;
      color = '#FFD700'; // Gold / Yellow
      descriptionText = `📦 **Safe bet!** The box contained your exact stake. You got **${formatMoney(winAmount)}** back.`;
    } else if (roll < 85) {
      // 🚀 25% Chance: DOUBLE (2x)
      outcomeType = 'DOUBLE';
      multiplier = 2;
      winAmount = bet * 2;
      color = '#00FF7F'; // Spring Green
      descriptionText = `🚀 **DOUBLE TROUBLE!** The box bursts open with cash! You won **${formatMoney(winAmount)}** (2X)!`;
    } else if (roll < 97) {
      // 💎 12% Chance: MEGA WIN (3x)
      outcomeType = 'MEGA_WIN';
      multiplier = 3;
      winAmount = bet * 3;
      color = '#9932CC'; // Dark Orchid / Purple
      descriptionText = `💎 **SHINY TRINKETS!** Exceptional luck! You uncovered **${formatMoney(winAmount)}** (3X)!`;
    } else {
      // 👑 3% Chance: JACKPOT (5x)
      outcomeType = 'JACKPOT';
      multiplier = 5;
      winAmount = bet * 5;
      color = '#FFD700'; // Gold
      descriptionText = `👑 **HOLY GRAIL!** The ultimate treasure! You hit the JACKPOT and won **${formatMoney(winAmount)}** (5X)!`;
    }

    // Credit winnings
    if (winAmount > 0) {
      await addBalance(userDoc, winAmount);
    }

    // Award XP
    const xpReward = outcomeType === 'LOSE' ? 10 : 25;
    addXp(userDoc, xpReward);
    await saveUserData(userDoc);

    const newBalance = getBalance(userDoc);

    // Build Rich Embed Response
    const embed = new EmbedBuilder()
      .setTitle('📦 LUCKY BOX GAME MASTER')
      .setColor(color)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081840.png')
      .setDescription(
        `📦 **Opening a ${formatMoney(bet)} Lucky Box for ${authorUser}...**\n` +
        `*The hinges are creaking... What's inside?!* ⏳\n\n` +
        `${descriptionText}`
      )
      .setFooter({
        text: `💰 Remaining Balance: ${formatMoney(newBalance)} • Riya Lucky Box Engine ☕✨`
      })
      .setTimestamp();

    return await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /luckybox command:', error);
    return await interaction.reply({
      content: '❌ **Error opening Lucky Box!** Please try again later.',
      ephemeral: true
    }).catch(() => {});
  }
};
