import { EmbedBuilder } from 'discord.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import { getDb } from '../database/connect.js';
import { logger } from '../utils/logger.js';

// In-memory cache to prevent duplicate welcome greetings (30-second debounce per member)
const welcomedMembersCache = new Map();
const DEBOUNCE_WINDOW_MS = 30000;

export const registerWelcomeDebounce = (guildId, memberId) => {
  if (guildId && memberId) {
    welcomedMembersCache.set(`${guildId}_${memberId}`, Date.now());
  }
};

/**
 * Distributed multi-instance lock checker using Firestore
 * Ensures that if multiple bot instances (cloud and local) are running simultaneously,
 * only the FIRST instance to acquire the lock will send the greeting.
 */
const acquireDistributedWelcomeLock = async (guildId, memberId) => {
  try {
    const db = getDb();
    if (!db) return true; // Fallback to memory debounce if db offline

    const lockId = `${guildId}_${memberId}`;
    const lockRef = doc(db, 'welcome_locks', lockId);
    const snap = await getDoc(lockRef);
    const now = Date.now();

    if (snap.exists()) {
      const data = snap.data();
      const lastSent = data.timestamp || 0;
      if (now - lastSent < DEBOUNCE_WINDOW_MS) {
        return false; // Lock already held by another instance
      }
    }

    await setDoc(lockRef, {
      guildId,
      memberId,
      timestamp: now,
      senderInstance: process.pid || 'cloud'
    }, { merge: true });

    return true;
  } catch (err) {
    logger.warn(`Distributed welcome lock error: ${err.message}`);
    return true; // Fallback to allowing send if error
  }
};

export const VIP_ARMY_WELCOME_MESSAGE = 
`👑 **Welcome to the VIP ARMY, {mention}!** 👑

Aap bane ho hamare **#{membercount}th** VIP member! Yahan **VIP BHAI** aur poori gaming squad ke saath full masti aur gameplay chalega. 🎮🔥

🚀 **Next Steps:**
1. Pehle <#1560893777957363754> padh lo taaki koi issue na ho.
2. <#1560893783342850139> me jakar click karo aur server access unlock karo.
3. <#1560893791240458294> me apne favorite games (Minecraft, BGMI, GTA) select karo.
4. <#1560893846865313832> me aao aur squad ko "Hello Bhai" bolo!

Mauj lo aur masti karte raho! ❤️`;

export const VIP_ARMY_WELCOME_BANNER = 'https://images-ext-2.discordapp.net/external/ZAfpoUlqyvnZM6eS0iYSu3AoadzJ7p_GhqWxCz8-AUc/https/c.tenor.com/tqVFCM6tIyMAAAAC/welcome-hello.gif';

/**
 * Master dispatcher to send welcome message on member join
 * Formats customized greeting string and dispatches single clean embed
 */
