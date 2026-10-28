import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney, cleanCanvasText } from './economyService.js';
import { logger } from '../utils/logger.js';

// In-memory active giveaways store
const activeGiveaways = new Map();

/**
 * Parses duration string (e.g. '30s', '5m', '2h', '1d', '60') into milliseconds
 */
export const parseDuration = (durationStr) => {
  if (!durationStr) return null;
  const str = String(durationStr).trim().toLowerCase();
  
  const match = str.match(/^(\d+)\s*([s|m|h|d])?$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'm'; // Default to minutes if no unit provided

  if (isNaN(value) || value <= 0) return null;

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 60 * 1000;
  }
};

/**
 * Generates a high-quality Canvas Winner Card PNG
 */
export const createGiveawayWinnerCard = async ({ winnerName, winnerAvatarUrl, prizeAmount, description }) => {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');

  // Background Dark Gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 450);
  grad.addColorStop(0, '#110320');
  grad.addColorStop(0.5, '#2C0845');
  grad.addColorStop(1, '#0B0314');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 450);

  // Outer Golden Trophy Border
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 780, 430);

  // Inner Neon Pink Accent Border
  ctx.strokeStyle = '#FF1493';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 760, 410);

  // Header Title
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 GIVEAWAY WINNER 🎉', 400, 70);

  // Winner Avatar
  try {
    const avatar = await loadImage(winnerAvatarUrl || 'https://cdn-icons-png.flaticon.com/512/3059/3059502.png');
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 175, 60, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 340, 115, 120, 120);
    ctx.restore();

    // Trophy Ring around Avatar
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(400, 175, 62, 0, Math.PI * 2);
    ctx.stroke();
  } catch (err) {
    logger.warn(`Could not load avatar image for giveaway card: ${err.message}`);
  }

  // Winner Name
  const cleanName = cleanCanvasText(winnerName || 'Lucky Winner');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cleanName, 400, 275);

  // Prize Money Badge
  const formattedPrize = formatMoney(prizeAmount);
  ctx.fillStyle = '#00FF7F';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(`💰 Won ${formattedPrize} Cash!`, 400, 330);

  // Description / Subtext
  ctx.fillStyle = '#B8B0C8';
  ctx.font = 'italic 18px sans-serif';
  ctx.fillText(description ? `"${description}"` : 'Credited directly to Bank Account! 💖', 400, 375);

  // Footer Signature
  ctx.fillStyle = '#FF1493';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('RIYA BOT OFFICIAL GIVEAWAY WINNER CARD • AHP GROUP', 400, 415);

  return canvas.toBuffer('image/png');
};

/**
 * Starts a new giveaway
 */
export const startGiveaway = async ({ interaction, amount, durationMs, description, customMessage, requiredRole, targetChannel }) => {
  const giveawayId = `gw_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const endsAt = Date.now() + durationMs;
  const channel = targetChannel || interaction.channel;

  const giveaway = {
    id: giveawayId,
    guildId: interaction.guildId,
    channelId: channel.id,
    hostId: interaction.user.id,
    amount,
    durationMs,
    endsAt,
    description,
    customMessage: customMessage || null,
    requiredRoleId: requiredRole ? requiredRole.id : null,
    requiredRoleName: requiredRole ? requiredRole.name : null,
    entrants: new Set(),
    messageId: null,
    timer: null,
    ended: false
  };

  const endsTimestampSec = Math.floor(endsAt / 1000);

  const embed = new EmbedBuilder()
    .setColor('#FF1493')
    .setTitle('🎉 MEGA CASH GIVEAWAY 🎉')
    .setDescription(
      `💰 **Prize Amount:** **${formatMoney(amount)} Cash**\n\n` +
      `📝 **Description:** ${description}\n` +
      (customMessage ? `💬 **Message:** ${customMessage}\n` : '') +
      (requiredRole ? `🔒 **Participate Required Role:** <@&${requiredRole.id}>\n` : '') +
      `⌛ **Ends:** <t:${endsTimestampSec}:R> (<t:${endsTimestampSec}:f>)\n` +
      `👤 **Hosted By:** <@${interaction.user.id}>\n\n` +
      `👇 Click the **🎉 Enter Giveaway** button below to participate!`
    )
    .setFooter({ text: `Giveaway ID: ${giveawayId} • Entrants: 0` })
    .setTimestamp(new Date(endsAt));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${giveawayId}`)
      .setLabel('🎉 Enter Giveaway (0)')
      .setStyle(ButtonStyle.Success)
  );

  const msg = await channel.send({ embeds: [embed], components: [row] });
  giveaway.messageId = msg.id;

  // Set timeout to automatically end giveaway when time expires
  giveaway.timer = setTimeout(() => {
    endGiveaway(giveawayId, interaction.client).catch(err => {
      logger.error(`Error ending giveaway ${giveawayId}:`, err);
    });
  }, durationMs);

  activeGiveaways.set(giveawayId, giveaway);
  return giveaway;
};

