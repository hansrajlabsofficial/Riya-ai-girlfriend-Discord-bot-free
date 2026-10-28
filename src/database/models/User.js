import { doc, getDoc, setDoc, collection, getDocs, runTransaction } from 'firebase/firestore';
import { getDb, getAdminDb } from '../connect.js';
import { logger } from '../../utils/logger.js';

// In-memory fallback storage if Firestore is unavailable
const memoryFallbackUsers = new Map();

const getFallbackKey = (userId, guildId) => `${guildId}:${userId}`;

export const getGlobalTopBankUsers = async (topLimit = 10) => {
  const usersMap = new Map();

  // 1. Gather from memory fallback
  for (const user of memoryFallbackUsers.values()) {
    const total = (user.balance !== undefined ? user.balance : 10000) + (user.bank || 0);
    const existing = usersMap.get(user.userId);
    if (!existing || total > existing.total) {
      usersMap.set(user.userId, { ...user, total });
    }
  }

  // 2. Gather from Firestore if connected
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.userId) {
          const total = (u.balance !== undefined ? u.balance : 10000) + (u.bank || 0);
          const existing = usersMap.get(u.userId);
          if (!existing || total > existing.total) {
            usersMap.set(u.userId, { ...u, total });
          }
        }
      });
    } catch (err) {
      logger.warn(`Firestore getDocs failed for top bank users: ${err.message}`);
    }
  }

  const sorted = Array.from(usersMap.values()).sort((a, b) => b.total - a.total);
  return sorted.slice(0, topLimit);
};

export const getAggregatedUserData = async (userId) => {
  if (!userId) return null;
  let highestUser = null;
  let maxScore = -1;

  // 1. Search memory fallback
  for (const [key, user] of memoryFallbackUsers.entries()) {
    if (user.userId === userId || key.endsWith(`:${userId}`)) {
      const bank = user.bank || 0;
      const balance = user.balance !== undefined ? user.balance : 10000;
      const score = bank + balance + ((user.level || 1) * 100000) + (user.xp || 0);
      if (score > maxScore) {
        maxScore = score;
        highestUser = user;
      }
    }
  }

  // 2. Search Firestore
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.userId === userId || docSnap.id.endsWith(`_${userId}`)) {
          const bank = u.bank || 0;
          const balance = u.balance !== undefined ? u.balance : 10000;
          const score = bank + balance + ((u.level || 1) * 100000) + (u.xp || 0);
          if (score > maxScore) {
            maxScore = score;
            highestUser = u;
          }
        }
      });
    } catch (err) {
      logger.warn(`Firestore getDocs failed for aggregated user ${userId}: ${err.message}`);
    }
  }

  if (highestUser) {
    highestUser.balance = highestUser.balance !== undefined ? highestUser.balance : 10000;
    highestUser.bank = highestUser.bank !== undefined ? highestUser.bank : 0;
    highestUser.level = highestUser.level || 1;
    highestUser.xp = highestUser.xp || 0;
    return highestUser;
  }

  return await getUserData(userId, 'global');
};

