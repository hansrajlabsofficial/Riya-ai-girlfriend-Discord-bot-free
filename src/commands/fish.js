import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { formatMoney } from '../services/economyService.js';
import {
  RODS,
  FISH_TIERS,
  rollCatch,
  getUserFishing,
  getFishingQuote,
  FISHING_EMBLEM_URL
} from '../services/fishingService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('fish')
  .setDescription('Cast your fishing line into deep waters to catch fish, ocean beasts, or treasures!');

export const execute = async (interaction) => {
  try {
    // 1. Immediately defer reply to avoid Discord 3-second timeout
    await interaction.deferReply().catch(() => {});

    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const userDoc = await getUserData(userId, guildId);
    const fishing = getUserFishing(userDoc);
    const rod = RODS[fishing.rod] || RODS.bamboo;

    const cooldownMs = (rod.cooldownSec || 60) * 1000;
    const now = Date.now();
    const lastFish = userDoc.cooldowns?.fish || 0;

    // 2. Cooldown verification
    if (now - lastFish < cooldownMs) {
      const readyAtUnix = Math.floor((lastFish + cooldownMs) / 1000);
      const cdEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⏳ Fishing Line is Wet!')
        .setDescription(
          `Hey <@${userId}>, calm down baka! Your **${rod.emoji} ${rod.name}** is on cooldown.\n\n` +
          `⏰ **Ready to fish again:** <t:${readyAtUnix}:R> (<t:${readyAtUnix}:T>)\n\n` +
          `💡 *Tip: Upgrade your rod in \`/shop\` to cut your cooldown down to 15 seconds!*`
        )
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

      return await interaction.editReply({ embeds: [cdEmbed] });
    }

    // 3. Minigame Stage 1: Casting the line
    const castingEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🎣 Casting your ${rod.emoji} ${rod.name}...`)
      .setDescription(
        `🌊 <@${userId}> casts their line into the misty deep ocean waters...\n\n` +
        `🫧 *The bobber drifts quietly with the current... Watching for ripples...*`
      )
      .setThumbnail(FISHING_EMBLEM_URL)
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    await interaction.editReply({ embeds: [castingEmbed] });

    // Wait 1.5 seconds for immersive fishing animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Roll Catch
    const caughtItem = rollCatch(fishing.rod);
    const tierObj = FISH_TIERS[caughtItem.tier];

    // Push into user creel
    fishing.catches.push(caughtItem);
    fishing.stats.totalCaught = (fishing.stats.totalCaught || 0) + 1;

    // Personal bests check
    let isNewHeaviest = false;
    if (!fishing.stats.heaviestCatch || caughtItem.weightKg > (fishing.stats.heaviestCatch.weightKg || 0)) {
      fishing.stats.heaviestCatch = {
        name: caughtItem.name,
        emoji: caughtItem.emoji,
        weightKg: caughtItem.weightKg,
        value: caughtItem.value,
        tier: caughtItem.tier,
        date: new Date().toISOString()
      };
      isNewHeaviest = true;
    }

    // Update cooldown
    userDoc.cooldowns = userDoc.cooldowns || {};
    userDoc.cooldowns.fish = Date.now();

    await saveUserData(userDoc);

    // 5. Result Presentation Embed
    let titlePrefix = '🎣 Reeled in:';
    if (caughtItem.tier === 'legendary') titlePrefix = '🔱 👑 MYTHICAL CATCH:';
    else if (caughtItem.tier === 'epic') titlePrefix = '🔥 INCREDIBLE CATCH:';
    else if (caughtItem.tier === 'rare') titlePrefix = '🌟 PRIZED FIND:';
    else if (caughtItem.tier === 'junk') titlePrefix = '👞 Scavenged:';

    let extraNote = '';
    if (isNewHeaviest && caughtItem.tier !== 'junk') {
      extraNote = `\n🏆 **NEW PERSONAL RECORD!** Your heaviest catch ever (**${caughtItem.weightKg.toFixed(1)} kg**)! 🎉\n`;
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(tierObj.color)
      .setTitle(`${titlePrefix} ${caughtItem.emoji} ${caughtItem.name}!`)
      .setDescription(
        `🌊 **You landed a catch!**\n\n` +
        `🏷️ **Rarity:** **${tierObj.name}**\n` +
        `⚖️ **Weight:** **${caughtItem.weightKg.toFixed(1)} kg**\n` +
        `💰 **Market Value:** **${formatMoney(caughtItem.value)}**\n` +
        `*(Base: ${formatMoney(caughtItem.basePrice)} + ${caughtItem.weightKg.toFixed(1)}kg × $10)*\n` +
        extraNote +
        `\n🎒 **Creel Storage:** **${fishing.catches.length} items** in inventory\n` +
        `🎣 **Equipped Rod:** ${rod.emoji} **${rod.name}** *(Cooldown: ${rod.cooldownSec}s)*\n\n` +
        `✨ *Amdavadi Riya says: "${getFishingQuote(caughtItem.tier)}"*`
      )
      .setThumbnail(FISHING_EMBLEM_URL)
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
      .setTimestamp();

    // Quick action buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fish_sell_${userId}`)
        .setLabel('Market / Sell')
        .setEmoji('🏪')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`fish_inv_${userId}`)
        .setLabel('View Creel')
        .setEmoji('📦')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`fish_shop_${userId}`)
        .setLabel('Rod Upgrades')
        .setEmoji('🛍️')
        .setStyle(ButtonStyle.Secondary)
    );

    const replyMsg = await interaction.editReply({ embeds: [resultEmbed], components: [row] });

    // Handle Quick Action Buttons
    const collector = replyMsg.createMessageComponentCollector({
      time: 60000
    });

    collector.on('collect', async (btnInt) => {
      try {
        if (btnInt.user.id !== userId) {
          return await btnInt.reply({
            content: `❌ **Anti-Cheat:** Only <@${userId}> can manage their fishing creel from this message! Cast your own line with \`/fish\`.`,
            ephemeral: true
          });
        }

        if (btnInt.customId.startsWith('fish_sell_')) {
          await btnInt.reply({
            content: '🏪 Open your market stall anytime using **/sell** to choose what catches to liquidate!',
            ephemeral: true
          });
        } else if (btnInt.customId.startsWith('fish_inv_')) {
          await btnInt.reply({
            content: '📦 Check all your fish weights, records, and gear anytime using **/inventory**!',
            ephemeral: true
          });
        } else if (btnInt.customId.startsWith('fish_shop_')) {
          await btnInt.reply({
            content: '🛍️ Check out Fiberglass, Carbon Pro, and Poseidon\'s Trident Rods using **/shop**!',
            ephemeral: true
          });
        }
      } catch (err) {
        logger.error('Error handling fish quick button:', err);
      }
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] }).catch(() => {});
      } catch (e) {}
    });

  } catch (error) {
    logger.error('Error in /fish command execution:', error);
    const errContent = '❌ An error occurred while casting your fishing line. Please try again!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
