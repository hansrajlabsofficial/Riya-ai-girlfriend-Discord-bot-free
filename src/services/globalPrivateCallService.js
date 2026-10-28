import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, hasBalance, deductBalance, addBalance, formatMoney } from './economyService.js';

export const createPrivateCallEndButtonRow = () => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_globalprivcall_end')
      .setLabel('📵 End Call')
      .setStyle(ButtonStyle.Danger)
  );
};

// Global Private Call State Store
let privateWaitingLine = null; // { userId, guildId, timestamp }
const activePrivateCalls = new Map(); // userId -> { peerUserId, callId, startTime, billingInterval }
const processedPrivateCallMessages = new Set();

/**
 * Auto-hangup private call when a user runs out of funds
 */
const autoHangupPrivateCall = async (client, userId, peerUserId, failedUserId) => {
  const callA = activePrivateCalls.get(userId);
  const callB = activePrivateCalls.get(peerUserId);

  if (callA?.billingInterval) clearInterval(callA.billingInterval);
  if (callB?.billingInterval) clearInterval(callB.billingInterval);

  activePrivateCalls.delete(userId);
  activePrivateCalls.delete(peerUserId);

  const autoHangupEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('🔒📵 PRIVATE CALL DISCONNECTED')
    .setDescription(
      `💸 **Call Terminated!** <@${failedUserId}> ran out of wallet cash ($10/min rate required to stay connected).\n` +
      `The private DM hotline connection has automatically closed.`
    )
    .setFooter({ text: 'Riya Private DM Hotline Engine ☕✨' });

  // Send DM to User A
  try {
    const userA = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
    if (userA) await userA.send({ embeds: [autoHangupEmbed] }).catch(() => {});
  } catch (err) {
    logger.warn(`Failed to send private call auto-hangup DM to user A: ${err.message}`);
  }

  // Send DM to User B
  try {
    const userB = client.users.cache.get(peerUserId) || await client.users.fetch(peerUserId).catch(() => null);
    if (userB) await userB.send({ embeds: [autoHangupEmbed] }).catch(() => {});
  } catch (err) {
    logger.warn(`Failed to send private call auto-hangup DM to user B: ${err.message}`);
  }
};

/**
 * Start or Match a Global Private Call
 */
