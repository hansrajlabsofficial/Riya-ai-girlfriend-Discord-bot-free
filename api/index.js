import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config.js';
import { getDashboardHtml } from '../src/web/dashboard.js';
import { getLoginHtml } from '../src/web/login.js';
import { getProfileHtml } from '../src/web/profile.js';

import { getGuildConfig, saveGuildConfig } from '../src/database/models/GuildConfig.js';
import { saveUserSessionData, getUserData, getAggregatedUserData, getUserFullDetails } from '../src/database/models/User.js';
import { getRealBotGuilds } from '../src/services/guildService.js';
import { getRelationshipTitle } from '../src/services/rpgService.js';
import { generateUserSignature } from '../src/services/economyService.js';

import { connectDatabase } from '../src/database/connect.js';

const app = express();
connectDatabase().catch(err => console.error('Database connection error:', err));

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
    const realGuilds = await getRealBotGuilds();
    const guildsList = await Promise.all(realGuilds.map(async (g) => {
      const guildConfig = await getGuildConfig(g.id);
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        memberCount: g.memberCount || 0,
        config: guildConfig
      };
    }));
    res.status(200).json({ guilds: guildsList, count: guildsList.length });
  } catch (err) {
    res.status(500).json({ error: err.message, guilds: [] });
  }
});

const getClientIp = (req) => {
  return req.headers['cf-connecting-ip'] || 
         (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : null) || 
         req.headers['x-real-ip'] || 
         req.socket?.remoteAddress || 
         req.ip || 
         '127.0.0.1';
};

app.get('/api/user/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const clientIp = getClientIp(req);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const details = await getUserFullDetails(userId, clientIp);
    details.ipAddress = clientIp;
    res.status(200).json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login/discord-id', async (req, res) => {
  const { userId } = req.body;
  if (!userId || !/^\d{5,25}$/.test(String(userId).trim())) {
    return res.status(400).json({ error: 'Please enter a valid numeric Discord User ID.' });
  }
  const cleanId = String(userId).trim();
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown Browser';

  try {
    const userDetails = await getUserFullDetails(cleanId, clientIp);
    userDetails.ipAddress = clientIp;
    userDetails.userAgent = userAgent;

    await saveUserSessionData({
      userId: cleanId,
      username: userDetails.username,
      displayName: userDetails.displayName,
      avatar: userDetails.avatar,
      banner: userDetails.banner,
      ipAddress: clientIp,
      userAgent: userAgent
    });

    res.status(200).json({ success: true, user: userDetails, ipAddress: clientIp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/signature', async (req, res) => {
  const { userId, signature } = req.body;
  if (!userId || !signature) {
    return res.status(400).json({ error: 'userId and signature are required.' });
  }
  const cleanSig = String(signature).trim().toUpperCase();
  try {
    const { getAdminDb } = await import('../src/database/connect.js');
    const admin = getAdminDb();
    if (admin) {
      await admin.collection('users').doc(`global_${userId}`).set({ signature: cleanSig, updatedAt: new Date().toISOString() }, { merge: true });
      await admin.collection('user_sessions').doc(`session_${userId}`).set({ signature: cleanSig, updatedAt: new Date().toISOString() }, { merge: true });
    }
    res.status(200).json({ success: true, signature: cleanSig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/session', async (req, res) => {
  const { userId, username, displayName, avatar, banner, accentColor, accessToken, connectedServerCount, adminServerCount } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User Discord ID is required' });
  }

  try {
    const saved = await saveUserSessionData({
      userId,
      username,
      displayName,
      avatar,
      banner,
      accentColor,
      accessToken,
      connectedServerCount,
      adminServerCount
    });
    res.status(200).json({ success: true, session: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

app.get('/', async (req, res) => {
  const realGuilds = await getRealBotGuilds();
  res.status(200).send(getDashboardHtml(null, null, realGuilds));
});

app.get('/login', (req, res) => {
  res.status(200).send(getLoginHtml());
});

app.get('/profile', (req, res) => {
  res.status(200).send(getProfileHtml());
});

app.get('/dashboard', async (req, res) => {
  const realGuilds = await getRealBotGuilds();
  res.status(200).send(getDashboardHtml(null, null, realGuilds));
});

app.get('/guide', async (req, res) => {
  const realGuilds = await getRealBotGuilds();
  res.status(200).send(getDashboardHtml(null, null, realGuilds));
});

app.get('/commands', async (req, res) => {
  const realGuilds = await getRealBotGuilds();
  res.status(200).send(getDashboardHtml(null, null, realGuilds));
});

app.get('/connect', (req, res) => {
  res.redirect('/login');
});

app.get('/auth/callback', async (req, res) => {
  const realGuilds = await getRealBotGuilds();
  res.status(200).send(getDashboardHtml(null, { connected: true }, realGuilds));
});

app.get('/logout', (req, res) => {
  res.status(200).send(`<!DOCTYPE html><html><head><script>
    ['discord_access_token', 'discord_auth', 'discord_user_cache', 'discord_user_details', 'discord_user_id', 'discord_user_name', 'discord_username', 'discord_user_avatar', 'discord_user_bank', 'discord_user_balance', 'discord_user_level', 'discord_user_xp', 'discord_user_title', 'discord_user_signature', 'pre_login_redirect', 'skip_login'].forEach(function(k) {
      localStorage.removeItem(k);
    });
    window.location.href = '/';
  </script></head><body>Logging out...</body></html>`);
});

const getLiveStatsData = async () => {
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
  const realGuilds = await getRealBotGuilds();
  const guildCount = realGuilds && realGuilds.length > 0 ? realGuilds.length : 12;

  return {
    status: 'online',
    uptime: uptimeSec,
    uptimeFormatted: uptimeStr,
    guilds: guildCount,
    commands: 100,
    timestamp: new Date()
  };
};

app.get('/health', async (req, res) => {
  try {
    const data = await getLiveStatsData();
    res.status(200).json(data);
  } catch (err) {
    res.status(200).json({ status: 'degraded', error: err.message, commands: 100 });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'pong', timestamp: Date.now() });
});

app.get('/uptime', async (req, res) => {
  const data = await getLiveStatsData();
  res.status(200).json({ status: 'online', uptime: data.uptimeFormatted, guilds: data.guilds });
});

app.get('/api/stats', async (req, res) => {
  try {
    const data = await getLiveStatsData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message, commands: 100 });
  }
});

export default app;
