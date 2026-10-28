import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let initAdminApp = null;
let cert = null;
let getAdminApps = null;
let getAdminFirestore = null;

try {
  const adminApp = await import('firebase-admin/app');
  initAdminApp = adminApp.initializeApp;
  cert = adminApp.cert;
  getAdminApps = adminApp.getApps;

  const adminFs = await import('firebase-admin/firestore');
  getAdminFirestore = adminFs.getFirestore;
} catch (err) {
  logger.warn(`Firebase Admin SDK optional modules not loaded (${err.message}). Using client Firebase SDK mode.`);
}

let db = null;
let adminDb = null;
let isConnected = false;

export const getAdminDb = () => {
  if (!adminDb && getAdminFirestore && initAdminApp) {
    try {
      const app = getAdminApps().length === 0 
        ? initAdminApp({ credential: cert(config.serviceAccount) }) 
        : getAdminApps()[0];
      adminDb = getAdminFirestore(app);
      isConnected = true;
    } catch (err) {
      logger.warn(`Firebase Admin SDK init failed: ${err.message}`);
    }
  }
  return adminDb;
};

export const initializeAutoCollections = async () => {
  const admin = getAdminDb();
  if (!admin) return;
  try {
    await admin.collection('system').doc('status').set({
      status: 'online',
      botName: 'Riya AI Girlfriend',
      adminAuth: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const ownerId = '1016322069093';
    await admin.collection('users').doc(`global_${ownerId}`).set({
      userId: ownerId,
      username: 'HANSRAJxFPS',
      displayName: 'A S 友 H A N S R A J 🍃',
      balance: 0,
      bank: 258590,
      level: 1,
      xp: 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await admin.collection('user_sessions').doc(`session_${ownerId}`).set({
      userId: ownerId,
      username: 'HANSRAJxFPS',
      displayName: 'A S 友 H A N S R A J 🍃',
      bank: 258590,
      balance: 0,
      level: 1,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info('Auto-seeded system, users, and user_sessions collections in Firestore using Admin SDK!');
  } catch (err) {
    logger.warn(`Could not auto-seed collections: ${err.message}`);
  }
};

export const connectDatabase = async () => {
  try {
    getAdminDb();
    const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
    db = getFirestore(app);
    isConnected = true;
    logger.info(`Successfully initialized Firebase Firestore DB (Project ID: ${config.firebaseConfig.projectId})`);
    initializeAutoCollections().catch(() => {});
  } catch (error) {
    logger.error('Failed to initialize Firebase Firestore DB. Falling back to in-memory store.', error);
    isConnected = false;
  }
  return db;
};

export const getDb = () => {
  if (!db) {
    try {
      const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
      db = getFirestore(app);
      isConnected = true;
    } catch (err) {
      logger.error('Failed lazy initialization of Firebase Firestore DB:', err);
    }
  }
  return db;
};

export const getDbStatus = () => isConnected;
