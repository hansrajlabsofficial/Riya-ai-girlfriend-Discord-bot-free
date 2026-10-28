import express from 'express';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config, validateConfig } from './config.js';
import { connectDatabase } from './database/connect.js';
import { logger } from './utils/logger.js';

import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';
import * as messageCreateEvent from './events/messageCreate.js';
import * as guildMemberAddEvent from './events/guildMemberAdd.js';

import { getDashboardHtml } from './web/dashboard.js';
import { getLoginHtml } from './web/login.js';
import { getGuildConfig, saveGuildConfig } from './database/models/GuildConfig.js';
import { saveUserSessionData } from './database/models/User.js';
import { getRealBotGuilds } from './services/guildService.js';
import { loadAllCommands } from './utils/commandLoader.js';
import { getHealthData, startUptimeKeepAlive } from './services/uptimeKeepAliveService.js';

// Validate environment variables on startup
validateConfig();

// 1. Initialize Express Web Server & Dashboard for UptimeRobot, Render, & Discord OAuth2 Connect
const app = express();
const PORT = config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/riya_lofi_bgm.mp3', (req, res) => {
  const localFile = path.resolve('public/riya_lofi_bgm.mp3');
  const rootFile = path.resolve('riya_lofi_bgm.mp3');
  if (fs.existsSync(localFile)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.sendFile(localFile);
  }
  if (fs.existsSync(rootFile)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.sendFile(rootFile);
  }
  res.redirect('https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3');
});

app.get('/riya_lofi_cover.jpg', (req, res) => {
  const localFile = path.resolve('public/riya_lofi_cover.jpg');
  const rootFile = path.resolve('riya_lofi_cover.jpg');
  if (fs.existsSync(localFile)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(localFile);
  }
  if (fs.existsSync(rootFile)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(rootFile);
  }
  res.redirect('https://cdn-icons-png.flaticon.com/512/3081/3081840.png');
});

app.get('/website_bg.jpg', (req, res) => {
  const localFile = path.resolve('public/website_bg.jpg');
  const rootFile = path.resolve('website_bg.jpg');
  if (fs.existsSync(localFile)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(localFile);
  }
  if (fs.existsSync(rootFile)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(rootFile);
  }
  res.redirect('/riya_lofi_cover.jpg');
});

app.get('/api/guilds', async (req, res) => {
  try {
    let guildsList = [];
    if (client && client.guilds && client.guilds.cache.size > 0) {
      guildsList = await Promise.all(client.guilds.cache.map(async (guild) => {
        const guildConfig = await getGuildConfig(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL() || 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
          memberCount: guild.memberCount,
          config: guildConfig
        };
      }));
    } else {
      const realGuilds = await getRealBotGuilds();
      guildsList = await Promise.all(realGuilds.map(async (g) => {
        const guildConfig = await getGuildConfig(g.id);
        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          memberCount: g.memberCount || 0,
          config: guildConfig
        };
      }));
    }
    res.status(200).json({ guilds: guildsList, count: guildsList.length });
  } catch (err) {
    res.status(500).json({ error: err.message, guilds: [] });
  }
});

app.get('/api/guilds/:guildId/config', async (req, res) => {
  const { guildId } = req.params;
  const guildConfig = await getGuildConfig(guildId);
  res.status(200).json(guildConfig);
});

app.post('/api/guilds/:guildId/config', async (req, res) => {
  const { guildId } = req.params;
  const { prefix, aiPersona, globalChatChannelId, countingChannelId, language, boundChannelId } = req.body;

  const guildConfig = await getGuildConfig(guildId);
  if (prefix !== undefined) guildConfig.prefix = prefix;
  if (aiPersona !== undefined) guildConfig.aiPersona = aiPersona;
  if (globalChatChannelId !== undefined) guildConfig.globalChatChannelId = globalChatChannelId;
  if (countingChannelId !== undefined) guildConfig.countingChannelId = countingChannelId;
  if (language !== undefined) guildConfig.language = language;
  if (boundChannelId !== undefined) guildConfig.boundChannelId = boundChannelId;

  await saveGuildConfig(guildConfig);
  res.status(200).json({ success: true, config: guildConfig });
});

