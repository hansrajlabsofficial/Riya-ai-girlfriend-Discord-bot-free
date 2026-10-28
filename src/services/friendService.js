import { getUserData, saveUserData } from '../database/models/User.js';
import { logger } from '../utils/logger.js';

export const getFriendshipLevel = (userDoc, friendId) => {
  const friendData = (userDoc.friends || {})[friendId];
  if (!friendData) return { level: 0, xp: 0, title: 'Not Friends' };
  const xp = friendData.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  
  let title = '🌱 New Friend';
  if (level >= 10) title = '💎 Best Friends Forever (BFF)';
  else if (level >= 5) title = '💖 Close Companion';
  else if (level >= 3) title = '😊 Good Friend';

  return { level, xp, title };
};

export const addFriendXp = async (userDoc, friendDoc, xpAmount) => {
  if (!userDoc.friends) userDoc.friends = {};
  if (!friendDoc.friends) friendDoc.friends = {};

  const friendId = friendDoc.userId;
  const userId = userDoc.userId;

  const current1 = userDoc.friends[friendId] || { xp: 0, level: 1 };
  const current2 = friendDoc.friends[userId] || { xp: 0, level: 1 };

  const newXp1 = current1.xp + xpAmount;
  const newXp2 = current2.xp + xpAmount;

  const newLevel1 = Math.floor(newXp1 / 100) + 1;
  const newLevel2 = Math.floor(newXp2 / 100) + 1;

  userDoc.friends[friendId] = { xp: newXp1, level: newLevel1, updatedAt: new Date().toISOString() };
  friendDoc.friends[userId] = { xp: newXp2, level: newLevel2, updatedAt: new Date().toISOString() };

  await saveUserData(userDoc);
  await saveUserData(friendDoc);

  return { newLevel: newLevel1, newXp: newXp1 };
};

export const sendFriendRequest = async (senderDoc, targetDoc) => {
  if (!targetDoc.friendRequests) targetDoc.friendRequests = [];
  if (targetDoc.friendRequests.includes(senderDoc.userId)) {
    return { success: false, message: 'Friend request already sent!' };
  }
  if ((targetDoc.friends || {})[senderDoc.userId]) {
    return { success: false, message: 'You are already friends!' };
  }

  targetDoc.friendRequests.push(senderDoc.userId);
  await saveUserData(targetDoc);
  return { success: true, message: 'Friend request sent successfully!' };
};

export const acceptFriendRequest = async (userDoc, senderDoc) => {
  if (!userDoc.friendRequests) userDoc.friendRequests = [];
  userDoc.friendRequests = userDoc.friendRequests.filter(id => id !== senderDoc.userId);

  if (!userDoc.friends) userDoc.friends = {};
  if (!senderDoc.friends) senderDoc.friends = {};

  userDoc.friends[senderDoc.userId] = { xp: 50, level: 1, createdAt: new Date().toISOString() };
  senderDoc.friends[userDoc.userId] = { xp: 50, level: 1, createdAt: new Date().toISOString() };

  await saveUserData(userDoc);
  await saveUserData(senderDoc);

  return { success: true, message: 'Friend request accepted!' };
};