export const sendWelcomeMessage = async (member) => {
  if (!member || !member.guild) return false;

  // 🛡️ 1. Local In-Memory Debounce Protection
  const cacheKey = `${member.guild.id}_${member.id}`;
  const now = Date.now();
  if (welcomedMembersCache.has(cacheKey)) {
    const lastWelcomed = welcomedMembersCache.get(cacheKey);
    if (now - lastWelcomed < DEBOUNCE_WINDOW_MS) {
      logger.warn(`Duplicate welcome prevented in-memory for member ${member.id} in guild ${member.guild.id} (last sent ${Math.round((now - lastWelcomed) / 1000)}s ago)`);
      return false;
    }
  }
  welcomedMembersCache.set(cacheKey, now);

  // 🛡️ 2. Cross-Instance Distributed Firestore Lock (Multi-Process / Cloud + Local Protection)
  const lockAcquired = await acquireDistributedWelcomeLock(member.guild.id, member.id);
  if (!lockAcquired) {
    logger.warn(`Duplicate welcome prevented by distributed lock for member ${member.id} in guild ${member.guild.id}`);
    return false;
  }

  // Periodically clean cache entries older than 5 minutes
  if (welcomedMembersCache.size > 500) {
    for (const [key, timestamp] of welcomedMembersCache.entries()) {
      if (now - timestamp > 300000) {
        welcomedMembersCache.delete(key);
      }
    }
  }

  const guildConfig = await getGuildConfig(member.guild.id);
  if (!guildConfig.welcomeChannelId || guildConfig.welcomeEnabled === false) {
    return false;
  }

  const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
  if (!channel || !channel.isTextBased()) {
    logger.warn(`Welcome channel ${guildConfig.welcomeChannelId} not found or not text-based.`);
    return false;
  }

  const botMember = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
  const perms = channel.permissionsFor(botMember);
  if (!perms || !perms.has('SendMessages') || !perms.has('EmbedLinks')) {
    logger.warn(`Bot lacks SendMessages or EmbedLinks permission in welcome channel ${channel.id}`);
    return false;
  }

  try {
    const rawMsg = guildConfig.welcomeMessage || (guildConfig.welcomeTemplate === 'vip_army' ? VIP_ARMY_WELCOME_MESSAGE : 'Welcome {user} to the {server} matrix!');
    const formattedMsg = rawMsg
      .replace(/{user}/gi, member.toString())
      .replace(/{mention}/gi, member.toString())
      .replace(/{server}/gi, member.guild.name)
      .replace(/{member_count}/gi, member.guild.memberCount.toString())
      .replace(/{membercount}/gi, member.guild.memberCount.toString());

    let embed;
    if (guildConfig.welcomeTemplate === 'vip_army') {
      embed = new EmbedBuilder()
        .setDescription(formattedMsg)
        .setColor(guildConfig.welcomeColor || '#FF2E4D')
        .setThumbnail(member.user?.displayAvatarURL?.({ dynamic: true }) || null);

      const bannerUrl = guildConfig.welcomeBannerUrl || VIP_ARMY_WELCOME_BANNER;
      if (bannerUrl) {
        embed.setImage(bannerUrl);
      }
    } else {
      const accountAge = member.user?.createdAt ? member.user.createdAt.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }) : 'Unknown';

      embed = new EmbedBuilder()
        .setTitle('✨ New Connection Established')
        .setDescription(formattedMsg)
        .setColor(guildConfig.welcomeColor || 0x9b59b6)
        .setThumbnail(member.user?.displayAvatarURL?.({ dynamic: true }) || null)
        .addFields(
          { name: 'Account Age Identity', value: accountAge, inline: true },
          { name: 'Guild Member Count', value: `\`${member.guild.memberCount}\` Total`, inline: true }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();

      if (guildConfig.welcomeBannerUrl) {
        embed.setImage(guildConfig.welcomeBannerUrl);
      }
    }

    await channel.send({ embeds: [embed] });
    logger.info(`Sent onboarding welcome greeting for member ${member.user?.tag || member.id} in guild ${member.guild.name}`);

    // 2. Second Follow-Up Message (Only if specifically configured in /welcome second_message)
    if (guildConfig.welcomeSecondMessageEnabled && guildConfig.welcomeSecondMessage) {
      const rawSecond = guildConfig.welcomeSecondMessage;
      const formattedSecond = rawSecond
        .replace(/{user}/gi, member.toString())
        .replace(/{mention}/gi, member.toString())
        .replace(/{server}/gi, member.guild.name)
        .replace(/{member_count}/gi, member.guild.memberCount.toString())
        .replace(/{membercount}/gi, member.guild.memberCount.toString());

      try {
        if (guildConfig.welcomeSecondMessageAsEmbed) {
          const secondEmbed = new EmbedBuilder()
            .setDescription(formattedSecond)
            .setColor(0xffd700);
          await channel.send({ embeds: [secondEmbed] });
        } else {
          await channel.send({ content: formattedSecond });
        }
      } catch (err) {
        logger.warn(`Failed to send second welcome message: ${err.message}`);
      }
    }

    // 3. Direct Message Delivery (Only if specifically enabled in /welcome message send_dm: True)
    if (guildConfig.welcomeSendDm) {
      try {
        let dmEmbed;
        if (guildConfig.welcomeTemplate === 'vip_army') {
          dmEmbed = new EmbedBuilder()
            .setDescription(formattedMsg)
            .setColor(guildConfig.welcomeColor || '#FF2E4D')
            .setThumbnail(member.guild.iconURL?.({ dynamic: true }) || member.user?.displayAvatarURL?.({ dynamic: true }) || null);

          const bannerUrl = guildConfig.welcomeBannerUrl || VIP_ARMY_WELCOME_BANNER;
          if (bannerUrl) {
            dmEmbed.setImage(bannerUrl);
          }
        } else {
          dmEmbed = new EmbedBuilder()
            .setTitle(`✨ Welcome to ${member.guild.name}!`)
            .setDescription(formattedMsg)
            .setColor(0x9b59b6)
            .setThumbnail(member.guild.iconURL?.({ dynamic: true }) || member.user?.displayAvatarURL?.({ dynamic: true }) || null)
            .setFooter({ text: `Onboarding Portal • ${member.guild.name}` })
            .setTimestamp();

          if (guildConfig.welcomeBannerUrl) {
            dmEmbed.setImage(guildConfig.welcomeBannerUrl);
          }
        }

        await member.send({ embeds: [dmEmbed] });
      } catch (dmErr) {
        logger.warn(`Could not send welcome DM to member ${member.id}: ${dmErr.message}`);
      }
    }

    return true;
  } catch (err) {
    logger.error(`Error sending welcome message in guild ${member.guild.id}: ${err.message}`);
    return false;
  }
};

/**
 * Handle interactive button clicks for legacy Welcome buttons if clicked
 */
export const handleWelcomeButton = async (interaction) => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.reply({
      content: 'ℹ️ This button action is no longer active. Welcome settings are managed via `/welcome`.',
      ephemeral: true
    }).catch(() => {});
  }
};