app.post('/api/user/session', async (req, res) => {
  const { userId, username, accessToken, connectedServerCount, adminServerCount } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User Discord ID is required' });
  }

  try {
    const saved = await saveUserSessionData({
      userId,
      username,
      accessToken,
      connectedServerCount,
      adminServerCount
    });
    res.status(200).json({ success: true, session: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.status(200).send(getDashboardHtml(client));
});

app.get('/login', (req, res) => {
  res.status(200).send(getLoginHtml());
});

app.get('/dashboard', (req, res) => {
  res.status(200).send(getDashboardHtml(client));
});

app.get('/guide', (req, res) => {
  res.status(200).send(getDashboardHtml(client));
});

app.get('/commands', (req, res) => {
  res.status(200).send(getDashboardHtml(client));
});

app.get('/connect', (req, res) => {
  const clientId = config.clientId || '1479052475368607926';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const redirectUri = process.env.REDIRECT_URI || `${protocol}://${host}/auth/callback`;

  const oauthConnectUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify%20guilds`;
  res.redirect(oauthConnectUrl);
});

app.get('/auth/callback', (req, res) => {
  res.status(200).send(getDashboardHtml(client, { connected: true }));
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

const getLiveStatusPayload = async () => {
  const uptimeSec = Math.floor(process.uptime() || 0);
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = Math.floor(uptimeSec % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  const uptimeStr = parts.join(' ');
  let guildCount = client?.guilds?.cache?.size || 0;
  if (!guildCount) {
    const realGuilds = await getRealBotGuilds();
    guildCount = realGuilds && realGuilds.length > 0 ? realGuilds.length : 12;
  }

  let commandCount = 100;
  try {
    const { commandsJSON } = await loadAllCommands();
    commandCount = commandsJSON.length;
  } catch (e) {}

  return {
    status: 'online',
    uptime: uptimeSec,
    uptimeFormatted: uptimeStr,
    guilds: guildCount,
    commands: commandCount,
    timestamp: new Date()
  };
};

// 24/7 Uptime Monitoring & Health Check Endpoints
app.head('/', (req, res) => res.status(200).end());

app.all('/health', async (req, res) => {
  const data = await getHealthData(client);
  res.status(200).json(data);
});

app.all('/ping', (req, res) => {
  res.status(200).json({
    status: 'pong',
    botOnline: Boolean(client && client.isReady && client.isReady()),
    wsPingMs: client?.ws?.ping !== undefined && client.ws.ping >= 0 ? client.ws.ping : null,
    uptimeSec: Math.floor(process.uptime() || 0),
    timestamp: Date.now()
  });
});

app.all('/uptime', async (req, res) => {
  const data = await getHealthData(client);
  res.status(200).json({
    status: 'online',
    uptime: data.uptime,
    bot: data.bot
  });
});

app.all('/status', async (req, res) => {
  const data = await getHealthData(client);
  res.status(200).json(data);
});

app.get('/api/stats', async (req, res) => {
  const data = await getHealthData(client);
  res.status(200).json(data);
});

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Express Web Dashboard & Health Checker server running on port ${port}. Dashboard live at http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use. Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      logger.error(`Express server error: ${err.message}`);
    }
  });
};

startServer(Number(PORT));

// 2. Initialize Discord Client with required Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
});

// Register Event Listeners
client.once(readyEvent.name, (...args) => readyEvent.execute(...args));
client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args));
client.on(messageCreateEvent.name, (...args) => messageCreateEvent.execute(...args));
client.on(guildMemberAddEvent.name, (...args) => guildMemberAddEvent.execute(...args));

// Handle Unhandled Errors to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
});

// 3. Connect to Database & Login to Discord
const startBot = async () => {
  await connectDatabase();
  
  const token = (config.discordToken || '').trim().replace(/^["']|["']$/g, '');

  if (!token || token.includes('your_discord_bot_token')) {
    logger.error('Cannot login: DISCORD_TOKEN is missing or invalid in environment!');
    return;
  }

  try {
    logger.info('Attempting Discord client login...');
    await client.login(token);
    startUptimeKeepAlive(client, PORT);
  } catch (error) {
    logger.error('Failed to log in to Discord:', error);
  }
};

startBot();
