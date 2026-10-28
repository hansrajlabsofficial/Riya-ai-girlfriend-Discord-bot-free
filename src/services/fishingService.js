import { formatMoney } from './economyService.js';
import { logger } from '../utils/logger.js';

export const FISHING_EMBLEM_URL = 'https://cdn.discordapp.com/attachments/1450771986031706214/1560613901396086904/Global_Fishing_Emblem_1.png?ex=6ad35a74&is=6ad208f4&hm=c0756eb02f2652d908a466b51026a18c45165dcdd6aad2abf5645b29728cf52c&';

export const RODS = {
  bamboo: {
    id: 'bamboo',
    name: 'Bamboo Stick',
    emoji: '🎋',
    cost: 0,
    cooldownSec: 60,
    desc: 'Free starter rod. Basic catch rates.'
  },
  fiberglass: {
    id: 'fiberglass',
    name: 'Fiberglass Rod',
    emoji: '🎣',
    cost: 2500,
    cooldownSec: 45,
    desc: 'Drops junk rate by 10%. Cooldown reduced to 45s.'
  },
  carbon_pro: {
    id: 'carbon_pro',
    name: 'Carbon Pro Caster',
    emoji: '🪙',
    cost: 15000,
    cooldownSec: 30,
    desc: '+15% chance for Rare / Epic catches. Cooldown reduced to 30s.'
  },
  poseidon_trident: {
    id: 'poseidon_trident',
    name: "Poseidon's Trident Rod",
    emoji: '⚡',
    cost: 75000,
    cooldownSec: 15,
    desc: '3x chance for Legendary sea creatures! Cooldown reduced to 15s.'
  }
};

export const FISH_TIERS = {
  junk: {
    id: 'junk',
    name: 'Junk / Trash',
    emoji: '👞',
    color: '#95A5A6',
    catches: [
      { name: 'Old Boot', emoji: '👞', minPrice: 5, maxPrice: 25, minWeight: 0.3, maxWeight: 2.0 },
      { name: 'Rusty Can', emoji: '🥫', minPrice: 5, maxPrice: 20, minWeight: 0.1, maxWeight: 0.8 },
      { name: 'Seaweed', emoji: '🌿', minPrice: 5, maxPrice: 15, minWeight: 0.2, maxWeight: 1.5 },
      { name: 'Driftwood', emoji: '🪵', minPrice: 10, maxPrice: 25, minWeight: 0.8, maxWeight: 4.0 }
    ]
  },
  common: {
    id: 'common',
    name: 'Common Fish',
    emoji: '🐟',
    color: '#3498DB',
    catches: [
      { name: 'Carp', emoji: '🐟', minPrice: 50, maxPrice: 120, minWeight: 1.0, maxWeight: 6.0 },
      { name: 'Tilapia', emoji: '🐠', minPrice: 60, maxPrice: 130, minWeight: 0.8, maxWeight: 4.5 },
      { name: 'Pufferfish', emoji: '🐡', minPrice: 70, maxPrice: 150, minWeight: 0.5, maxWeight: 3.0 },
      { name: 'River Shrimp', emoji: '🦐', minPrice: 50, maxPrice: 100, minWeight: 0.2, maxWeight: 1.2 }
    ]
  },
  rare: {
    id: 'rare',
    name: 'Uncommon / Rare',
    emoji: '🐙',
    color: '#9B59B6',
    catches: [
      { name: 'Giant Octopus', emoji: '🐙', minPrice: 350, maxPrice: 850, minWeight: 5.0, maxWeight: 22.0 },
      { name: 'Golden Lobster', emoji: '🦞', minPrice: 400, maxPrice: 900, minWeight: 2.0, maxWeight: 9.0 },
      { name: 'King Salmon', emoji: '🍣', minPrice: 300, maxPrice: 750, minWeight: 4.0, maxWeight: 18.0 }
    ]
  },
  epic: {
    id: 'epic',
    name: 'Epic Creatures',
    emoji: '🐬',
    color: '#E67E22',
    catches: [
      { name: 'Blue Dolphin', emoji: '🐬', minPrice: 1200, maxPrice: 3800, minWeight: 25.0, maxWeight: 85.0 },
      { name: 'Hammerhead Shark', emoji: '🦈', minPrice: 1500, maxPrice: 4500, minWeight: 40.0, maxWeight: 180.0 },
      { name: 'Electric Jellyfish', emoji: '🪼', minPrice: 1200, maxPrice: 3200, minWeight: 5.0, maxWeight: 30.0 }
    ]
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary / Mythic',
    emoji: '🔱',
    color: '#F1C40F',
    catches: [
      { name: 'Megalodon', emoji: '🦈', minPrice: 15000, maxPrice: 50000, minWeight: 300.0, maxWeight: 1200.0 },
      { name: 'Kraken Tentacle', emoji: '👑', minPrice: 12000, maxPrice: 40000, minWeight: 150.0, maxWeight: 600.0 },
      { name: "Neptune's Relic", emoji: '🔱', minPrice: 20000, maxPrice: 50000, minWeight: 20.0, maxWeight: 100.0 }
    ]
  }
};