export const getUserData = async (userId, guildId) => {
  const admin = getAdminDb();
  const docId = `${guildId}_${userId}`;

  if (admin) {
    try {
      const userSnap = await admin.collection('users').doc(docId).get();

      if (userSnap.exists) {
        const data = userSnap.data();
        data._docId = docId;
        data.balance = data.balance !== undefined ? data.balance : 10000;
        data.bank = data.bank !== undefined ? data.bank : 0;
        data.hp = data.hp !== undefined ? data.hp : 100;
        data.maxHp = data.maxHp !== undefined ? data.maxHp : 100;
        data.attributes = data.attributes || { strength: 1, defense: 1, agility: 1, luck: 1 };
        data.cooldowns = data.cooldowns || {};
        data.inventory = data.inventory || [];
        data.friends = data.friends || {};
        data.friendRequests = data.friendRequests || [];
        data.partnerId = data.partnerId || null;
        data.gangId = data.gangId || null;
        data.save = async function () {
          return await saveUserData(this);
        };
        return data;
      } else {
        const newUser = {
          _docId: docId,
          userId,
          guildId,
          xp: 0,
          level: 1,
          balance: 10000,
          bank: 0,
          hp: 100,
          maxHp: 100,
          attributes: { strength: 1, defense: 1, agility: 1, luck: 1 },
          cooldowns: {},
          inventory: [],
          friends: {},
          friendRequests: [],
          partnerId: null,
          gangId: null,
          moodScore: 50,
          moodState: 'NEUTRAL',
          memories: [],
          conversationHistory: [],
          lastDailyQuiz: null,
          lastDailyTask: null,
          currentDailyTask: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newUser.save = async function () {
          return await saveUserData(this);
        };
        await saveUserData(newUser);
        return newUser;
      }
    } catch (err) {
      logger.warn(`Admin SDK read failed for user ${docId}. Fallback to client SDK: ${err.message}`);
    }
  }

  const db = getDb();

  if (db) {
    try {
      const userRef = doc(db, 'users', docId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        data._docId = docId;
        data.balance = data.balance !== undefined ? data.balance : 10000;
        data.bank = data.bank !== undefined ? data.bank : 0;
        data.hp = data.hp !== undefined ? data.hp : 100;
        data.maxHp = data.maxHp !== undefined ? data.maxHp : 100;
        data.attributes = data.attributes || { strength: 1, defense: 1, agility: 1, luck: 1 };
        data.cooldowns = data.cooldowns || {};
        data.inventory = data.inventory || [];
        data.friends = data.friends || {};
        data.friendRequests = data.friendRequests || [];
        data.partnerId = data.partnerId || null;
        data.gangId = data.gangId || null;
        data.save = async function () {
          return await saveUserData(this);
        };
        return data;
      } else {
        const newUser = {
          _docId: docId,
          userId,
          guildId,
          xp: 0,
          level: 1,
          balance: 10000,
          bank: 0,
          hp: 100,
          maxHp: 100,
          attributes: { strength: 1, defense: 1, agility: 1, luck: 1 },
          cooldowns: {},
          inventory: [],
          friends: {},
          friendRequests: [],
          partnerId: null,
          gangId: null,
          moodScore: 50,
          moodState: 'NEUTRAL',
          memories: [],
          conversationHistory: [],
          lastDailyQuiz: null,
          lastDailyTask: null,
          currentDailyTask: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newUser.save = async function () {
          return await saveUserData(this);
        };
        await saveUserData(newUser);
        return newUser;
      }
    } catch (err) {
      logger.warn(`Firestore read failed for user ${docId}. Using in-memory fallback: ${err.message}`);
    }
  }

  // Fallback to in-memory store
  const key = getFallbackKey(userId, guildId);
  if (!memoryFallbackUsers.has(key)) {
    memoryFallbackUsers.set(key, {
      _docId: docId,
      userId,
      guildId,
      xp: 0,
      level: 1,
      balance: 10000,
      bank: 0,
      hp: 100,
      maxHp: 100,
      attributes: { strength: 1, defense: 1, agility: 1, luck: 1 },
      cooldowns: {},
      inventory: [],
      friends: {},
      friendRequests: [],
      partnerId: null,
      gangId: null,
      moodScore: 50,
      moodState: 'NEUTRAL',
      memories: [],
      conversationHistory: [],
      lastDailyQuiz: null,
      lastDailyTask: null,
      currentDailyTask: null,
      save: async function () { return this; }
    });
  }
  const user = memoryFallbackUsers.get(key);
  if (user.balance === undefined) user.balance = 10000;
  if (user.bank === undefined) user.bank = 0;
  if (user.hp === undefined) user.hp = 100;
  if (user.maxHp === undefined) user.maxHp = 100;
  if (!user.attributes) user.attributes = { strength: 1, defense: 1, agility: 1, luck: 1 };
  if (!user.cooldowns) user.cooldowns = {};
  if (!user.inventory) user.inventory = [];
  if (!user.friends) user.friends = {};
  if (!user.friendRequests) user.friendRequests = [];
  if (user.partnerId === undefined) user.partnerId = null;
  if (user.gangId === undefined) user.gangId = null;
  return user;
};

export const saveUserData = async (userData) => {
  if (!userData._docId) return userData;

  const dataToSave = { ...userData };
  delete dataToSave._docId;
  delete dataToSave.save;
  dataToSave.updatedAt = new Date().toISOString();

  const admin = getAdminDb();
  if (admin) {
    try {
      await admin.collection('users').doc(userData._docId).set(dataToSave, { merge: true });

      // Auto-sync user progress to global_userId and session_userId in Firebase Firestore
      if (userData.userId) {
        const syncObj = {
          userId: userData.userId,
          bank: userData.bank !== undefined ? userData.bank : 258590,
          balance: userData.balance !== undefined ? userData.balance : 10000,
          level: userData.level || 1,
          xp: userData.xp || 0,
          updatedAt: dataToSave.updatedAt
        };
        if (userData.username) syncObj.username = userData.username;
        if (userData.displayName) syncObj.displayName = userData.displayName;
        if (userData.avatar) syncObj.avatar = userData.avatar;
        if (userData.banner) syncObj.banner = userData.banner;
        if (userData.ipAddress) syncObj.ipAddress = userData.ipAddress;

        await admin.collection('users').doc(`global_${userData.userId}`).set(syncObj, { merge: true }).catch(() => {});
        await admin.collection('user_sessions').doc(`session_${userData.userId}`).set(syncObj, { merge: true }).catch(() => {});
      }

      return userData;
    } catch (err) {
      logger.warn(`Admin SDK save failed for user ${userData._docId}: ${err.message}`);
    }
  }

  const db = getDb();
  if (db && userData._docId) {
    try {
      const userRef = doc(db, 'users', userData._docId);
      await setDoc(userRef, dataToSave, { merge: true });
      return userData;
    } catch (err) {
      logger.warn(`Firestore save failed for user ${userData._docId}: ${err.message}`);
    }
  }
  return userData;
};

export const getUserFullDetails = async (userId, clientIp = null) => {
  if (!userId) return null;
  const admin = getAdminDb();
  let sessionData = null;
  let userData = null;

  if (admin) {
    try {
      const sessionSnap = await admin.collection('user_sessions').doc(`session_${userId}`).get();
      if (sessionSnap.exists) {
        sessionData = sessionSnap.data();
      }
      const userSnap = await admin.collection('users').doc(`global_${userId}`).get();
      if (userSnap.exists) {
        userData = userSnap.data();
      }
    } catch (err) {
      logger.warn(`Admin SDK get user full details failed for ${userId}: ${err.message}`);
    }
  }

  const aggregated = await getAggregatedUserData(userId);

  const isOwner = userId === '1016322069093';
  const finalUsername = sessionData?.username || userData?.username || aggregated?.username || (isOwner ? 'HANSRAJxFPS' : `User_${userId.slice(-4)}`);
  const finalDisplayName = sessionData?.displayName || userData?.displayName || aggregated?.displayName || (isOwner ? 'A S 友 H A N S R A J 🍃' : finalUsername);
  const finalAvatar = sessionData?.avatar || userData?.avatar || 'https://cdn-icons-png.flaticon.com/512/3059/3059502.png';
  const finalBanner = sessionData?.banner || userData?.banner || null;
  const finalBank = sessionData?.bank !== undefined ? sessionData.bank : (userData?.bank !== undefined ? userData.bank : (aggregated?.bank !== undefined ? aggregated.bank : 258590));
  const finalBalance = sessionData?.balance !== undefined ? sessionData.balance : (userData?.balance !== undefined ? userData.balance : (aggregated?.balance !== undefined ? aggregated.balance : 10000));
  const finalLevel = sessionData?.level || userData?.level || aggregated?.level || 1;
  const finalXp = sessionData?.xp || userData?.xp || aggregated?.xp || 0;
  const finalIp = clientIp || sessionData?.ipAddress || userData?.ipAddress || '127.0.0.1';

  let title = 'Acquaintance';
  let signature = sessionData?.signature || userData?.signature || aggregated?.signature || null;
  try {
    const { getRelationshipTitle } = await import('../../services/rpgService.js');
    const { generateUserSignature } = await import('../../services/economyService.js');
    title = getRelationshipTitle(finalLevel);
    if (!signature) {
      signature = generateUserSignature({ displayName: finalDisplayName, username: finalUsername });
    }
  } catch(e) {
    if (!signature) signature = 'H.VAGHELA';
  }

  const fullDetails = {
    userId,
    username: finalUsername,
    displayName: finalDisplayName,
    avatar: finalAvatar,
    banner: finalBanner,
    bank: finalBank,
    balance: finalBalance,
    level: finalLevel,
    xp: finalXp,
    title,
    signature,
    ipAddress: finalIp,
    connected: true
  };

  // Auto persist to Firebase
  if (admin) {
    admin.collection('user_sessions').doc(`session_${userId}`).set(fullDetails, { merge: true }).catch(() => {});
    admin.collection('users').doc(`global_${userId}`).set(fullDetails, { merge: true }).catch(() => {});
  }

  return fullDetails;
};

export const saveUserSessionData = async ({ userId, username, displayName, avatar, banner, accentColor, accessToken, connectedServerCount, adminServerCount, ipAddress, userAgent }) => {
  const db = getDb();
  if (!userId) return null;

  const docId = `session_${userId}`;
  const aggregated = await getAggregatedUserData(userId);

  const sessionData = {
    userId,
    username: username || aggregated?.username || 'Unknown',
    displayName: displayName || username || aggregated?.displayName || 'Member',
    avatar: avatar || null,
    banner: banner || null,
    accentColor: accentColor || null,
    accessToken: accessToken || null,
    connectedServerCount: connectedServerCount || 0,
    adminServerCount: adminServerCount || 0,
    bank: aggregated?.bank !== undefined ? aggregated.bank : 258590,
    balance: aggregated?.balance !== undefined ? aggregated.balance : 10000,
    level: aggregated?.level || 1,
    xp: aggregated?.xp || 0,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'Unknown Browser',
    isDailyPartner: aggregated?.isDailyPartner || false,
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const admin = getAdminDb();
  if (admin) {
    try {
      await admin.collection('user_sessions').doc(docId).set(sessionData, { merge: true });
      await admin.collection('users').doc(`global_${userId}`).set({
        userId,
        username: sessionData.username,
        displayName: sessionData.displayName,
        avatar: sessionData.avatar,
        banner: sessionData.banner,
        bank: sessionData.bank,
        balance: sessionData.balance,
        level: sessionData.level,
        xp: sessionData.xp,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      logger.warn(`Admin SDK save user_sessions failed for user ${userId}: ${err.message}`);
    }
  }

  if (db) {
    try {
      const sessionRef = doc(db, 'user_sessions', docId);
      await setDoc(sessionRef, sessionData, { merge: true });

      const globalUserRef = doc(db, 'users', `global_${userId}`);
      await setDoc(globalUserRef, {
        userId,
        username: sessionData.username,
        displayName: sessionData.displayName,
        avatar: sessionData.avatar,
        banner: sessionData.banner,
        bank: sessionData.bank,
        balance: sessionData.balance,
        level: sessionData.level,
        xp: sessionData.xp,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      logger.info(`Persisted user session & economy in Firestore for user ${userId}`);
    } catch (err) {
      logger.warn(`Firestore save user_sessions failed for user ${userId}: ${err.message}`);
    }
  }
  return sessionData;
};

const globalMessageLocks = new Set();
const lockTimestamps = new Map();

export const claimMessageLock = async (messageId) => {
  if (!messageId) return true;

  if (globalMessageLocks.has(messageId)) {
    return false;
  }
  globalMessageLocks.add(messageId);
  lockTimestamps.set(messageId, Date.now());

  if (globalMessageLocks.size > 1000) {
    const first = globalMessageLocks.values().next().value;
    globalMessageLocks.delete(first);
    lockTimestamps.delete(first);
  }

  const db = getDb();
  if (db) {
    try {
      const lockRef = doc(db, 'message_locks', messageId);
      const acquired = await runTransaction(db, async (transaction) => {
        const lockDoc = await transaction.get(lockRef);
        const now = Date.now();
        if (lockDoc.exists()) {
          const data = lockDoc.data();
          const lockTime = data.timestampMs || (data.timestamp ? new Date(data.timestamp).getTime() : 0);
          if (now - lockTime < 30000) {
            return false; // Lock held by another instance
          }
        }
        transaction.set(lockRef, {
          claimedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          timestampMs: now,
          instance: process.env.RENDER ? 'render' : (process.pid ? `local_${process.pid}` : 'local')
        });
        return true;
      });

      return Boolean(acquired);
    } catch (err) {
      logger.info(`[DEDUP] Message ${messageId} lock contention (${err.message}) - skipping duplicate reply.`);
      return false;
    }
  }

  return true;
};
