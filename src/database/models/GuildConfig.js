import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getDb, getAdminDb } from '../connect.js';
import { logger } from '../../utils/logger.js';

// In-memory fallback
const memoryFallbackGuilds = new Map();

export const getAllGlobalChatChannels = async () => {
  const channelsMap = new Map();

  // 1. Check memory fallback
  for (const [gId, conf] of memoryFallbackGuilds.entries()) {
    if (conf.globalChatChannelId && conf.globalChatEnabled !== false) {
      channelsMap.set(gId, conf.globalChatChannelId);
    }
  }

  // 2. Check Firestore DB
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'guilds'));
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.guildId && data.globalChatChannelId && data.globalChatEnabled !== false) {
          channelsMap.set(data.guildId, data.globalChatChannelId);
        }
      });
    } catch (err) {
      logger.warn(`Failed to fetch global chat channels from Firestore: ${err.message}`);
    }
  }

  return Array.from(channelsMap.entries()).map(([guildId, channelId]) => ({ guildId, channelId }));
};

export const getAll247StatusChannels = async () => {
  const statusMap = new Map();

  for (const [gId, conf] of memoryFallbackGuilds.entries()) {
    if (conf.status247Enabled && conf.statusChannelId) {
      statusMap.set(gId, { guildId: gId, channelId: conf.statusChannelId, messageId: conf.statusMessageId });
    }
  }

  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'guilds'));
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.guildId && data.status247Enabled && data.statusChannelId) {
          statusMap.set(data.guildId, { guildId: data.guildId, channelId: data.statusChannelId, messageId: data.statusMessageId });
        }
      });
    } catch (err) {
      logger.warn(`Failed to fetch 24/7 status channels from Firestore: ${err.message}`);
    }
  }

  return Array.from(statusMap.values());
};

