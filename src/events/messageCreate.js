import { getGuildConfig } from '../database/models/GuildConfig.js';
import { getUserData, saveUserData, claimMessageLock } from '../database/models/User.js';
import { calculateSentimentChange, updateMood, getMoodReactionEmoji } from '../services/moodService.js';
import { addXp } from '../services/rpgService.js';
import { generateChatReply } from '../services/aiService.js';
import { transcribeVoiceAttachment, generateTextToSpeech } from '../services/voiceService.js';
import { triggerRandomEvent } from '../utils/randomEvents.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

import { addBalance, formatMoney } from '../services/economyService.js';
import { addFriendXp } from '../services/friendService.js';
import { handlePrefixCommand } from '../utils/prefixAdapter.js';
import { handleGlobalChatBroadcast } from '../services/globalChatService.js';
import { handleGlobalCallRelay } from '../services/globalCallService.js';
import { handleGlobalPrivateCallRelay } from '../services/globalPrivateCallService.js';
import { handleAutoDownloadMessage } from '../services/mediaDownloadService.js';

export const name = 'messageCreate';

// In-memory set to prevent double replies to the same message
const processedMessages = new Set();

export const execute = async (message) => {
  // 1. Ignore all messages sent by bots
  if (message.author.bot) return;

  // Deduplication Check: Prevent double reply to the same message ID
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);

  // Distributed atomic claim check across processes
  const lockAcquired = await claimMessageLock(message.id);
  if (!lockAcquired) {
    logger.info(`[DEDUP] Message ${message.id} already claimed by another bot process. Aborting duplicate.`);
    return;
  }

  // Keep cache lightweight (max 500 recent message IDs)
  if (processedMessages.size > 500) {
    const firstItem = processedMessages.values().next().value;
    processedMessages.delete(firstItem);
  }

  // 1b. Global Private Call DM Relay Check
  const isPrivateCallRelay = await handleGlobalPrivateCallRelay(message);
  if (isPrivateCallRelay) return;

  // 2. Global Call Hotline Live Bridge Check
  const isCallRelay = await handleGlobalCallRelay(message);
  if (isCallRelay) return;

  // 3. Global Chat Inter-Server Broadcast Check
  const isGlobalBroadcast = await handleGlobalChatBroadcast(message);
  if (isGlobalBroadcast) return;

  // 4. Media Auto-Downloader Check (Instagram, YouTube, TikTok in configured channel)
  const isAutoDownload = await handleAutoDownloadMessage(message);
  if (isAutoDownload) return;

  // 5. Process Prefix Commands (e.g. xhelp, xdaily, xcard_drop, xbank_balance, k!help, etc.)
  const isPrefixCmd = await handlePrefixCommand(message);
  if (isPrefixCmd) return;

  const isDM = !message.guild;
  let isBoundChannel = false;
  if (!isDM) {
    const guildConfig = await getGuildConfig(message.guildId);
    isBoundChannel = guildConfig.boundChannelId && guildConfig.boundChannelId === message.channel.id;
  }
  const isMentioned = message.mentions.has(message.client.user.id);

  // If in guild: only reply if in bound channel or mentioned. If in DM: always reply directly!
  if (!isDM && !isBoundChannel && !isMentioned) return;

  try {
    const userDoc = await getUserData(message.author.id, message.guildId || 'dm');

    // 2. Sentiment Analysis & Dynamic Mood Shift
    const sentimentDelta = calculateSentimentChange(message.content);
    const updatedMoodState = updateMood(userDoc, sentimentDelta);

    // 3. React to every single message in bound channel or DM with mood emoji
    if (isBoundChannel || isDM) {
      const emoji = getMoodReactionEmoji(updatedMoodState, message.content);
      await message.react(emoji).catch(err => logger.debug(`Failed to react with emoji: ${err.message}`));
    }

    // Check for Greetings bonus (+30 XP & +$500 Cash)
    const lowerContent = message.content.toLowerCase();
    const isGreeting = lowerContent.includes('good morning') || lowerContent.includes('good afternoon') || lowerContent.includes('good night') || lowerContent.includes('good evening');
    const xpEarned = isGreeting ? 40 : 10;
    const cashDrop = isGreeting ? 500 : Math.floor(Math.random() * 250) + 50;

    await addBalance(userDoc, cashDrop);

    // 4. Grant Affection XP & Level Check
    const xpResult = addXp(userDoc, xpEarned);
    if (xpResult.leveledUp) {
      const LEVEL_UP_BONUS = 10000;
      await addBalance(userDoc, LEVEL_UP_BONUS);
      message.channel.send(`🎊 **LEVEL UP!** <@${message.author.id}>, your relationship with Riya grew to **Level ${xpResult.newLevel}**! You earned a **+$10,000 Bank Balance Bonus**! 💸💕`).catch(() => {});
    }

    // 4b. Friend Emoji Relationship Leveling Check
    const mentionedUsers = message.mentions.users.filter(u => !u.bot && u.id !== message.author.id);
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message.content);
    if (mentionedUsers.size > 0 && hasEmojis && userDoc.friends) {
      for (const [targetId, targetUser] of mentionedUsers) {
        if (userDoc.friends[targetId]) {
          const targetDoc = await getUserData(targetId, message.guildId || 'dm');
          await addFriendXp(userDoc, targetDoc, 15);
        }
      }
    }

    // 5. Daily Task Auto-Completion Check
    if (userDoc.currentDailyTask && !userDoc.currentDailyTask.completed) {
      const text = message.content.toLowerCase();
      let taskCompleted = false;

      if (userDoc.currentDailyTask.id === 'greet' && (text.includes('good morning') || text.includes('goodnight') || text.includes('kem chhe') || text.includes('su chale chhe'))) {
        taskCompleted = true;
      } else if (userDoc.currentDailyTask.id === 'compliment' && (text.includes('pretty') || text.includes('cute') || text.includes('beautiful') || text.includes('love you'))) {
        taskCompleted = true;
      }

      if (taskCompleted) {
        userDoc.currentDailyTask.completed = true;
        addXp(userDoc, userDoc.currentDailyTask.xpReward);
        message.channel.send(`✅ **Daily Task Completed!** <@${message.author.id}> earned **+${userDoc.currentDailyTask.xpReward} XP** for completing today's task! 🌟`).catch(() => {});
      }
    }

    await saveUserData(userDoc);

    // 6. Handle Voice Messages (Audio attachments)
    const audioAttachment = message.attachments.find(att =>
      att.contentType?.startsWith('audio/') ||
      att.name?.endsWith('.ogg') ||
      att.name?.endsWith('.mp3') ||
      att.name?.endsWith('.wav') ||
      att.name?.endsWith('.m4a')
    );

    if (audioAttachment) {
      await message.channel.sendTyping().catch(() => {});
      try {
        const transcribedText = await transcribeVoiceAttachment(audioAttachment.url);
        message.reply(`🎤 *[Voice Transcription]* "${transcribedText}"`).catch(() => {});

        const aiTextReply = await generateChatReply(message.member?.displayName || message.author.username, transcribedText, userDoc);
        await saveUserData(userDoc);

        const ttsAudio = await generateTextToSpeech(aiTextReply);

        if (ttsAudio) {
          await message.reply({ content: aiTextReply, files: [ttsAudio] });
        } else {
          await message.reply(aiTextReply);
        }
        return;
      } catch (voiceErr) {
        logger.error('Voice processing error:', voiceErr);
        await message.reply("Arey thodi technical issue aavi gayi baka! Wait kar thodi vaar... 🥺");
        return;
      }
    }

    // 7. Clean User Input: strip bot mention regex
    let cleanUserText = message.content.replace(/<@!?\d+>/g, '').trim();

    // If message is completely empty after stripping mention, reply with default greeting
    if (!cleanUserText) {
      cleanUserText = "Kem chhe, Baka! Su chale chhe?";
    }

    // 8. Trigger Discord Typing Indicator and Reply with Gemini AI Response
    await message.channel.sendTyping().catch(() => {});

    try {
      const aiReply = await generateChatReply(message.member?.displayName || message.author.username, cleanUserText, userDoc);
      await saveUserData(userDoc);
      await message.reply(aiReply);
    } catch (aiErr) {
      logger.error('AI generation error:', aiErr);
      await message.reply("Arey thodi technical issue aavi gayi baka! Wait kar thodi vaar... 🥺");
    }

    // 9. Spontaneous Random Event Trigger (5% chance in bound channel)
    if (isBoundChannel && Math.random() < config.randomEventChance) {
      setTimeout(() => {
        triggerRandomEvent(message.channel);
      }, 5000);
    }

  } catch (error) {
    logger.error('Error handling messageCreate event:', error);
    await message.reply("Arey thodi technical issue aavi gayi baka! Wait kar thodi vaar... 🥺").catch(() => {});
  }
};
