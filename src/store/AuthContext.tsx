/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import { User, Role } from "../types";

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface AuthState {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<{ user: FirebaseUser; role: Role }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ user: FirebaseUser; role: Role }>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  currentUser: null,
  firebaseUser: null,
  loading: true,
  updateCurrentUser: async () => {},
  signup: async () => {
    throw new Error("Not implemented");
  },
  login: async () => {
    throw new Error("Not implemented");
  },
  logout: async () => {},
  resetPassword: async () => {
    throw new Error("Not implemented");
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("backpack_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("backpack_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("backpack_user");
    }
  }, [currentUser]);

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      throw new Error("Please enter a valid actual email address.");
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      throw new Error(
        "Please enter a valid actual email address (e.g. name@domain.com).",
      );
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password,
    );
    const user = userCredential.user;

    if (name) {
      try {
        await updateProfile(user, { displayName: name });
      } catch (e) {
        console.warn("Could not update auth displayName", e);
      }
    }

    const personalInformation = {
      id: user.uid,
      fullname: name,
      name: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      ownerId: user.uid,
      kycVerified: false,
    };

    const course = {
      orgMembers: [],
      courses: [],
      userProgress: [],
      materials: [],
      attendance: [],
      assessments: [],
      submissions: [],
      scheduleEvents: [],
      messages: [],
    };

    // Initialize the user document in Firestore
    await setDoc(doc(db, "backpack", user.uid), {
      user: {
        personalInformation,
        enrollmentRequests: [],
        orgJoinRequests: [],
        course,
      },
    });

    const newUserObj = {
      id: user.uid,
      name: name,
      email: email,
      role: role,
      createdAt: personalInformation.createdAt,
      kycVerified: false,
      ownerId: user.uid,
    } as User;

    setCurrentUser(newUserObj);
    setFirebaseUser(user);
    setLoading(false);

    return { user, role };
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      throw new Error("Please enter a valid actual email address.");
    }
    const userCredential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password,
    );
    const user = userCredential.user;

    let userRole: Role = "student";
    try {
      const docSnap = await getDoc(doc(db, "backpack", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj = Array.isArray(data.user) ? data.user[0] : data.user;
        userRole = userObj?.personalInformation?.role || "student";
      }
    } catch (e) {
      console.warn("Could not pre-fetch role on login", e);
    }

    setFirebaseUser(user);
    return { user, role: userRole };
  };

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setCurrentUser(null);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("bp_cache_")) {
        localStorage.removeItem(key);
      }
    });
  };

  const updateCurrentUser = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const docRef = doc(db, "backpack", currentUser.id);

    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj = Array.isArray(data.user)
          ? data.user[0] || {}
          : data.user || {};
        const personalInfo = userObj.personalInformation || {};

        const updatedPersonalInfo = { ...personalInfo };
        if (updates.name !== undefined)
          updatedPersonalInfo.fullname = updates.name;
        if (updates.role !== undefined) updatedPersonalInfo.role = updates.role;
        if (updates.email !== undefined)
          updatedPersonalInfo.email = updates.email;
        if (updates.headline !== undefined)
          updatedPersonalInfo.headline = updates.headline;
        if (updates.bio !== undefined) updatedPersonalInfo.bio = updates.bio;
        if (updates.cvUrl !== undefined)
          updatedPersonalInfo.cvUrl = updates.cvUrl;
        if (updates.kycDocumentUrl !== undefined)
          updatedPersonalInfo.kycDocumentUrl = updates.kycDocumentUrl;
        if (updates.kycVerified !== undefined)
          updatedPersonalInfo.kycVerified = updates.kycVerified;
        if (updates.userDocuments !== undefined)
          updatedPersonalInfo.userDocuments = updates.userDocuments;
        if (updates.paystackSubaccount !== undefined)
          updatedPersonalInfo.paystackSubaccount = updates.paystackSubaccount;

        // Organization data stored directly within personalInformation map
        if (updates.description !== undefined)
          updatedPersonalInfo.description = updates.description;
        if (updates.address !== undefined)
          updatedPersonalInfo.address = updates.address;
        if (updates.location !== undefined)
          updatedPersonalInfo.location = updates.location;
        if (updates.baseCurrency !== undefined)
          updatedPersonalInfo.baseCurrency = updates.baseCurrency;
        if (updates.orgType !== undefined)
          updatedPersonalInfo.orgType = updates.orgType;
        if (updates.registrationId !== undefined)
          updatedPersonalInfo.registrationId = updates.registrationId;
        if (updates.isAccredited !== undefined)
          updatedPersonalInfo.isAccredited = updates.isAccredited;
        if (updates.accreditingBody !== undefined)
          updatedPersonalInfo.accreditingBody = updates.accreditingBody;
        if (updates.accreditationStatus !== undefined)
          updatedPersonalInfo.accreditationStatus = updates.accreditationStatus;
        if (updates.accreditationDocUrl !== undefined)
          updatedPersonalInfo.accreditationDocUrl = updates.accreditationDocUrl;
        if (updates.ownerId !== undefined)
          updatedPersonalInfo.ownerId = updates.ownerId;
        if (updates.logoUrl !== undefined)
          updatedPersonalInfo.logoUrl = updates.logoUrl;
        if (updates.motto !== undefined)
          updatedPersonalInfo.motto = updates.motto;
        if (updates.phone !== undefined)
          updatedPersonalInfo.phone = updates.phone;
        if (updates.website !== undefined)
          updatedPersonalInfo.website = updates.website;
        if (updates.themeColor !== undefined)
          updatedPersonalInfo.themeColor = updates.themeColor;
        if (updates.academicHighlights !== undefined)
          updatedPersonalInfo.academicHighlights = updates.academicHighlights;
        if (updates.isDeleted !== undefined)
          updatedPersonalInfo.isDeleted = updates.isDeleted;

        // Remove undefined keys so Firestore doesn't fail
        const sanitizedPersonalInfo = Object.fromEntries(
          Object.entries(updatedPersonalInfo).filter(
            ([, v]) => v !== undefined,
          ),
        );

        const updatedUser = {
          ...userObj,
          personalInformation: sanitizedPersonalInfo,
        };

        await updateDoc(docRef, { user: updatedUser });
      }

      // Optimistic update
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error("Error updating user", err);
    }
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user: FirebaseUser | null) => {
        setFirebaseUser(user);
        if (user) {
          // Use onSnapshot to continuously sync the user doc
          unsubscribeDoc = onSnapshot(
            doc(db, "backpack", user.uid),
            (docSnap: { exists: () => any; data: () => any }) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const userObj = Array.isArray(data.user)
                  ? data.user[0]
                  : data.user;
                const personalInfo = userObj?.personalInformation;

                if (personalInfo) {
                  setCurrentUser({
                    id: user.uid,
                    name:
                      personalInfo.fullname ||
                      personalInfo.name ||
                      user.displayName ||
                      user.email?.split("@")[0],
                    email: personalInfo.email || user.email || "",
                    role: personalInfo.role || "student",
                    createdAt:
                      personalInfo.createdAt || new Date().toISOString(),
                    headline: personalInfo.headline,
                    bio: personalInfo.bio,
                    cvUrl: personalInfo.cvUrl,
                    kycDocumentUrl: personalInfo.kycDocumentUrl,
                    kycVerified: personalInfo.kycVerified,
                    userDocuments: personalInfo.userDocuments,
                    paystackSubaccount: personalInfo.paystackSubaccount,
                    description: personalInfo.description,
                    address: personalInfo.address,
                    location: personalInfo.location,
                    baseCurrency: personalInfo.baseCurrency,
                    orgType: personalInfo.orgType,
                    registrationId: personalInfo.registrationId,
                    isAccredited: personalInfo.isAccredited,
                    accreditingBody: personalInfo.accreditingBody,
                    accreditationStatus: personalInfo.accreditationStatus,
                    accreditationDocUrl: personalInfo.accreditationDocUrl,
                    ownerId: personalInfo.ownerId || user.uid,
                    logoUrl: personalInfo.logoUrl,
                    motto: personalInfo.motto,
                    phone: personalInfo.phone,
                    website: personalInfo.website,
                    themeColor: personalInfo.themeColor,
                    academicHighlights: personalInfo.academicHighlights,
                    isDeleted: personalInfo.isDeleted,
                  } as User);
                }
              }
              setLoading(false);
            },
            (error: any) => {
              console.error("Error fetching user data", error);
              setLoading(false);
            },
          );
        } else {
          if (unsubscribeDoc) unsubscribeDoc();
          setCurrentUser(null);
          setLoading(false);
        }
      },
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        updateCurrentUser,
        signup,
        login,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