/**
 * Handles user button click to enter/leave giveaway
 */
export const handleGiveawayEntry = async (interaction) => {
  const giveawayId = interaction.customId.replace('giveaway_enter_', '');
  const giveaway = activeGiveaways.get(giveawayId);

  if (!giveaway || giveaway.ended) {
    return await interaction.reply({
      content: '❌ This giveaway has ended or is no longer active!',
      ephemeral: true
    });
  }

  // Required Role Check
  if (giveaway.requiredRoleId) {
    const hasRole = interaction.member && interaction.member.roles.cache.has(giveaway.requiredRoleId);
    if (!hasRole) {
      return await interaction.reply({
        content: `❌ **Access Denied!** You must have the <@&${giveaway.requiredRoleId}> role to participate in this giveaway!`,
        ephemeral: true
      });
    }
  }

  const userId = interaction.user.id;
  let entered = false;

  if (giveaway.entrants.has(userId)) {
    giveaway.entrants.delete(userId);
    entered = false;
  } else {
    giveaway.entrants.add(userId);
    entered = true;
  }

  // Update button label & embed footer count
  try {
    const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel) {
      const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (msg) {
        const count = giveaway.entrants.size;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_enter_${giveawayId}`)
            .setLabel(`🎉 Enter Giveaway (${count})`)
            .setStyle(ButtonStyle.Success)
        );

        const currentEmbed = EmbedBuilder.from(msg.embeds[0]);
        currentEmbed.setFooter({ text: `Giveaway ID: ${giveawayId} • Entrants: ${count}` });

        await msg.edit({ embeds: [currentEmbed], components: [row] }).catch(() => {});
      }
    }
  } catch (err) {
    logger.warn(`Could not update giveaway embed entrant count: ${err.message}`);
  }

  if (entered) {
    return await interaction.reply({
      content: `🎉 **You entered the giveaway for ${formatMoney(giveaway.amount)} Cash!** Good luck! 🍀`,
      ephemeral: true
    });
  } else {
    return await interaction.reply({
      content: `ℹ️ **You have left the giveaway.** Click again anytime before the timer ends to re-enter.`,
      ephemeral: true
    });
  }
};

/**
 * Ends a giveaway and picks a winner
 */
export const endGiveaway = async (giveawayId, client) => {
  const giveaway = activeGiveaways.get(giveawayId);
  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;
  if (giveaway.timer) clearTimeout(giveaway.timer);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) {
    activeGiveaways.delete(giveawayId);
    return;
  }

  const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  const entrantsList = Array.from(giveaway.entrants);

  // If no valid entrants
  if (entrantsList.length === 0) {
    if (msg) {
      const endEmbed = new EmbedBuilder()
        .setColor('#FF4B4B')
        .setTitle('❌ GIVEAWAY ENDED')
        .setDescription(
          `💰 **Prize Amount:** **${formatMoney(giveaway.amount)} Cash**\n` +
          `📝 **Description:** ${giveaway.description}\n\n` +
          `⚠️ **Result:** No valid entrants entered the giveaway.`
        )
        .setFooter({ text: `Giveaway ID: ${giveawayId} • Ended` });

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_ended_${giveawayId}`)
          .setLabel('Giveaway Ended (0 Entrants)')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await msg.edit({ embeds: [endEmbed], components: [disabledRow] }).catch(() => {});
    }

    await channel.send(`❌ **Giveaway Ended:** No entrants entered for **${formatMoney(giveaway.amount)} Cash**.`).catch(() => {});
    activeGiveaways.delete(giveawayId);
    return;
  }

  // Select Random Winner
  const winnerId = entrantsList[Math.floor(Math.random() * entrantsList.length)];

  // Fetch Winner Discord User
  let winnerUser = null;
  let winnerMember = null;
  try {
    const guild = channel.guild || await client.guilds.fetch(giveaway.guildId).catch(() => null);
    if (guild) {
      winnerMember = await guild.members.fetch(winnerId).catch(() => null);
    }
    winnerUser = winnerMember ? winnerMember.user : await client.users.fetch(winnerId).catch(() => null);
  } catch (err) {
    logger.warn(`Could not fetch winner user: ${err.message}`);
  }

  const winnerName = winnerUser ? (winnerUser.displayName || winnerUser.username) : `User ${winnerId}`;
  const winnerAvatar = winnerUser ? winnerUser.displayAvatarURL({ extension: 'png', size: 512 }) : null;

  // Credit Money Directly to Winner in Firebase Firestore
  try {
    const userDoc = await getUserData(winnerId, giveaway.guildId);
    await addBalance(userDoc, giveaway.amount);
    logger.info(`Credited giveaway prize ${giveaway.amount} to winner ${winnerId}`);
  } catch (err) {
    logger.error(`Failed to credit giveaway prize to winner ${winnerId}:`, err);
  }

  // Generate Winner Canvas Card PNG
  let cardBuffer = null;
  try {
    cardBuffer = await createGiveawayWinnerCard({
      winnerName,
      winnerAvatarUrl: winnerAvatar,
      prizeAmount: giveaway.amount,
      description: giveaway.description
    });
  } catch (err) {
    logger.error(`Error generating giveaway winner card:`, err);
  }

  // Update Original Giveaway Message
  if (msg) {
    const endEmbed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🎉 GIVEAWAY ENDED - WINNER ANNOUNCED! 🎉')
      .setDescription(
        `🏆 **Winner:** <@${winnerId}>\n` +
        `💰 **Prize Won:** **${formatMoney(giveaway.amount)} Cash**\n` +
        `📝 **Description:** ${giveaway.description}\n` +
        `👥 **Total Entrants:** **${entrantsList.length}**`
      )
      .setFooter({ text: `Giveaway ID: ${giveawayId} • Winner Selected!` });

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_ended_${giveawayId}`)
        .setLabel(`🎉 Winner: ${winnerName}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
    );

    await msg.edit({ embeds: [endEmbed], components: [disabledRow] }).catch(() => {});
  }

  // Send Channel Announcement Embed + Winner Canvas Card
  const winnerAnnouncementEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 CONGRATULATIONS TO THE WINNER! 🏆')
    .setDescription(
      `🎉 **<@${winnerId}>** has won **${formatMoney(giveaway.amount)} Cash**!\n\n` +
      `💰 **Prize Credited:** Money has been credited directly to your bank account!\n` +
      `📝 **Giveaway Prize:** ${giveaway.description}\n` +
      `👥 **Total Competitors:** ${entrantsList.length} Entrants`
    )
    .setImage('attachment://winner_card.png')
    .setFooter({ text: 'Riya Bot Official Giveaway System • Congratulations!' })
    .setTimestamp();

  const files = [];
  if (cardBuffer) {
    files.push(new AttachmentBuilder(cardBuffer, { name: 'winner_card.png' }));
  }

  await channel.send({
    content: `🎉 Congratulations <@${winnerId}>! You won **${formatMoney(giveaway.amount)} Cash** in the giveaway! 🥳💰`,
    embeds: [winnerAnnouncementEmbed],
    files
  }).catch(err => logger.error(`Failed to send giveaway winner channel message:`, err));

  // Send Direct Message (DM) to Winner
  if (winnerUser) {
    try {
      const guildName = channel.guild ? channel.guild.name : 'Discord Server';
      await winnerUser.send({
        content:
          `🎉 **CONGRATULATIONS!** You won the giveaway in **${guildName}**!\n\n` +
          `💰 **Prize Amount:** **${formatMoney(giveaway.amount)} Cash**\n` +
          `📝 **Description:** ${giveaway.description}\n` +
          `💳 **Status:** The prize money has been credited directly to your bank account!\n\n` +
          `Thank you for participating! 💖✨`
      });
      logger.info(`Sent giveaway winner DM to ${winnerId}`);
    } catch (err) {
      logger.warn(`Could not send giveaway DM to winner ${winnerId}: ${err.message}`);
    }
  }

  activeGiveaways.delete(giveawayId);
};
