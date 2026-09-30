import { useState } from "react";
import { Organization, User } from "../../types";
import { loadCache, sanitizeForFirestore, updateBackpackPersonalInfo } from "../utils/backpackUtils";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export const useOrganizations = (currentUser: User | null) => {
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    loadCache("organizations", []),
  );

  const addOrganization = async (org: Organization) => {
    const cleaned = sanitizeForFirestore(org);
    const targetUid = org.ownerId || org.id || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackPersonalInfo(targetUid, {
        id: org.id || targetUid,
        name: org.name,
        fullname: org.name,
        description: org.description,
        logoUrl: org.logoUrl,
        ownerId: targetUid,
        baseCurrency: org.baseCurrency,
        location: org.location,
        orgType: org.orgType,
        kycVerified: org.kycVerified ?? false,
        kycDocumentUrl: org.kycDocumentUrl,
        address: org.address,
        registrationId: org.registrationId,
        isAccredited: org.isAccredited ?? false,
        accreditingBody: org.accreditingBody,
        accreditationStatus:
          org.accreditationStatus ||
          (org.isAccredited ? "accredited" : "unaccredited"),
        accreditationDocUrl: org.accreditationDocUrl,
        motto: org.motto,
        phone: org.phone,
        website: org.website,
        themeColor: org.themeColor,
        academicHighlights: org.academicHighlights,
        isDeleted: false,
        role: "organization",
      });
    }
    setOrganizations((prev) => [
      ...prev.filter((o) => o.id !== org.id),
      cleaned,
    ]);
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    const org = organizations.find((o) => o.id === id);
    if (org) {
      const targetUid = org.ownerId || org.id || currentUser?.id || "";
      if (targetUid) {
        const cleaned = sanitizeForFirestore(updates);
        await updateBackpackPersonalInfo(targetUid, cleaned);
      }
    }
    setOrganizations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    );
  };

  const deleteOrganization = async (id: string) => {
    const org = organizations.find((o) => o.id === id);
    if (org) {
      const targetUid = org.ownerId || org.id || currentUser?.id || "";
      if (targetUid) {
        await updateBackpackPersonalInfo(targetUid, { isDeleted: true });
        const docRef = doc(db, "backpack", targetUid);
        await updateDoc(docRef, { "user.personalInformation.isDeleted": true }).catch(
          () => {}
        );
      }
    }
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
  };

  const deleteOrganizationLocally = (id: string) => {
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
  };

  return {
    organizations,
    setOrganizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    deleteOrganizationLocally,
  };
};
