import axios from 'axios';
import { logger } from '../utils/logger.js';
import { loadAllCommands } from '../utils/commandLoader.js';

let keepAliveInterval = null;
let lastPingTime = null;
let lastPingLatency = null;
let commandCountCache = 100;

// Pre-load command count
(async () => {
  try {
    const { commandsJSON } = await loadAllCommands();
    if (commandsJSON && commandsJSON.length > 0) {
      commandCountCache = commandsJSON.length;
    }
  } catch (e) {
    commandCountCache = 100;
  }
})();

/**
 * Format uptime seconds into human-readable string (e.g., "2d 4h 15m 32s")
 */
export const formatUptime = (totalSeconds) => {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
};

/**
 * Get comprehensive health status for monitoring services (UptimeRobot, Cloud Hosts, etc.)
 */
export const getHealthData = async (client) => {
  try {
    const uptimeSec = Math.floor(process.uptime() || 0);
    const mem = process.memoryUsage();
    const isDiscordReady = Boolean(client && client.isReady && client.isReady());
    const guildCount = client?.guilds?.cache?.size || 0;
    const wsPing = client?.ws?.ping !== undefined && client.ws.ping >= 0 ? client.ws.ping : null;

    return {
      status: 'healthy',
      bot: {
        name: 'Riya AI Girlfriend',
        tag: client?.user?.tag || 'Riya#0000',
        id: client?.user?.id || '1479052475368607926',
        ready: isDiscordReady,
        wsPingMs: wsPing,
        guildsConnected: guildCount,
        commandsAvailable: commandCountCache
      },
      uptime: {
        seconds: uptimeSec,
        formatted: formatUptime(uptimeSec),
        startedAt: new Date(Date.now() - uptimeSec * 1000).toISOString()
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryMB: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
        }
      },
      keepAlive: {
        lastSelfPing: lastPingTime,
        lastLatencyMs: lastPingLatency
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'degraded',
      error: err.message,
      uptime: {
        seconds: Math.floor(process.uptime() || 0),
        formatted: formatUptime(Math.floor(process.uptime() || 0))
      },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Automatically ping the bot's health check URL every 4 minutes
 * to prevent cloud hosting platforms from sleeping.
 */
export const startUptimeKeepAlive = (client, port = 3000) => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  // Check possible external URLs configured in environment variables
  const targetUrl = process.env.APP_URL || 
                    process.env.PROJECT_URL || 
                    process.env.RENDER_EXTERNAL_URL || 
                    process.env.SERVICE_URL || 
                    process.env.SERVER_URL;

  if (targetUrl) {
    const cleanUrl = targetUrl.replace(/\/+$/, '');
    const pingEndpoint = `${cleanUrl}/health`;

    logger.info(`🌐 [Uptime Keep-Alive] Active! Auto-pinging ${pingEndpoint} every 4 minutes to guarantee 24/7 uptime.`);

    // Initial ping after 30 seconds
    setTimeout(() => pingHealth(pingEndpoint), 30000);

    // Recurring ping every 4 minutes (240,000 ms)
    keepAliveInterval = setInterval(() => {
      pingHealth(pingEndpoint);
    }, 240000);
  } else {
    logger.info(`💡 [Uptime Keep-Alive] Tip: Add 'APP_URL=https://your-domain.com' in your environment variables to enable 24/7 self-ping, or add 'https://<your-domain>/health' to UptimeRobot!`);
  }
};

/**
 * Execute a single ping
 */
const pingHealth = async (endpoint) => {
  const startTime = Date.now();
  try {
    const res = await axios.get(endpoint, {
      timeout: 10000,
      headers: { 'User-Agent': 'RiyaBot-Uptime-KeepAlive/1.0' }
    });
    lastPingLatency = Date.now() - startTime;
    lastPingTime = new Date().toISOString();
    logger.info(`⚡ [Uptime Keep-Alive] Ping succeeded (${res.status} OK, Latency: ${lastPingLatency}ms)`);
  } catch (err) {
    lastPingLatency = Date.now() - startTime;
    lastPingTime = new Date().toISOString();
    logger.warn(`⚠️ [Uptime Keep-Alive] Self-ping returned: ${err.message} (${lastPingLatency}ms)`);
  }
};
