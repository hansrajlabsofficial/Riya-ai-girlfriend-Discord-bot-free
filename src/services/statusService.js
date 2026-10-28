import { ActivityType } from 'discord.js';
import { getAll247StatusChannels, getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { buildStatusEmbed } from '../commands/status.js';
import { logger } from '../utils/logger.js';

let statusInterval = null;
let presenceInterval = null;

export const startRotatingPresence = (client, intervalMs = 12000) => {
  if (presenceInterval) clearInterval(presenceInterval);
  let currentIndex = 0;

  const updatePresence = () => {
    try {
      if (!client.user) return;

      const serverCount = client.guilds.cache.size || 1;

      // Calculate live uptime
      const totalSeconds = Math.floor(process.uptime());
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let uptimeStr = '';
      if (days > 0) uptimeStr += `${days}d `;
      if (hours > 0 || days > 0) uptimeStr += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) uptimeStr += `${minutes}m `;
      uptimeStr += `${seconds}s`;

      const statuses = [
        {
          text: `Connected to ${serverCount} Servers`,
          type: ActivityType.Custom
        },
        {
          text: `Developed by HANSRAJ`,
          type: ActivityType.Custom
        },
        {
          text: `Online: ${uptimeStr.trim()}`,
          type: ActivityType.Custom
        },
        {
          text: `Use /help for all available commands`,
          type: ActivityType.Custom
        }
      ];

      const current = statuses[currentIndex % statuses.length];
      client.user.setPresence({
        activities: [{
          name: current.text,
          state: current.text,
          type: current.type
        }],
        status: 'online'
      });

      currentIndex++;
    } catch (err) {
      logger.warn(`Failed to update rotating presence: ${err.message}`);
    }
  };

  updatePresence();
  presenceInterval = setInterval(updatePresence, intervalMs);
  logger.info(`Started rotating bot activity presence every ${intervalMs / 1000}s! 🔁`);
};

export const start247StatusAutoUpdater = (client) => {
  if (statusInterval) clearInterval(statusInterval);

  // Also initiate rotating activity presence
  startRotatingPresence(client, 12000);

  logger.info('Starting 24/7 Live Status Channel Auto-Updater service...');

  const runUpdateCycle = async () => {
    try {
      const activeChannels = await getAll247StatusChannels();
      if (!activeChannels || activeChannels.length === 0) return;

      const statusData = buildStatusEmbed(client);

      for (const item of activeChannels) {
        const { guildId, channelId, messageId } = item;
        try {
          const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
          if (!channel || !channel.isTextBased()) continue;

          let targetMsg = null;
          if (messageId) {
            targetMsg = await channel.messages.fetch(messageId).catch(() => null);
          }

          if (targetMsg) {
            await targetMsg.edit(statusData).catch(() => null);
          } else {
            const newMsg = await channel.send(statusData).catch(() => null);
            if (newMsg) {
              const guildConfig = await getGuildConfig(guildId);
              guildConfig.statusMessageId = newMsg.id;
              await saveGuildConfig(guildConfig);
            }
          }
        } catch (err) {
          logger.debug(`24/7 Status update failed for guild ${guildId}: ${err.message}`);
        }
      }
    } catch (e) {
      logger.warn(`Error in 24/7 status update cycle: ${e.message}`);
    }
  };

  runUpdateCycle();
  statusInterval = setInterval(runUpdateCycle, 30000);
};
