/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export const sanitizeForFirestore = <T extends Record<string, any>>(
  record: T,
): T => {
  const cleaned: any = {};
  for (const key in record) {
    const val = record[key];
    if (val !== undefined) {
      if (
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val) &&
        !((val as any) instanceof Date)
      ) {
        cleaned[key] = sanitizeForFirestore(val as any);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned as T;
};

// Helper function to extract user data whether stored as an object or legacy array
export const getUserData = (
  data: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!data) return {};
  if (Array.isArray(data.user)) {
    return (data.user[0] as Record<string, unknown>) || {};
  }
  return (data.user as Record<string, unknown>) || {};
};

export const loadCache = <T>(key: string, fallback: T): T => {
  try {
    const cached = localStorage.getItem(`bp_cache_${key}`);
    return cached ? JSON.parse(cached) : fallback;
  } catch {
    return fallback;
  }
};

export const updateAndCache = <T>(
  key: string,
  data: T,
  setter: (val: T) => void,
) => {
  setter(data);
  try {
    localStorage.setItem(`bp_cache_${key}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

// Helper to update arrays within the user object of a backpack document
export const updateBackpackUserField = async <T extends { id?: string }>(
  userId: string,
  field: string,
  updater: (currentList: T[]) => T[],
) => {
  if (!userId) return;
  const docRef = doc(db, "backpack", userId);
  try {
    // We cannot reliably use arrayUnion/arrayRemove for complex nested objects
    // So we run a transaction or a read-modify-write.
    // For simplicity, we use read-modify-write as we did previously.
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const userObj = getUserData(data);

      // Correctly resolve nested fields (e.g. 'course.courses' -> userObj.course.courses)
      let updatedList: T[];
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const parentObj = (userObj[parent] as Record<string, any>) || {};
        let currentList: T[] = [];
        if (Array.isArray(parentObj[child])) {
          currentList = parentObj[child] as T[];
        }
        updatedList = updater(currentList);
        await updateDoc(docRef, { [`user.${parent}.${child}`]: updatedList });
      } else {
        let currentList: T[] = [];
        if (Array.isArray(userObj[field])) {
          currentList = userObj[field] as T[];
        }
        updatedList = updater(currentList);
        await updateDoc(docRef, { [`user.${field}`]: updatedList });
      }
    } else {
      // Document does not exist yet; initialize with setDoc merge
      const { setDoc } = await import("firebase/firestore");
      let updatedList: T[];
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        updatedList = updater([]);
        await setDoc(docRef, { user: { [parent]: { [child]: updatedList } } }, { merge: true });
      } else {
        updatedList = updater([]);
        await setDoc(docRef, { user: { [field]: updatedList } }, { merge: true });
      }
    }
  } catch (err) {
    console.error(`Error updating ${field} in backpack/${userId}:`, err);
  }
};

// Helper to update personalInformation within the user object of a backpack document
export const updateBackpackPersonalInfo = async (
  userId: string,
  updates: Record<string, any>,
) => {
  if (!userId) return;
  const docRef = doc(db, "backpack", userId);
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const userObj = getUserData(data);
      const personalInfo =
        (userObj.personalInformation as Record<string, unknown>) || {};
      const updatedPersonalInfo = { ...personalInfo, ...updates };
      const updatedUser = {
        ...userObj,
        personalInformation: updatedPersonalInfo,
      };
      await updateDoc(docRef, { user: updatedUser });
    }
  } catch (err) {
    console.error(
      `updateBackpackPersonalInfo for user ${userId} failed:`,
      err,
    );
  }
};
