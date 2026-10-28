import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getDb } from '../database/connect.js';
import { logger } from '../utils/logger.js';

// In-memory fallback card storage if Firestore is offline
const memoryFallbackCards = new Map();
const memoryUserWishlists = new Map();

// Anime Characters Database
export const ANIME_DATABASE = [
  {
    character: 'Nezuko Kamado',
    series: 'Demon Slayer: Kimetsu no Yaiba',
    image: 'https://cdn.donmai.us/sample/a7/09/__nezuko_kamado_kimetsu_no_yaiba_drawn_by_ryota_h__sample-a709d6f6e80b4d4554b706c9b4e7edb3.jpg'
  },
  {
    character: 'Zero Two',
    series: 'DARLING in the FRANXX',
    image: 'https://i.pinimg.com/736x/8f/3e/2d/8f3e2d6b2c7e099689626359218205f9.jpg'
  },
  {
    character: 'Mikasa Ackerman',
    series: 'Attack on Titan',
    image: 'https://i.pinimg.com/736x/87/1c/d2/871cd2e68406f52e071e7d95a0a7ec69.jpg'
  },
  {
    character: 'Gojo Satoru',
    series: 'Jujutsu Kaisen',
    image: 'https://i.pinimg.com/736x/df/76/89/df768910086c8f615e44a30d5071bd1f.jpg'
  },
  {
    character: 'Yor Forger',
    series: 'Spy x Family',
    image: 'https://i.pinimg.com/736x/2a/bc/40/2abc40081d48cfa0b3a728b9d883907c.jpg'
  },
  {
    character: 'Marin Kitagawa',
    series: 'My Dress-Up Darling',
    image: 'https://i.pinimg.com/736x/da/9c/04/da9c0494519962a9bd28d0eb5f4f4648.jpg'
  },
  {
    character: 'Makima',
    series: 'Chainsaw Man',
    image: 'https://i.pinimg.com/736x/48/43/3e/48433e50774a383b169ae87900bfa3f8.jpg'
  },
  {
    character: 'Eris',
    series: 'Asobi ni Iku yo!',
    image: 'https://i.pinimg.com/736x/4f/2e/8b/4f2e8b2611e92d83b4cf635bc550bf22.jpg'
  },
  {
    character: 'Megumi Fushiguro',
    series: 'Jujutsu Kaisen',
    image: 'https://i.pinimg.com/736x/55/a1/9d/55a19d36371cf6bb3e9bd7f461e88e33.jpg'
  },
  {
    character: 'Rem',
    series: 'Re:Zero - Starting Life in Another World',
    image: 'https://i.pinimg.com/736x/71/3f/8a/713f8a4269e38d77c387b3a4a621746f.jpg'
  },
  {
    character: 'Kaguya Shinomiya',
    series: 'Kaguya-sama: Love is War',
    image: 'https://i.pinimg.com/736x/b3/6c/42/b36c4295eefc3a0670984eeed1a0efc6.jpg'
  },
  {
    character: 'Saitama',
    series: 'One Punch Man',
    image: 'https://i.pinimg.com/736x/58/b8/0a/58b80a42410a8f79f4c39d738f6b0fef.jpg'
  }
];

// Helper to generate a random 4-character card code (e.g. "v18v", "vt8t", "qndr")
export const generateCardCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Global print counter simulator
let printCounter = 1;

export const createNewCard = (charData, ownerId = null) => {
  const starsOptions = ['★☆☆☆', '★★☆☆', '★★★☆', '★★★★'];
  const quality = starsOptions[Math.floor(Math.random() * starsOptions.length)];

  return {
    code: generateCardCode(),
    character: charData.character,
    series: charData.series,
    image: charData.image,
    stars: quality,
    print: printCounter++,
    condition: quality === '★★★★' ? 'mint' : quality === '★★★☆' ? 'excellent' : 'good',
    ownerId: ownerId,
    createdAt: new Date().toISOString()
  };
};

export const saveCardToDb = async (card) => {
  const db = getDb();
  if (db) {
    try {
      const cardRef = doc(db, 'anime_cards', card.code);
      await setDoc(cardRef, card, { merge: true });
    } catch (err) {
      logger.warn(`Failed to save card to Firestore: ${err.message}`);
    }
  }
  memoryFallbackCards.set(card.code, card);
  return card;
};

export const getCardByCode = async (code) => {
  const db = getDb();
  if (db) {
    try {
      const cardRef = doc(db, 'anime_cards', code);
      const cardSnap = await getDoc(cardRef);
      if (cardSnap.exists()) return cardSnap.data();
    } catch (err) {
      logger.warn(`Failed to fetch card ${code}: ${err.message}`);
    }
  }
  return memoryFallbackCards.get(code) || null;
};

export const getUserCollection = async (userId) => {
  const db = getDb();
  let cards = [];
  if (db) {
    try {
      const cardsRef = collection(db, 'anime_cards');
      const q = query(cardsRef, where('ownerId', '==', userId));
      const querySnap = await getDocs(q);
      querySnap.forEach(d => cards.push(d.data()));
    } catch (err) {
      logger.warn(`Failed to fetch user collection: ${err.message}`);
    }
  }

  if (cards.length === 0) {
    for (const card of memoryFallbackCards.values()) {
      if (card.ownerId === userId) cards.push(card);
    }
  }

  return cards;
};

export const deleteCardFromDb = async (code) => {
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'anime_cards', code));
    } catch (err) {
      logger.warn(`Failed to delete card ${code}: ${err.message}`);
    }
  }
  memoryFallbackCards.delete(code);
};

export const getUserWishlist = (userId) => {
  return memoryUserWishlists.get(userId) || [];
};

export const addToWishlist = (userId, characterName) => {
  let wishlist = memoryUserWishlists.get(userId) || [];
  if (!wishlist.includes(characterName)) {
    wishlist.push(characterName);
    memoryUserWishlists.set(userId, wishlist);
  }
  return wishlist;
};

export const removeFromWishlist = (userId, characterName) => {
  let wishlist = memoryUserWishlists.get(userId) || [];
  wishlist = wishlist.filter(name => name.toLowerCase() !== characterName.toLowerCase());
  memoryUserWishlists.set(userId, wishlist);
  return wishlist;
};