export const startGlobalPrivateCall = async (interaction) => {
  const userId = interaction.user.id;
  const guildId = interaction.guildId || 'DM';

  // 1. Check if already in an active private call
  if (activePrivateCalls.has(userId)) {
    const active = activePrivateCalls.get(userId);
    return await interaction.reply({
      content: `🔒 **Already in a Private Call!** You are connected to <@${active.peerUserId}>! Type \`/globalprivatecall hangup\` or \`xprivhangup\` to end it!`,
      ephemeral: true
    });
  }

  // 2. Check if already waiting on line
  if (privateWaitingLine && privateWaitingLine.userId === userId) {
    return await interaction.reply({
      content: `🔒 **Dialing in progress...** You are already waiting on the private DM hotline! Waiting for another user to call in...`,
      ephemeral: true
    });
  }

  // 3. Check caller balance ($100 connection fee required)
  const userDoc = await getUserData(userId, guildId);
  if (!hasBalance(userDoc, 100)) {
    const insufficientEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ INSUFFICIENT FUNDS FOR PRIVATE CALL')
      .setDescription(
        `💵 **Connection Fee Required:** **$100** cash\n` +
        `💼 **Your Balance:** **${formatMoney(getBalance(userDoc))}**\n\n` +
        `You need at least **$100** in wallet cash to initiate a Global Private Call! ($10/min while connected)`
      )
      .setFooter({ text: 'Riya Private DM Hotline Engine ☕✨' });

    return await interaction.reply({ embeds: [insufficientEmbed], ephemeral: true });
  }

  // 4. Deduct $100 Connection Fee
  await deductBalance(userDoc, 100);

  // 5. Match with waiting user if available
  if (privateWaitingLine && privateWaitingLine.userId !== userId) {
    const peer = privateWaitingLine;
    privateWaitingLine = null; // Clear waiting line

    const callId = `priv_call_${Date.now()}`;
    const startTime = Date.now();

    // Setup billing interval for User A (peer caller)
    const intervalA = setInterval(async () => {
      try {
        const callerDoc = await getUserData(peer.userId, peer.guildId);
        const success = await deductBalance(callerDoc, 10);
        if (!success) {
          logger.info(`Private call billing failed for user ${peer.userId}`);
          autoHangupPrivateCall(interaction.client, peer.userId, userId, peer.userId);
        }
      } catch (err) {
        logger.error(`Private call billing error for user ${peer.userId}:`, err);
      }
    }, 60000);

    // Setup billing interval for User B (current caller)
    const intervalB = setInterval(async () => {
      try {
        const callerDoc = await getUserData(userId, guildId);
        const success = await deductBalance(callerDoc, 10);
        if (!success) {
          logger.info(`Private call billing failed for user ${userId}`);
          autoHangupPrivateCall(interaction.client, userId, peer.userId, userId);
        }
      } catch (err) {
        logger.error(`Private call billing error for user ${userId}:`, err);
      }
    }, 60000);

    activePrivateCalls.set(userId, {
      peerUserId: peer.userId,
      callId,
      startTime,
      billingInterval: intervalB
    });

    activePrivateCalls.set(peer.userId, {
      peerUserId: userId,
      callId,
      startTime,
      billingInterval: intervalA
    });

    // Send Connection Embeds to both users in DM & channel
    const embedA = new EmbedBuilder()
      .setTitle('🔒 GLOBAL PRIVATE CALL CONNECTED!')
      .setColor('#FF1493')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
      .setDescription(
        `🎉 **Private Line Connected!** You are now connected live in a **1-on-1 Private DM Call** with <@${userId}>!\n\n` +
        `💵 **Fee Deducted:** $100 Connection Fee\n` +
        `⏱️ **Rate:** $10 per minute active billing\n` +
        `💬 **How to talk:** Send text messages or media directly in **Riya Bot's DMs** to talk live privately!\n` +
        `📵 Type \`/globalprivatecall hangup\` or \`xprivhangup\` to end the call.`
      )
      .setFooter({ text: 'Riya Private DM Hotline Engine ☕✨' });

    const embedB = new EmbedBuilder()
      .setTitle('🔒 GLOBAL PRIVATE CALL CONNECTED!')
      .setColor('#FF1493')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
      .setDescription(
        `🎉 **Private Line Connected!** You are now connected live in a **1-on-1 Private DM Call** with <@${peer.userId}>!\n\n` +
        `💵 **Fee Deducted:** $100 Connection Fee\n` +
        `⏱️ **Rate:** $10 per minute active billing\n` +
        `💬 **How to talk:** Send text messages or media directly in **Riya Bot's DMs** to talk live privately!\n` +
        `📵 Type \`/globalprivatecall hangup\` or \`xprivhangup\` to end the call.`
      )
      .setFooter({ text: 'Riya Private DM Hotline Engine ☕✨' });

    // Reply to current caller interaction
    await interaction.reply({ embeds: [embedB], components: [createPrivateCallEndButtonRow()] });

    // Send DMs to both users
    try {
      const userAObj = interaction.client.users.cache.get(peer.userId) ||
        await interaction.client.users.fetch(peer.userId).catch(() => null);
      if (userAObj) await userAObj.send({ embeds: [embedA], components: [createPrivateCallEndButtonRow()] }).catch(() => {});
    } catch (err) {
      logger.warn(`Failed to send private call DM to user A: ${err.message}`);
    }

    try {
      const userBObj = interaction.user;
      if (userBObj) await userBObj.send({ embeds: [embedB], components: [createPrivateCallEndButtonRow()] }).catch(() => {});
    } catch (err) {
      logger.warn(`Failed to send private call DM to user B: ${err.message}`);
    }

    return;
  }

  // 6. No user waiting: Put this user on the waiting line
  privateWaitingLine = {
    userId,
    guildId,
    timestamp: Date.now()
  };

  const dialEmbed = new EmbedBuilder()
    .setTitle('🔒 DIALING PRIVATE HOTLINE...')
    .setColor('#FFD700')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
    .setDescription(
      `☎️ *Ringing...* <@${userId}> is on the private DM phone line!\n\n` +
      `💵 **Connection Fee Paid:** $100 deducted\n` +
      `⏱️ **Billing Rate:** $10/min starts when call connects!\n` +
      `Waiting for another user to dial in to the private hotline...\n` +
      `💡 *Stay tuned! Once connected, all messages in Bot DM will relay live!*`
    )
    .setFooter({ text: 'Riya Private DM Hotline Engine ☕✨' });

  return await interaction.reply({ embeds: [dialEmbed], components: [createPrivateCallEndButtonRow()] });
};

