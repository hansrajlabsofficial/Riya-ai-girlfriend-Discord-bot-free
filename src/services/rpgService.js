import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '../database/connect.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { logger } from '../utils/logger.js';

/**
 * RPG & Relationship Leveling System
 */

// XP required per level formula: Level * 100
export const getXpForNextLevel = (level) => level * 100;

export const addXp = async (userDoc, amount) => {
  userDoc.xp = (userDoc.xp || 0) + amount;
  let nextLevelXp = getXpForNextLevel(userDoc.level || 1);
  let leveledUp = false;

  while (userDoc.xp >= nextLevelXp) {
    userDoc.xp -= nextLevelXp;
    userDoc.level = (userDoc.level || 1) + 1;
    nextLevelXp = getXpForNextLevel(userDoc.level);
    leveledUp = true;
  }

  if (userDoc.save) {
    await userDoc.save();
  } else {
    await saveUserData(userDoc);
  }

  return { leveledUp, newLevel: userDoc.level, currentXp: userDoc.xp };
};

export const getRelationshipTitle = (level) => {
  if (level >= 15) return '👑 Soulmate & Forever Partner';
  if (level >= 10) return '💖 Intimate & Devoted Girlfriend';
  if (level >= 7) return '🥰 Loving Girlfriend';
  if (level >= 5) return 'Flirty Close Friend';
  if (level >= 3) return '😊 Warm Acquaintance';
  return '🌱 Shy New Connection';
};

export const DAILY_QUIZZES = [
  {
    question: "What is my absolute favorite way to spend a cozy evening with you?",
    options: [
      "Watching anime wrapped under a warm blanket 🍿",
      "Going to a loud rock concert 🎸",
      "Doing heavy math homework 📚",
      "Cleaning the whole house 🧹"
    ],
    correctAnswer: 0,
    xpReward: 100
  },
  {
    question: "If I cooked breakfast for you in bed, what sweet treat would I bring?",
    options: [
      "Heart-shaped fluffy pancakes with strawberry syrup 🥞",
      "Plain cold bread crusts 🍞",
      "Super spicy ghost pepper chili 🌶️",
      "Raw onions 🧅"
    ],
    correctAnswer: 0,
    xpReward: 100
  },
  {
    question: "What makes my mood state go up the fastest?",
    options: [
      "Sweet compliments & heartfelt chat 💕",
      "Ignoring me for 3 days straight 😶",
      "Using mean words 😤",
      "Spamming random numbers 🔢"
    ],
    correctAnswer: 0,
    xpReward: 100
  },
  {
    question: "Which stargazing spot sounds the most romantic for our virtual date?",
    options: [
      "A peaceful grassy hill under a starry midnight sky 🌌",
      "Inside a noisy crowded subway car 🚆",
      "A dark smelly basement 🏚️",
      "Next to a loud construction site 🏗️"
    ],
    correctAnswer: 0,
    xpReward: 100
  }
];

export const DAILY_TASKS = [
  { id: 'greet', description: 'Say a sweet "Good Morning" or "Good Night" to her in chat! 🌅', xpReward: 75 },
  { id: 'compliment', description: 'Give her a cute compliment (e.g. "You look pretty today") 💖', xpReward: 80 },
  { id: 'minigame', description: 'Play a mini-game with her using /rps or /guess 🎮', xpReward: 90 },
  { id: 'hug', description: 'Give her a warm hug using /hug 🫂', xpReward: 70 }
];

export const getRandomDailyTask = () => {
  return DAILY_TASKS[Math.floor(Math.random() * DAILY_TASKS.length)];
};

export const getGuildLeaderboard = async (guildId, limitCount = 10) => {
  const db = getDb();
  let users = [];

  if (db) {
    try {
      const usersRef = collection(db, 'users');
      let q;
      if (guildId && guildId !== 'dm') {
        q = query(usersRef, where('guildId', '==', guildId));
      } else {
        q = query(usersRef);
      }
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        users.push(doc.data());
      });
    } catch (err) {
      logger.warn(`Failed to fetch leaderboard from Firestore: ${err.message}`);
    }
  }

  // Calculate total score for sorting (Level * 1000 + XP)
  users.sort((a, b) => {
    const scoreA = ((a.level || 1) * 1000) + (a.xp || 0);
    const scoreB = ((b.level || 1) * 1000) + (b.xp || 0);
    return scoreB - scoreA;
  });

  return users.slice(0, limitCount);
};

export const getTopUserOfGuild = async (guildId) => {
  const leaderboard = await getGuildLeaderboard(guildId, 1);
  return leaderboard.length > 0 ? leaderboard[0] : null;
};

export const activateDailyPartner = async (userId, guildId) => {
  const userDoc = await getUserData(userId, guildId);
  userDoc.isDailyPartner = true;
  userDoc.datingTag = "👑 Riya's Official Partner of the Day 💖";
  userDoc.dailyPartnerExpiresAt = new Date(Date.now() + 86400000).toISOString();
  await saveUserData(userDoc);
  return userDoc;
};

export const isUserDailyPartner = (userDoc) => {
  if (!userDoc || !userDoc.isDailyPartner || !userDoc.dailyPartnerExpiresAt) return false;
  return new Date(userDoc.dailyPartnerExpiresAt) > new Date();
};
