import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, deductBalance, getBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Flip a coin! Place a bet and choose Heads or Tails!')
  .addIntegerOption(opt =>
    opt.setName('bet')
      .setDescription('Bet amount in coins (default: $500, minimum: $100)')
      .setRequired(false)
      .setMinValue(100)
  );

/**
 * Renders the interactive coinflip prompt and handles button collector lifecycle
 */
async function renderCoinflipPrompt(interaction, userId, guildId, bet) {
  const userDoc = await getUserData(userId, guildId);
  const balance = getBalance(userDoc);

  // Balance verification
  if (balance < bet) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('❌ Insufficient Funds')
      .setDescription(
        `Hey <@${userId}>, you need **${formatMoney(bet)}** to play, but your current balance is **${formatMoney(balance)}**.\n\n` +
        `💡 *Earn coins using \`/work\`, \`/daily\`, or bet a lower amount!*`
      )
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    if (interaction.isButton && interaction.isButton()) {
      return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      return await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
  }

  // Step 2: Bot displays an embed with two clickable buttons: [ 🪙 Heads ] [ 🪙 Tails ]
  const promptEmbed = new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle(`🪙 Coinflip Challenge • Bet: ${formatMoney(bet)}`)
    .setDescription(
      `Hey <@${userId}>! Make your prediction to flip the coin.\n\n` +
      `💰 **Wager Amount:** **${formatMoney(bet)}**\n` +
      `💳 **Your Balance:** **${formatMoney(balance)}**\n` +
      `🏆 **Potential Profit:** **+${formatMoney(bet)}** *(2x Payout: ${formatMoney(bet * 2)})*\n\n` +
      `👇 **Click Heads or Tails below to toss the coin!**`
    )
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/217/217853.png')
    .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
    .setTimestamp();

  const choiceRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cf_heads_${userId}_${bet}_${Date.now()}`)
      .setLabel('Heads')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`cf_tails_${userId}_${bet}_${Date.now()}`)
      .setLabel('Tails')
      .setEmoji('🪙')
      .setStyle(ButtonStyle.Secondary)
  );

  let msg;
  if (interaction.isButton && interaction.isButton()) {
    msg = await interaction.editReply({ embeds: [promptEmbed], components: [choiceRow] });
  } else {
    msg = await interaction.editReply({ embeds: [promptEmbed], components: [choiceRow] });
  }

  // Create component collector for choice buttons
  const collector = msg.createMessageComponentCollector({
    time: 60000 // 60 seconds to pick
  });

  collector.on('collect', async (btnInteraction) => {
    try {
      // Anti-Cheat: If someone else tries clicking the buttons, deny with private ephemeral warning
      if (btnInteraction.user.id !== userId) {
        return await btnInteraction.reply({
          content: `❌ **Anti-Cheat Warning:** Only <@${userId}> can choose for this coinflip wager! Use \`/coinflip\` to start your own game.`,
          ephemeral: true
        });
      }

      collector.stop('picked');

      // Determine choice
      const isHeads = btnInteraction.customId.includes('_heads_');
      const choice = isHeads ? 'heads' : 'tails';

      // Step 3: The user clicks their choice
      // Buttons turn disabled immediately to block spamming
      const disabledChoiceRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cf_dis_heads')
          .setLabel('Heads')
          .setEmoji('🪙')
          .setStyle(isHeads ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('cf_dis_tails')
          .setLabel('Tails')
          .setEmoji('🪙')
          .setStyle(!isHeads ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      );

      // Message edits to 🪙 Flipping the Coin... (spinning in mid-air...)
      const flippingEmbed = new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('🪙 Flipping the Coin... (spinning in mid-air...)')
        .setDescription(
          `🌪️ **The coin is spinning in mid-air...**\n\n` +
          `🎯 **Your Prediction:** **${choice.toUpperCase()}**\n` +
          `💰 **Bet Amount:** **${formatMoney(bet)}**\n\n` +
          `⏳ *Landing in just a moment... Hang tight, baka!* ✨`
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/217/217853.png')
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

      await btnInteraction.update({
        embeds: [flippingEmbed],
        components: [disabledChoiceRow]
      });

      // Step 4: After exactly 1.8 seconds, the embed edits to reveal the result, updates the wallet, and shows profit/loss
      await new Promise(resolve => setTimeout(resolve, 1800));

      // Refresh user balance & process transaction safely
      const freshUserDoc = await getUserData(userId, guildId);
      const freshBalance = getBalance(freshUserDoc);

      if (freshBalance < bet) {
        return await btnInteraction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#E74C3C')
              .setTitle('❌ Transaction Cancelled')
              .setDescription(`Insufficient funds to complete this flip.`)
              .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
          ],
          components: []
        });
      }

      // Deduct bet from balance
      await deductBalance(freshUserDoc, bet);

      // Flip the coin
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const isWin = (result === choice);

      let finalBalance = getBalance(freshUserDoc);
      let winPayout = 0;

      if (isWin) {
        winPayout = bet * 2;
        finalBalance = await addBalance(freshUserDoc, winPayout);
      }

      await saveUserData(freshUserDoc);

      // Step 4 Reveal Embed
      const resultEmbed = new EmbedBuilder()
        .setColor(isWin ? '#00FF7F' : '#FF4500')
        .setTitle(isWin ? `🪙 Coin Landed on ${result.toUpperCase()}! • YOU WON! 🎉` : `🪙 Coin Landed on ${result.toUpperCase()}! • YOU LOST! ❌`)
        .setDescription(
          `🪙 **Coin Result:** **${result.toUpperCase()}**\n` +
          `🎯 **Your Choice:** **${choice.toUpperCase()}**\n\n` +
          `💰 **Bet Amount:** **${formatMoney(bet)}**\n` +
          `💵 **Profit / Loss:** **${isWin ? `+${formatMoney(bet)}` : `-${formatMoney(bet)}`}** ${isWin ? `*(Payout: ${formatMoney(winPayout)})*` : ''}\n` +
          `💳 **Updated Wallet Balance:** **${formatMoney(finalBalance)}**\n\n` +
          (isWin 
            ? `✨ *Amdavadi Riya says: "Saras baka! You called it perfectly! What a win!"* 💖`
            : `☕ *Amdavadi Riya says: "Arre re baka, don't worry! Double down and win it back!"*`)
        )
        .setThumbnail(result === 'heads'
          ? 'https://cdn-icons-png.flaticon.com/512/217/217853.png'
          : 'https://cdn-icons-png.flaticon.com/512/217/217854.png')
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
        .setTimestamp();

      // Play Again interactive button
      const playAgainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cf_again_${userId}_${bet}_${Date.now()}`)
          .setLabel(`🪙 Play Again (${formatMoney(bet)})`)
          .setStyle(isWin ? ButtonStyle.Success : ButtonStyle.Primary)
      );

      const finalMsg = await btnInteraction.editReply({
        embeds: [resultEmbed],
        components: [playAgainRow]
      });

      // Play Again Collector
      const againCollector = finalMsg.createMessageComponentCollector({
        time: 45000
      });

      againCollector.on('collect', async (againInteraction) => {
        try {
          if (againInteraction.user.id !== userId) {
            return await againInteraction.reply({
              content: `❌ **Anti-Cheat Warning:** Only <@${userId}> can play again on this prompt! Run \`/coinflip\` to start your own.`,
              ephemeral: true
            });
          }

          againCollector.stop('restart');
          await againInteraction.deferUpdate().catch(() => {});
          await renderCoinflipPrompt(againInteraction, userId, guildId, bet);
        } catch (againErr) {
          logger.error('Error handling coinflip again button:', againErr);
        }
      });

      againCollector.on('end', async (_, endReason) => {
        if (endReason !== 'restart') {
          try {
            const endedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('cf_ended')
                .setLabel('Session Finished')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
            await btnInteraction.editReply({ components: [endedRow] }).catch(() => {});
          } catch (e) {}
        }
      });

    } catch (err) {
      logger.error('Error during coinflip choice collection:', err);
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      try {
        const timeoutRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('cf_timeout1')
            .setLabel('Heads')
            .setEmoji('🪙')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('cf_timeout2')
            .setLabel('Tails')
            .setEmoji('🪙')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await interaction.editReply({
          components: [timeoutRow]
        }).catch(() => {});
      } catch (e) {}
    }
  });
}

export const execute = async (interaction) => {
  try {
    // 1. Immediately defer reply to eliminate Discord 3-second timeout
    await interaction.deferReply().catch(() => {});

    const rawBet = interaction.options.getInteger('bet');
    const bet = (rawBet && rawBet >= 100) ? rawBet : 500;

    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    await renderCoinflipPrompt(interaction, userId, guildId, bet);
  } catch (error) {
    logger.error('Error in /coinflip command execution:', error);
    const errContent = '❌ An unexpected error occurred while running /coinflip. Please try again!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