export const hangupGlobalPrivateCall = async (interaction) => {
  const userId = interaction.user.id;

  // If waiting on line, cancel call waiting and refund $100 connection fee
  if (privateWaitingLine && privateWaitingLine.userId === userId) {
    const gId = privateWaitingLine.guildId;
    privateWaitingLine = null;

    try {
      const userDoc = await getUserData(userId, gId);
      await addBalance(userDoc, 100);
    } catch (err) {
      logger.error('Failed to refund connection fee on private call cancel:', err);
    }

    const cancelEmbed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('🔒📵 PRIVATE CALL CANCELLED')
      .setDescription('✅ Cancelled private hotline dialing. You are no longer waiting for a call. **$100 Connection Fee refunded!**');
    return await interaction.reply({ embeds: [cancelEmbed] });
  }

  // If in an active private call
  if (activePrivateCalls.has(userId)) {
    const call = activePrivateCalls.get(userId);
    const peerUserId = call.peerUserId;
    const peerCall = activePrivateCalls.get(peerUserId);

    if (call.billingInterval) clearInterval(call.billingInterval);
    if (peerCall?.billingInterval) clearInterval(peerCall.billingInterval);

    activePrivateCalls.delete(userId);
    activePrivateCalls.delete(peerUserId);

    const hangupEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🔒📵 PRIVATE CALL ENDED')
      .setDescription(`👋 <@${userId}> hung up the phone. Private DM call with <@${peerUserId}> has ended!`);

    await interaction.reply({ embeds: [hangupEmbed] });

    // Notify peer user via DM
    try {
      const peerUserObj = interaction.client.users.cache.get(peerUserId) ||
        await interaction.client.users.fetch(peerUserId).catch(() => null);
      if (peerUserObj) {
        const peerNotice = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🔒📵 PRIVATE CALL ENDED')
          .setDescription(`👋 <@${userId}> hung up the line. The private DM call has ended!`);
        await peerUserObj.send({ embeds: [peerNotice] }).catch(() => {});
      }
    } catch (err) {
      logger.warn(`Failed to send private call hangup DM to peer user: ${err.message}`);
    }

    return;
  }

  return await interaction.reply({
    content: '❌ **No Active Private Call!** You are not currently in a private DM phone call.',
    ephemeral: true
  });
};

export const getPrivateCallStatus = async (interaction) => {
  const userId = interaction.user.id;

  if (activePrivateCalls.has(userId)) {
    const call = activePrivateCalls.get(userId);
    const durationSec = Math.floor((Date.now() - call.startTime) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    const embed = new EmbedBuilder()
      .setTitle('🔒 Active Private DM Call Status')
      .setColor('#FF1493')
      .setDescription(
        `🟢 **Status:** Connected Live in DM\n` +
        `🤝 **Connected User:** <@${call.peerUserId}>\n` +
        `⏱️ **Call Duration:** **${mins}m ${secs}s**\n` +
        `💵 **Active Rate:** $10/min\n\n` +
        `📵 Click **End Call** button below or type \`/globalprivatecall hangup\` to end the call.`
      );
    return await interaction.reply({ embeds: [embed], components: [createPrivateCallEndButtonRow()] });
  }

  if (privateWaitingLine && privateWaitingLine.userId === userId) {
    const embed = new EmbedBuilder()
      .setTitle('🔒 Private Hotline Status')
      .setColor('#FFD700')
      .setDescription('🟡 **Status:** Dialing... Waiting for another user to pick up!');
    return await interaction.reply({ embeds: [embed], components: [createPrivateCallEndButtonRow()] });
  }

  return await interaction.reply({
    content: '🔴 **Status:** Idle. No active private call. Type `/globalprivatecall start` or `xprivatecall` to dial out!',
    ephemeral: true
  });
};

export const handleGlobalPrivateCallRelay = async (message) => {
  try {
    if (message.author.bot) return false;

    // Do NOT relay command messages! Allow prefix/slash commands to process
    const text = (message.content || '').trim().toLowerCase();
    if (
      text.startsWith('/') ||
      text.startsWith('k!') ||
      text.startsWith('xprivhangup') ||
      text.startsWith('xprivatecall') ||
      text.startsWith('xprivcall') ||
      text.startsWith('xhangup') ||
      text.startsWith('xcall') ||
      text.startsWith('xhelp')
    ) {
      return false;
    }

    const userId = message.author.id;
    if (!activePrivateCalls.has(userId)) return false;

    const call = activePrivateCalls.get(userId);

    // Deduplication check
    if (processedPrivateCallMessages.has(message.id)) return true;
    processedPrivateCallMessages.add(message.id);
    if (processedPrivateCallMessages.size > 500) {
      const firstItem = processedPrivateCallMessages.values().next().value;
      processedPrivateCallMessages.delete(firstItem);
    }

    // Build Private Call Relay Embed
    const relayEmbed = new EmbedBuilder()
      .setColor('#FF1493')
      .setAuthor({
        name: `${message.author.username} (${message.author.tag})`,
        iconURL: message.author.displayAvatarURL({ extension: 'png', size: 128 })
      })
      .setDescription(message.content || '*[Media Attachment]*')
      .setFooter({ text: `🔒 Live Private DM Call • User ID: ${message.author.id}` })
      .setTimestamp();

    const imageAttachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
    if (imageAttachment) {
      relayEmbed.setImage(imageAttachment.url);
    }

    // React to origin message with 🔒
    message.react('🔒').catch(() => {});

    // Relay to peer user DM
    try {
      const peerUser = message.client.users.cache.get(call.peerUserId) ||
        await message.client.users.fetch(call.peerUserId).catch(() => null);

      if (peerUser) {
        await peerUser.send({
          content: `💬 **[Private Call from ${message.author.username}]**:`,
          embeds: [relayEmbed]
        });
      }
    } catch (err) {
      logger.warn(`Failed to relay private call DM message: ${err.message}`);
    }

    return true;

  } catch (err) {
    logger.error('Error handling global private call relay:', err);
    return false;
  }
};
