import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, hasBalance, deductBalance, addBalance, formatMoney } from './economyService.js';

export const createCallEndButtonRow = () => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_globalcall_end')
      .setLabel('📵 End Call')
      .setStyle(ButtonStyle.Danger)
  );
};

// Global Call State Store
let waitingLine = null; // { guildId, channelId, userId, guildName, timestamp }
const activeCalls = new Map(); // guildId -> { peerGuildId, peerChannelId, peerGuildName, channelId, callId, startTime, callerUserId, billingInterval }

/**
 * Auto-hangup call when a caller runs out of funds
 */
const autoHangupCall = async (client, guildId, peerGuildId, reason, failedUserId) => {
  const callA = activeCalls.get(guildId);
  const callB = activeCalls.get(peerGuildId);

  if (callA?.billingInterval) clearInterval(callA.billingInterval);
  if (callB?.billingInterval) clearInterval(callB.billingInterval);

  activeCalls.delete(guildId);
  activeCalls.delete(peerGuildId);

  const autoHangupEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('📵 GLOBAL CALL DISCONNECTED')
    .setDescription(
      `💸 **Call Terminated!** <@${failedUserId}> ran out of wallet cash ($10/min rate required to stay connected).\n` +
      `The global hotline connection has automatically closed.`
    )
    .setFooter({ text: 'Riya Inter-Server Hotline Engine ☕✨' });

  // Send to Guild A channel
  if (callA?.channelId) {
    try {
      const channelA = client.channels.cache.get(callA.channelId) ||
        await client.channels.fetch(callA.channelId).catch(() => null);
      if (channelA) await channelA.send({ embeds: [autoHangupEmbed] });
    } catch (err) {
      logger.warn(`Failed to send auto-hangup to channel A: ${err.message}`);
    }
  }

  // Send to Guild B channel
  if (callA?.peerChannelId) {
    try {
      const channelB = client.channels.cache.get(callA.peerChannelId) ||
        await client.channels.fetch(callA.peerChannelId).catch(() => null);
      if (channelB) await channelB.send({ embeds: [autoHangupEmbed] });
    } catch (err) {
      logger.warn(`Failed to send auto-hangup to channel B: ${err.message}`);
    }
  }
};

/**
 * Start or Match a Global Call
 */