export const getGuildConfig = async (guildId) => {
  const db = getDb();

  if (db) {
    try {
      const guildRef = doc(db, 'guilds', guildId);
      const guildSnap = await getDoc(guildRef);

      if (guildSnap.exists()) {
        const data = guildSnap.data();
        data._guildId = guildId;
        data.boundChannelId = data.boundChannelId || null;
        data.globalChatChannelId = data.globalChatChannelId || null;
        data.emojiquizChannelId = data.emojiquizChannelId || null;
        data.antonymquizChannelId = data.antonymquizChannelId || null;
        data.countingChannelId = data.countingChannelId || null;
        data.statusChannelId = data.statusChannelId || null;
        data.statusMessageId = data.statusMessageId || null;
        data.status247Enabled = data.status247Enabled || false;
        data.autoDownloadChannelId = data.autoDownloadChannelId || null;
        data.autoDownloadEnabled = data.autoDownloadEnabled !== undefined ? data.autoDownloadEnabled : true;
        data.welcomeChannelId = data.welcomeChannelId || null;
        data.welcomeEnabled = data.welcomeEnabled !== undefined ? data.welcomeEnabled : false;
        data.welcomeMessage = data.welcomeMessage || 'Welcome {user} to the {server} matrix!';
        data.welcomeSendDm = data.welcomeSendDm !== undefined ? data.welcomeSendDm : false;
        data.welcomeBannerUrl = data.welcomeBannerUrl || null;
        data.welcomeSecondMessage = data.welcomeSecondMessage || null;
        data.welcomeSecondMessageEnabled = data.welcomeSecondMessageEnabled !== undefined ? data.welcomeSecondMessageEnabled : false;
        data.welcomeSecondMessageAsEmbed = data.welcomeSecondMessageAsEmbed !== undefined ? data.welcomeSecondMessageAsEmbed : false;
        data.welcomeTemplate = data.welcomeTemplate || 'haoc';
        data.welcomeRulesChannelId = data.welcomeRulesChannelId || null;
        data.welcomeChatChannelId = data.welcomeChatChannelId || null;
        data.welcomeSupportChannelId = data.welcomeSupportChannelId || null;
        data.welcomeYtChannelId = data.welcomeYtChannelId || null;
        data.welcomeInviteUrl = data.welcomeInviteUrl || null;
        data.currentCountingNumber = data.currentCountingNumber || 0;
        data.lastCountingUserId = data.lastCountingUserId || null;
        data.language = data.language || 'en';
        data.save = async function () {
          return await saveGuildConfig(this);
        };
        return data;
      } else {
        const newConfig = {
          _guildId: guildId,
          guildId,
          boundChannelId: null,
          emojiquizChannelId: null,
          antonymquizChannelId: null,
          countingChannelId: null,
          statusChannelId: null,
          statusMessageId: null,
          status247Enabled: false,
          autoDownloadChannelId: null,
          autoDownloadEnabled: true,
          welcomeChannelId: null,
          welcomeEnabled: false,
          welcomeMessage: 'Welcome {user} to the {server} matrix!',
          welcomeSendDm: false,
          welcomeBannerUrl: null,
          welcomeSecondMessage: null,
          welcomeSecondMessageEnabled: false,
          welcomeSecondMessageAsEmbed: false,
          welcomeTemplate: 'haoc',
          welcomeRulesChannelId: null,
          welcomeChatChannelId: null,
          welcomeSupportChannelId: null,
          welcomeYtChannelId: null,
          welcomeInviteUrl: null,
          currentCountingNumber: 0,
          lastCountingUserId: null,
          language: 'en',
          updatedAt: new Date().toISOString()
        };
        newConfig.save = async function () {
          return await saveGuildConfig(this);
        };
        await saveGuildConfig(newConfig);
        return newConfig;
      }
    } catch (err) {
      logger.warn(`Firestore read failed for guild ${guildId}: ${err.message}`);
    }
  }

  if (!memoryFallbackGuilds.has(guildId)) {
    memoryFallbackGuilds.set(guildId, {
      _guildId: guildId,
      guildId,
      boundChannelId: null,
      emojiquizChannelId: null,
      antonymquizChannelId: null,
      countingChannelId: null,
      autoDownloadChannelId: null,
      autoDownloadEnabled: true,
      welcomeChannelId: null,
      welcomeEnabled: false,
      welcomeMessage: 'Welcome {user} to the {server} matrix!',
      welcomeSendDm: false,
      welcomeBannerUrl: null,
      welcomeSecondMessage: null,
      welcomeSecondMessageEnabled: false,
      welcomeSecondMessageAsEmbed: false,
      welcomeTemplate: 'haoc',
      welcomeRulesChannelId: null,
      welcomeChatChannelId: null,
      welcomeSupportChannelId: null,
      welcomeYtChannelId: null,
      welcomeInviteUrl: null,
      currentCountingNumber: 0,
      lastCountingUserId: null,
      language: 'en',
      save: async function () { return this; }
    });
  }
  const config = memoryFallbackGuilds.get(guildId);
  if (config.currentCountingNumber === undefined) config.currentCountingNumber = 0;
  if (config.autoDownloadEnabled === undefined) config.autoDownloadEnabled = true;
  if (config.welcomeEnabled === undefined) config.welcomeEnabled = false;
  if (config.welcomeMessage === undefined) config.welcomeMessage = 'Welcome {user} to the {server} matrix!';
  if (config.welcomeSendDm === undefined) config.welcomeSendDm = false;
  if (config.welcomeSecondMessage === undefined) config.welcomeSecondMessage = null;
  if (config.welcomeSecondMessageEnabled === undefined) config.welcomeSecondMessageEnabled = false;
  if (config.welcomeSecondMessageAsEmbed === undefined) config.welcomeSecondMessageAsEmbed = false;
  if (config.welcomeTemplate === undefined) config.welcomeTemplate = 'haoc';
  if (config.language === undefined) config.language = 'en';
  return config;
};

export const saveGuildConfig = async (guildConfig) => {
  if (!guildConfig.guildId) return guildConfig;

  const admin = getAdminDb();
  if (admin) {
    try {
      const dataToSave = { ...guildConfig };
      delete dataToSave._guildId;
      delete dataToSave.save;
      dataToSave.updatedAt = new Date().toISOString();

      await admin.collection('guilds').doc(guildConfig.guildId).set(dataToSave, { merge: true });
      return guildConfig;
    } catch (err) {
      logger.warn(`Admin SDK save failed for guild ${guildConfig.guildId}: ${err.message}`);
    }
  }

  const db = getDb();
  if (db) {
    try {
      const guildRef = doc(db, 'guilds', guildConfig.guildId);
      const dataToSave = { ...guildConfig };
      delete dataToSave._guildId;
      delete dataToSave.save;
      dataToSave.updatedAt = new Date().toISOString();

      await setDoc(guildRef, dataToSave, { merge: true });
    } catch (err) {
      logger.warn(`Firestore save failed for guild ${guildConfig.guildId}: ${err.message}`);
    }
  }
  return guildConfig;
};

export const setBoundChannel = async (guildId, channelId) => {
  const guildConfig = await getGuildConfig(guildId);
  guildConfig.boundChannelId = channelId;
  await saveGuildConfig(guildConfig);
  return guildConfig;
};

export const setAutoDownloadChannel = async (guildId, channelId, enabled = true) => {
  const guildConfig = await getGuildConfig(guildId);
  guildConfig.autoDownloadChannelId = channelId;
  guildConfig.autoDownloadEnabled = enabled;
  await saveGuildConfig(guildConfig);
  return guildConfig;
};