/**
 * Returns probability distribution based on equipped rod
 */
export const getRodProbabilities = (rodId) => {
  switch (rodId) {
    case 'fiberglass':
      // Drops junk rate by 10%
      return { junk: 0.25, common: 0.46, rare: 0.22, epic: 0.06, legendary: 0.01 };
    case 'carbon_pro':
      // +15% chance for Rare / Epic catches
      return { junk: 0.20, common: 0.38, rare: 0.28, epic: 0.12, legendary: 0.02 };
    case 'poseidon_trident':
      // 3x chance for Legendary sea creatures
      return { junk: 0.15, common: 0.37, rare: 0.30, epic: 0.15, legendary: 0.03 };
    case 'bamboo':
    default:
      return { junk: 0.35, common: 0.40, rare: 0.18, epic: 0.06, legendary: 0.01 };
  }
};

/**
 * Calculates a random catch according to probabilities and weight multiplier
 */
export const rollCatch = (rodId = 'bamboo') => {
  const probs = getRodProbabilities(rodId);
  const rand = Math.random();

  let selectedTierKey = 'junk';
  let cumulative = 0;

  const tiersInOrder = ['legendary', 'epic', 'rare', 'common', 'junk'];
  // Re-map for standard top-down or bottom-up
  // Let's do cumulative from bottom:
  cumulative += probs.junk;
  if (rand < cumulative) {
    selectedTierKey = 'junk';
  } else {
    cumulative += probs.common;
    if (rand < cumulative) {
      selectedTierKey = 'common';
    } else {
      cumulative += probs.rare;
      if (rand < cumulative) {
        selectedTierKey = 'rare';
      } else {
        cumulative += probs.epic;
        if (rand < cumulative) {
          selectedTierKey = 'epic';
        } else {
          selectedTierKey = 'legendary';
        }
      }
    }
  }

  const tierObj = FISH_TIERS[selectedTierKey];
  const items = tierObj.catches;
  const item = items[Math.floor(Math.random() * items.length)];

  // Random base price between minPrice and maxPrice
  const basePrice = Math.floor(Math.random() * (item.maxPrice - item.minPrice + 1)) + item.minPrice;

  // Random weight between minWeight and maxWeight with 1 decimal precision
  const rawWeight = (Math.random() * (item.maxWeight - item.minWeight)) + item.minWeight;
  const weightKg = parseFloat(rawWeight.toFixed(1));

  // Weight Multiplier Formula: Value = Base Price + (Weight in kg * 10)
  const totalValue = basePrice + Math.round(weightKg * 10);

  return {
    id: `catch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: item.name,
    emoji: item.emoji,
    tier: selectedTierKey,
    tierName: tierObj.name,
    basePrice,
    weightKg,
    value: totalValue,
    caughtAt: new Date().toISOString()
  };
};

/**
 * Initializes and ensures the user's fishing object structure exists
 */
export const getUserFishing = (userDoc) => {
  if (!userDoc.fishing) {
    userDoc.fishing = {
      rod: 'bamboo',
      catches: [],
      stats: {
        totalCaught: 0,
        totalEarnings: 0,
        heaviestCatch: null,
        rarestCatch: null
      }
    };
  }
  if (!Array.isArray(userDoc.fishing.catches)) {
    userDoc.fishing.catches = [];
  }
  if (!userDoc.fishing.stats) {
    userDoc.fishing.stats = {
      totalCaught: userDoc.fishing.catches.length,
      totalEarnings: 0,
      heaviestCatch: null,
      rarestCatch: null
    };
  }
  if (!userDoc.fishing.rod || !RODS[userDoc.fishing.rod]) {
    userDoc.fishing.rod = 'bamboo';
  }
  return userDoc.fishing;
};

/**
 * Sells catches according to category: 'junk' | 'fish' | 'all'
 * - 'junk': Sells only Junk/Trash
 * - 'fish': Sells Common & Rare (keeps Epic & Legendary safe)
 * - 'all': Sells everything in creel
 */
export const sellCatches = (userDoc, category = 'all') => {
  const fishing = getUserFishing(userDoc);
  const catches = fishing.catches;

  if (catches.length === 0) {
    return { soldCount: 0, totalEarnings: 0, soldItems: [], remainingCount: 0 };
  }

  const soldItems = [];
  const remainingCatches = [];

  for (const item of catches) {
    let shouldSell = false;

    if (category === 'junk') {
      shouldSell = (item.tier === 'junk');
    } else if (category === 'fish') {
      shouldSell = (item.tier === 'common' || item.tier === 'rare');
    } else {
      // 'all'
      shouldSell = true;
    }

    if (shouldSell) {
      soldItems.push(item);
    } else {
      remainingCatches.push(item);
    }
  }

  const totalEarnings = soldItems.reduce((sum, item) => sum + (item.value || 0), 0);
  fishing.catches = remainingCatches;
  fishing.stats.totalEarnings = (fishing.stats.totalEarnings || 0) + totalEarnings;

  return {
    soldCount: soldItems.length,
    totalEarnings,
    soldItems,
    remainingCount: remainingCatches.length
  };
};

/**
 * Get Amdavadi Riya's reaction quote based on catch tier
 */
export const getFishingQuote = (tier) => {
  switch (tier) {
    case 'legendary':
      return 'BAPRE BAP! A true sea monster, baka! Even the fishermen at Sabarmati riverfront never seen anything like this! 🔱👑';
    case 'epic':
      return 'Haaash! What an incredible catch! Your line almost snapped, but you reeled it like a pro gamer! 🔥';
    case 'rare':
      return 'Saras baka! That is a prized beauty right there! Market mein heavy price milegi! 🦞✨';
    case 'common':
      return 'Nice catch baka! Fresh and plump fish for the market basket! 🐟';
    case 'junk':
    default:
      return 'Arre re baka, an old boot from the riverbed! Clean it out at the /sell market or upgrade your rod! 👞';
  }
};

/**
 * Fetches and ranks the top fishers for a guild or globally
 * @param {string} guildId - Guild ID or 'global'
 * @param {'heaviest' | 'earnings' | 'caught'} metric - Ranking criteria
 * @param {number} limitCount - Max top users to return
 */
export const getFishingLeaderboard = async (guildId, metric = 'heaviest', limitCount = 10) => {
  const { getDb, getAdminDb } = await import('../database/connect.js');
  const admin = getAdminDb();
  let users = [];

  if (admin) {
    try {
      let queryRef = admin.collection('users');
      if (guildId && guildId !== 'dm' && guildId !== 'global') {
        queryRef = queryRef.where('guildId', '==', guildId);
      }
      const snap = await queryRef.get();
      snap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.fishing && (u.fishing.stats || (u.fishing.catches && u.fishing.catches.length > 0))) {
          users.push(u);
        }
      });
    } catch (err) {
      logger.warn(`Admin SDK read failed for fishing leaderboard: ${err.message}`);
    }
  }

  if (users.length === 0) {
    const db = getDb();
    if (db) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        let q;
        if (guildId && guildId !== 'dm' && guildId !== 'global') {
          q = query(usersRef, where('guildId', '==', guildId));
        } else {
          q = query(usersRef);
        }
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          const u = docSnap.data();
          if (u.fishing && (u.fishing.stats || (u.fishing.catches && u.fishing.catches.length > 0))) {
            users.push(u);
          }
        });
      } catch (err) {
        logger.warn(`Client SDK read failed for fishing leaderboard: ${err.message}`);
      }
    }
  }

  // Sort based on metric
  users.sort((a, b) => {
    const fA = a.fishing || {};
    const fB = b.fishing || {};

    if (metric === 'earnings') {
      const earnA = fA.stats?.totalEarnings || 0;
      const earnB = fB.stats?.totalEarnings || 0;
      return earnB - earnA;
    } else if (metric === 'caught') {
      const caughtA = fA.stats?.totalCaught || fA.catches?.length || 0;
      const caughtB = fB.stats?.totalCaught || fB.catches?.length || 0;
      return caughtB - caughtA;
    } else {
      // Default: 'heaviest'
      const weightA = fA.stats?.heaviestCatch?.weightKg || 0;
      const weightB = fB.stats?.heaviestCatch?.weightKg || 0;
      return weightB - weightA;
    }
  });

  return users.slice(0, limitCount);
};

