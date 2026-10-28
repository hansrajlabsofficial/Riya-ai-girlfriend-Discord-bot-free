import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb, getAdminDb } from '../connect.js';
import { logger } from '../../utils/logger.js';

const memoryFallbackGangs = new Map();

export const getGangData = async (gangId) => {
  const admin = getAdminDb();
  if (admin) {
    try {
      const gangSnap = await admin.collection('gangs').doc(gangId).get();
      if (gangSnap.exists) {
        const data = gangSnap.data();
        data._gangId = gangId;
        data.save = async function () {
          return await saveGangData(this);
        };
        return data;
      }
    } catch (err) {
      logger.warn(`Admin SDK read failed for gang ${gangId}: ${err.message}`);
    }
  }

  const db = getDb();
  if (db) {
    try {
      const gangRef = doc(db, 'gangs', gangId);
      const gangSnap = await getDoc(gangRef);

      if (gangSnap.exists()) {
        const data = gangSnap.data();
        data._gangId = gangId;
        data.save = async function () {
          return await saveGangData(this);
        };
        return data;
      }
    } catch (err) {
      logger.warn(`Firestore read failed for gang ${gangId}: ${err.message}`);
    }
  }

  if (memoryFallbackGangs.has(gangId)) {
    return memoryFallbackGangs.get(gangId);
  }
  return null;
};

export const createGangData = async (gangId, name, ownerId) => {
  const gang = {
    _gangId: gangId,
    gangId,
    name,
    ownerId,
    members: [{ userId: ownerId, rank: 'Leader' }],
    vault: 0,
    isOpen: false,
    createdAt: new Date().toISOString()
  };
  gang.save = async function () {
    return await saveGangData(this);
  };
  await saveGangData(gang);
  return gang;
};

export const saveGangData = async (gangData) => {
  if (!gangData.gangId) return gangData;
  memoryFallbackGangs.set(gangData.gangId, gangData);

  const admin = getAdminDb();
  if (admin) {
    try {
      const dataToSave = { ...gangData };
      delete dataToSave._gangId;
      delete dataToSave.save;

      await admin.collection('gangs').doc(gangData.gangId).set(dataToSave, { merge: true });
      return gangData;
    } catch (err) {
      logger.warn(`Admin SDK save failed for gang ${gangData.gangId}: ${err.message}`);
    }
  }

  const db = getDb();
  if (db) {
    try {
      const gangRef = doc(db, 'gangs', gangData.gangId);
      const dataToSave = { ...gangData };
      delete dataToSave._gangId;
      delete dataToSave.save;

      await setDoc(gangRef, dataToSave, { merge: true });
    } catch (err) {
      logger.warn(`Firestore save failed for gang ${gangData.gangId}: ${err.message}`);
    }
  }
  return gangData;
};
