import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { createGridChaseMatch } from '../services/gridChaseService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('catchme')
  .setDescription('Tactical 1v1 Grid Chase: Runner (🏃) vs Hunter (🚔) on a 5x5 city grid!')
  .addUserOption(opt =>
    opt.setName('opponent')
      .setDescription('The user you want to challenge to a tactical grid chase')
      .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('bet')
      .setDescription('Optional wager coins per player (minimum $100 if specified)')
      .setRequired(false)
      .setMinValue(100)
  );

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const rawBet = interaction.options.getInteger('bet');
    const bet = rawBet && rawBet >= 100 ? rawBet : 0;
    const guildId = interaction.guildId;

    // 1. Validation checks
    if (opponent.id === challenger.id) {
      return await interaction.editReply({
        content: '❌ **Cannot Play Yourself:** You cannot chase yourself through the streets, baka! Tag a friend.'
      });
    }

    if (opponent.bot) {
      return await interaction.editReply({
        content: '🤖 **No Bots Allowed:** Discord bots don\'t know how to pilot police cruisers or dodge roadblocks!'
      });
    }

    // 2. Wager balance verification
    if (bet > 0) {
      const cDoc = await getUserData(challenger.id, guildId);
      const oDoc = await getUserData(opponent.id, guildId);

      const cBal = getBalance(cDoc);
      const oBal = getBalance(oDoc);

      if (cBal < bet) {
        return await interaction.editReply({
          content: `❌ **Insufficient Funds:** You have **${formatMoney(cBal)}**, but placed a wager of **${formatMoney(bet)}**!`
        });
      }

      if (oBal < bet) {
        return await interaction.editReply({
          content: `❌ **Opponent Insufficient Funds:** <@${opponent.id}> only has **${formatMoney(oBal)}** in their wallet!`
        });
      }
    }

    // 3. Challenge invitation Embed
    const acceptRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cm_accept_${opponent.id}`)
        .setLabel(bet > 0 ? `⚔️ Accept Chase (${formatMoney(bet)})` : '⚔️ Accept Chase')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`cm_decline_${opponent.id}`)
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger)
    );

    const challengeEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🚔🏃 Tactical 1v1 Grid Chase Challenge!')
      .setDescription(
        `Hey <@${opponent.id}>! **${challenger.username}** has challenged you to a tactical cat-and-mouse chase on a 5×5 city grid!\n\n` +
        `🏃 **Runner:** <@${challenger.id}> *(Goal: Reach 🚁 extraction or survive 10 rounds)*\n` +
        `🚔 **Hunter:** <@${opponent.id}> *(Goal: Intercept & tackle the Runner)*\n\n` +
        (bet > 0 ? `💰 **Wager Pot:** **${formatMoney(bet * 2)}** *(${formatMoney(bet)} each)*\n\n` : '🎮 **Type:** Casual friendly match\n\n') +
        `Click **Accept** below within 60 seconds to deploy into the city grid!`
      )
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/808/808439.png')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    const replyMsg = await interaction.editReply({
      content: `<@${opponent.id}>`,
      embeds: [challengeEmbed],
      components: [acceptRow]
    });

    // 4. Collector for acceptance (fallback to direct routing in interactionCreate.js as well)
    const acceptCollector = replyMsg.createMessageComponentCollector({
      time: 60000
    });

    acceptCollector.on('collect', async (btnInt) => {
      try {
        if (btnInt.user.id !== opponent.id) {
          return await btnInt.reply({
            content: `❌ **Anti-Cheat Warning:** Only <@${opponent.id}> can accept or decline this chase challenge!`,
            ephemeral: true
          });
        }

        if (btnInt.customId.startsWith('cm_decline_')) {
          acceptCollector.stop('declined');
          return await btnInt.update({
            content: `❌ <@${opponent.id}> declined the Tactical Grid Chase challenge.`,
            embeds: [],
            components: []
          });
        }

        if (btnInt.customId.startsWith('cm_accept_')) {
          acceptCollector.stop('accepted');

          // Check balance again
          if (bet > 0) {
            const freshC = await getUserData(challenger.id, guildId);
            const freshO = await getUserData(opponent.id, guildId);

            if (getBalance(freshC) < bet || getBalance(freshO) < bet) {
              return await btnInt.update({
                content: '❌ Match cancelled! One of the players no longer has enough balance.',
                embeds: [],
                components: []
              });
            }

            await deductBalance(freshC, bet);
            await deductBalance(freshO, bet);
            await saveUserData(freshC);
            await saveUserData(freshO);
          }

          // Acknowledge acceptance
          await btnInt.deferUpdate().catch(() => {});

          // Launch Game Session via gridChaseService
          await createGridChaseMatch(interaction, challenger, opponent, bet, guildId);
        }
      } catch (err) {
        logger.error('Error during catchme accept collector:', err);
      }
    });

    acceptCollector.on('end', async (_, reason) => {
      if (reason === 'time') {
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#7F8C8D')
            .setTitle('⌛ Challenge Expired')
            .setDescription(`The challenge to <@${opponent.id}> timed out without a response.`)
            .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

          await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        } catch (e) {}
      }
    });

  } catch (error) {
    logger.error('Error executing /catchme command:', error);
    const errContent = '❌ An unexpected error occurred while setting up the grid chase.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