export const startGlobalCall = async (interaction) => {
  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  const guildName = interaction.guild.name;
  const userId = interaction.user.id;

  // 1. Check if already in an active call
  if (activeCalls.has(guildId)) {
    const active = activeCalls.get(guildId);
    return await interaction.reply({
      content: `📞 **Already in a Call!** Your server is currently connected to **${active.peerGuildName}**! Type \`/globalcall hangup\` or \`xhangup\` to end it!`,
      ephemeral: true
    });
  }

  // 2. Check if already waiting on line
  if (waitingLine && waitingLine.guildId === guildId) {
    return await interaction.reply({
      content: `📞 **Dialing in progress...** Your server is already waiting on the global hotline line! Waiting for another server to answer...`,
      ephemeral: true
    });
  }

  // 3. Check caller balance ($100 connection fee required)
  const userDoc = await getUserData(userId, guildId);
  if (!hasBalance(userDoc, 100)) {
    const insufficientEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ INSUFFICIENT FUNDS FOR CALL')
      .setDescription(
        `💵 **Connection Fee Required:** **$100** cash\n` +
        `💼 **Your Balance:** **${formatMoney(getBalance(userDoc))}**\n\n` +
        `You need at least **$100** in wallet cash to initiate a Global Call! ($10/min while connected)`
      )
      .setFooter({ text: 'Riya Inter-Server Hotline Engine ☕✨' });

    return await interaction.reply({ embeds: [insufficientEmbed], ephemeral: true });
  }

  // 4. Deduct $100 Connection Fee
  await deductBalance(userDoc, 100);

  // 5. Match with waiting server if available
  if (waitingLine && waitingLine.guildId !== guildId) {
    const peer = waitingLine;
    waitingLine = null; // Clear waiting line

    const callId = `call_${Date.now()}`;
    const startTime = Date.now();

    // Setup billing interval for Guild A (peer caller)
    const intervalA = setInterval(async () => {
      try {
        const callerDoc = await getUserData(peer.userId, peer.guildId);
        const success = await deductBalance(callerDoc, 10);
        if (!success) {
          logger.info(`Global call billing failed for user ${peer.userId}`);
          autoHangupCall(interaction.client, peer.guildId, guildId, 'insufficient_funds', peer.userId);
        }
      } catch (err) {
        logger.error(`Call billing error for guild ${peer.guildId}:`, err);
      }
    }, 60000);

    // Setup billing interval for Guild B (current caller)
    const intervalB = setInterval(async () => {
      try {
        const callerDoc = await getUserData(userId, guildId);
        const success = await deductBalance(callerDoc, 10);
        if (!success) {
          logger.info(`Global call billing failed for user ${userId}`);
          autoHangupCall(interaction.client, guildId, peer.guildId, 'insufficient_funds', userId);
        }
      } catch (err) {
        logger.error(`Call billing error for guild ${guildId}:`, err);
      }
    }, 60000);

    activeCalls.set(guildId, {
      peerGuildId: peer.guildId,
      peerChannelId: peer.channelId,
      peerGuildName: peer.guildName,
      channelId,
      callId,
      startTime,
      callerUserId: userId,
      billingInterval: intervalB
    });

    activeCalls.set(peer.guildId, {
      peerGuildId: guildId,
      peerChannelId: channelId,
      peerGuildName: guildName,
      channelId: peer.channelId,
      callId,
      startTime,
      callerUserId: peer.userId,
      billingInterval: intervalA
    });

    // Send Connection Embeds to both channels
    const embedA = new EmbedBuilder()
      .setTitle('📞 GLOBAL CALL CONNECTED!')
      .setColor('#00FF7F')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
      .setDescription(
        `🎉 **Line Connected!** You are now connected live to **${peer.guildName}**!\n\n` +
        `💵 **Fee Deducted:** $100 Connection Fee\n` +
        `⏱️ **Rate:** $10 per minute active billing\n` +
        `💬 **How to talk:** Type messages or upload images in this channel to talk live across servers!\n` +
        `📵 Type \`/globalcall hangup\` or \`xhangup\` to end the call.`
      )
      .setFooter({ text: 'Riya Inter-Server Hotline Engine ☕✨' });

    const embedB = new EmbedBuilder()
      .setTitle('📞 GLOBAL CALL CONNECTED!')
      .setColor('#00FF7F')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
      .setDescription(
        `🎉 **Line Connected!** You are now connected live to **${guildName}**!\n\n` +
        `💵 **Fee Deducted:** $100 Connection Fee\n` +
        `⏱️ **Rate:** $10 per minute active billing\n` +
        `💬 **How to talk:** Type messages or upload images in this channel to talk live across servers!\n` +
        `📵 Type \`/globalcall hangup\` or \`xhangup\` to end the call.`
      )
      .setFooter({ text: 'Riya Inter-Server Hotline Engine ☕✨' });

    // Reply to current caller
    await interaction.reply({ embeds: [embedA], components: [createCallEndButtonRow()] });

    // Send connection notice to peer channel
    try {
      const peerChannel = interaction.client.channels.cache.get(peer.channelId) ||
        await interaction.client.channels.fetch(peer.channelId).catch(() => null);
      if (peerChannel) {
        await peerChannel.send({ embeds: [embedB], components: [createCallEndButtonRow()] });
      }
    } catch (err) {
      logger.warn(`Failed to send call connected embed to peer channel: ${err.message}`);
    }

    return;
  }

  // 6. No server waiting: Put this server on the waiting line
  waitingLine = {
    guildId,
    channelId,
    userId,
    guildName,
    timestamp: Date.now()
  };

  const dialEmbed = new EmbedBuilder()
    .setTitle('📞 DIALING GLOBAL HOTLINE...')
    .setColor('#FFD700')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3059/3059502.png')
    .setDescription(
      `☎️ *Ringing...* **${guildName}** is on the global phone line!\n\n` +
      `💵 **Connection Fee Paid:** $100 deducted from <@${userId}>\n` +
      `⏱️ **Billing Rate:** $10/min starts when call connects!\n` +
      `Waiting for another Discord server to dial in and pick up the call...\n` +
      `💡 *Stay tuned! As soon as another server calls, the line will connect automatically!*`
    )
    .setFooter({ text: 'Riya Inter-Server Hotline Engine ☕✨' });

  return await interaction.reply({ embeds: [dialEmbed], components: [createCallEndButtonRow()] });
};

export const hangupGlobalCall = async (interaction) => {
  const guildId = interaction.guildId;

  // If waiting on line, cancel call waiting and refund $100 connection fee
  if (waitingLine && waitingLine.guildId === guildId) {
    const callerId = waitingLine.userId;
    waitingLine = null;

    try {
      const userDoc = await getUserData(callerId, guildId);
      await addBalance(userDoc, 100);
    } catch (err) {
      logger.error('Failed to refund connection fee on call cancel:', err);
    }

    const cancelEmbed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('📵 CALL CANCELLED')
      .setDescription('✅ Cancelled hotline dialing. Your server is no longer waiting for a call. **$100 Connection Fee refunded!**');
    return await interaction.reply({ embeds: [cancelEmbed] });
  }

  // If in an active call
  if (activeCalls.has(guildId)) {
    const call = activeCalls.get(guildId);
    const peerGuildId = call.peerGuildId;
    const peerChannelId = call.peerChannelId;
    const peerGuildName = call.peerGuildName;

    const peerCall = activeCalls.get(peerGuildId);

    if (call.billingInterval) clearInterval(call.billingInterval);
    if (peerCall?.billingInterval) clearInterval(peerCall.billingInterval);

    activeCalls.delete(guildId);
    activeCalls.delete(peerGuildId);

    const hangupEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('📵 GLOBAL CALL ENDED')
      .setDescription(`👋 <@${interaction.user.id}> hung up the phone. Call with **${peerGuildName}** has ended!`);

    await interaction.reply({ embeds: [hangupEmbed] });

    // Notify peer channel
    try {
      const peerChannel = interaction.client.channels.cache.get(peerChannelId) ||
        await interaction.client.channels.fetch(peerChannelId).catch(() => null);
      if (peerChannel) {
        const peerNotice = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('📵 GLOBAL CALL ENDED')
          .setDescription(`👋 The line was hung up by **${interaction.guild.name}**. The global call has ended!`);
        await peerChannel.send({ embeds: [peerNotice] });
      }
    } catch (err) {
      logger.warn(`Failed to send call hangup embed to peer channel: ${err.message}`);
    }

    return;
  }

  return await interaction.reply({
    content: '❌ **No Active Call!** Your server is not currently in a global phone call.',
    ephemeral: true
  });
};

export const getCallStatus = async (interaction) => {
  const guildId = interaction.guildId;

  if (activeCalls.has(guildId)) {
    const call = activeCalls.get(guildId);
    const durationSec = Math.floor((Date.now() - call.startTime) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    const embed = new EmbedBuilder()
      .setTitle('📞 Active Global Call Status')
      .setColor('#00FF7F')
      .setDescription(
        `🟢 **Status:** Connected Live\n` +
        `🤝 **Connected Server:** **${call.peerGuildName}**\n` +
        `⏱️ **Call Duration:** **${mins}m ${secs}s**\n` +
        `💵 **Active Rate:** $10/min\n\n` +
        `📵 Click **End Call** button below or type \`/globalcall hangup\` to end the call.`
      );
    return await interaction.reply({ embeds: [embed], components: [createCallEndButtonRow()] });
  }

  if (waitingLine && waitingLine.guildId === guildId) {
    const embed = new EmbedBuilder()
      .setTitle('📞 Global Hotline Status')
      .setColor('#FFD700')
      .setDescription('🟡 **Status:** Dialing... Waiting for another server to pick up!');
    return await interaction.reply({ embeds: [embed], components: [createCallEndButtonRow()] });
  }

  return await interaction.reply({
    content: '🔴 **Status:** Idle. No active global call. Type `/globalcall start` or `xcall` to dial out!',
    ephemeral: true
  });
};

// Deduplication set for call messages
const processedCallMessages = new Set();

export const handleGlobalCallRelay = async (message) => {
  try {
    if (message.author.bot || !message.guild) return false;

    const guildId = message.guild.id;
    if (!activeCalls.has(guildId)) return false;

    const call = activeCalls.get(guildId);

    // Verify message is in the connected call channel
    if (call.channelId && message.channel.id !== call.channelId) return false;

    // Do NOT relay back to the same origin channel
    if (call.peerChannelId === message.channel.id) return false;

    // Deduplication check
    if (processedCallMessages.has(message.id)) return true;
    processedCallMessages.add(message.id);
    if (processedCallMessages.size > 500) {
      const firstItem = processedCallMessages.values().next().value;
      processedCallMessages.delete(firstItem);
    }

    // Build Call Relay Embed
    const relayEmbed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setAuthor({
        name: `${message.author.username} (${message.guild.name})`,
        iconURL: message.author.displayAvatarURL({ extension: 'png', size: 128 })
      })
      .setDescription(message.content || '*[Media Attachment]*')
      .setFooter({ text: `📞 Live Call • ${message.guild.name}` })
      .setTimestamp();

    const imageAttachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
    if (imageAttachment) {
      relayEmbed.setImage(imageAttachment.url);
    }

    // React to origin message with 📞
    message.react('📞').catch(() => {});

    // Relay to peer channel
    try {
      const peerChannel = message.client.channels.cache.get(call.peerChannelId) ||
        await message.client.channels.fetch(call.peerChannelId).catch(() => null);

      if (peerChannel) {
        await peerChannel.send({ embeds: [relayEmbed] });
      }
    } catch (err) {
      logger.warn(`Failed to relay call message: ${err.message}`);
    }

    return true;

  } catch (err) {
    logger.error('Error handling global call relay:', err);
    return false;
  }
};
