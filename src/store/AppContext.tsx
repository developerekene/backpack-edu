/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  onSnapshot,
} from "firebase/firestore";
import {
  Assessment,
  Submission,
  ScheduleEvent,
  Organization,
  Course,
  EnrollmentRequest,
  UserProgress,
  AttendanceRecord,
  Material,
  ChatMessage,
  OrgJoinRequest,
  OrgMember,
  AppNotification,
  AdmissionSession,
  ReapplicationRecord,
  DiscussionChannel,
  DiscussionMessage,
  DiscussionPoll,
  CoursePresence,
  DiscussionResource,
  CourseDonation,
  OrgPlanTier,
} from "../types";
import { useAuth } from "./AuthContext";
import { sendPushNotification } from "../lib/pushNotifications";
import { generateId } from "../lib/id";
import { getLiveClassRoomName, getJitsiMeetingUrl } from "../lib/liveClass";

export interface AdmissionGateStatus {
  isVocational: boolean;
  isDonationFunded: boolean;
  tuitionCostPerStudent: number;
  totalDonations: number;
  maxAdmissibleStudents: number;
  currentlyAdmittedCount: number;
  remainingSpots: number;
  canAdmitMore: boolean;
  currency: string;
  nextSeatNeededAmount: number;
}

interface AppState {
  organizations: Organization[];
  courses: Course[];
  enrollmentRequests: EnrollmentRequest[];
  courseDonations: CourseDonation[];
  orgJoinRequests: OrgJoinRequest[];
  orgMembers: OrgMember[];
  userProgress: UserProgress[];
  materials: Material[];
  attendanceRecords: AttendanceRecord[];
  assessments: Assessment[];
  submissions: Submission[];
  scheduleEvents: ScheduleEvent[];
  messages: ChatMessage[];
  discussionChannels: DiscussionChannel[];
  discussionMessages: DiscussionMessage[];
  discussionPolls: DiscussionPoll[];
  coursePresence: CoursePresence[];
  notifications: AppNotification[];
  isLoadingApp: boolean;

  addOrganization: (org: Organization) => Promise<void>;
  updateOrganization: (
    id: string,
    updates: Partial<Organization>,
  ) => Promise<void>;
  upgradeOrganizationPlan: (orgId: string) => void;
  deleteOrganization: (id: string) => Promise<void>;
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>;
  addCourseDonation: (donation: CourseDonation) => Promise<void>;
  getCourseAdmissionGate: (courseId: string) => AdmissionGateStatus;
  addEnrollmentRequest: (req: EnrollmentRequest) => Promise<void>;
  updateEnrollmentRequest: (
    id: string,
    status?: "approved" | "rejected" | "cancelled" | "pending",
    paymentStatus?: "unpaid" | "paid",
    rejectionReason?: string,
    extraUpdates?: Partial<EnrollmentRequest>,
  ) => Promise<void>;
  cancelEnrollmentRequest: (id: string) => Promise<void>;
  openCourseAdmission: (courseId: string, sessionId?: string) => Promise<void>;
  closeCourseAdmission: (courseId: string) => Promise<void>;
  createCourseAdmissionSession: (
    courseId: string,
    sessionData: {
      name: string;
      startDate?: string;
      endDate?: string;
      applicationDeadline?: string;
      academicYear?: string;
      notes?: string;
      autoOpen?: boolean;
    },
  ) => Promise<void>;
  updateCourseAdmissionSession: (
    courseId: string,
    sessionId: string,
    updates: Partial<AdmissionSession>,
  ) => Promise<void>;
  addOrgJoinRequest: (req: OrgJoinRequest) => Promise<void>;
  updateOrgJoinRequest: (
    id: string,
    status: "approved" | "rejected",
  ) => Promise<void>;
  addOrgMember: (member: OrgMember) => Promise<void>;
  updateOrgMember: (id: string, updates: Partial<OrgMember>) => Promise<void>;
  deleteOrgMember: (id: string) => Promise<void>;
  updateProgress: (progress: UserProgress) => Promise<void>;
  addMaterial: (material: Material) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addAttendanceRecord: (record: AttendanceRecord) => Promise<void>;
  sendMessage: (msg: ChatMessage) => Promise<void>;
  addDiscussionChannel: (channel: DiscussionChannel) => Promise<void>;
  addDiscussionMessage: (message: DiscussionMessage) => Promise<void>;
  toggleMessageReaction: (
    messageId: string,
    emoji: string,
    userId: string,
  ) => Promise<void>;
  setMessageVerified: (messageId: string, verified: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
  addPoll: (poll: DiscussionPoll) => Promise<void>;
  voteOnPoll: (
    pollId: string,
    optionId: string,
    userId: string,
  ) => Promise<void>;
  pingPresence: (
    courseId: string,
    userId: string,
    userName: string,
    role?: "instructor" | "ta" | "student",
  ) => Promise<void>;
  toggleChannelSubscription: (
    channelId: string,
    userId: string,
  ) => Promise<void>;
  addChannelResource: (
    channelId: string,
    resource: DiscussionResource,
  ) => Promise<void>;
  togglePinMessage: (messageId: string, pinned: boolean) => Promise<void>;

  addAssessment: (assessment: Assessment) => Promise<void>;
  addSubmission: (submission: Submission) => Promise<void>;
  updateSubmissionScore: (
    id: string,
    score: number,
    feedback: string,
  ) => Promise<void>;
  addScheduleEvent: (event: ScheduleEvent) => Promise<void>;
  updateScheduleEvent: (
    id: string,
    updates: Partial<ScheduleEvent>,
  ) => Promise<void>;
  deleteScheduleEvent: (id: string) => Promise<void>;
  addNotification: (
    notification: Omit<AppNotification, "id" | "createdAt" | "read">,
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const sanitizeForFirestore = <T,>(obj: T): T => {
  if (obj === undefined) return obj;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned = {} as Record<string, unknown>;
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (record[key] !== undefined) {
      cleaned[key] = sanitizeForFirestore(record[key]);
    }
  }
  return cleaned as T;
};

// Helper function to extract user data whether stored as an object or legacy array
const getUserData = (
  data: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!data) return {};
  if (Array.isArray(data.user)) {
    return (data.user[0] as Record<string, unknown>) || {};
  }
  return (data.user as Record<string, unknown>) || {};
};

const loadCache = <T,>(key: string, fallback: T): T => {
  try {
    const cached = localStorage.getItem(`bp_cache_${key}`);
    return cached ? JSON.parse(cached) : fallback;
  } catch {
    return fallback;
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();

  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    loadCache("organizations", []),
  );
  const [courses, setCourses] = useState<Course[]>(() =>
    loadCache("courses", []),
  );
  const [enrollmentRequests, setEnrollmentRequests] = useState<
    EnrollmentRequest[]
  >(() => loadCache("enrollmentRequests", []));
  const [courseDonations, setCourseDonations] = useState<CourseDonation[]>(() =>
    loadCache("courseDonations", []),
  );
  const [orgJoinRequests, setOrgJoinRequests] = useState<OrgJoinRequest[]>(() =>
    loadCache("orgJoinRequests", []),
  );
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>(() =>
    loadCache("course.orgMembers", []),
  );
  const [userProgress, setUserProgress] = useState<UserProgress[]>(() =>
    loadCache("course.userProgress", []),
  );
  const [materials, setMaterials] = useState<Material[]>(() =>
    loadCache("course.materials", []),
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >(() => loadCache("course.attendance", []));
  const [assessments, setAssessments] = useState<Assessment[]>(() =>
    loadCache("course.assessments", []),
  );
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    loadCache("course.submissions", []),
  );
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(() =>
    loadCache("course.scheduleEvents", []),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadCache("course.messages", []),
  );
  const [discussionChannels, setDiscussionChannels] = useState<
    DiscussionChannel[]
  >(() => loadCache("course.discussionChannels", []));
  const [discussionMessages, setDiscussionMessages] = useState<
    DiscussionMessage[]
  >(() => loadCache("course.discussionMessages", []));
  const [discussionPolls, setDiscussionPolls] = useState<DiscussionPoll[]>(() =>
    loadCache("course.discussionPolls", []),
  );
  const [coursePresence, setCoursePresence] = useState<CoursePresence[]>(() =>
    loadCache("course.coursePresence", []),
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadCache("notifications", []),
  );

  // Helper to update personalInformation within the user object of a backpack document
  const updateBackpackPersonalInfo = async (
    userId: string,
    updates: Record<string, unknown>,
  ) => {
    if (!userId) return;
    const docRef = doc(db, "backpack", userId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj = getUserData(data);
        const personalInfo =
          (userObj.personalInformation as Record<string, unknown>) || {};

        const updatedPersonalInfo = {
          ...personalInfo,
          ...sanitizeForFirestore(updates),
        };

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

  // Helper to update arrays within the user object of a backpack document
  const updateBackpackUserField = async <T extends { id?: string }>(
    userId: string,
    field: string,
    updateFn: (currentList: T[]) => T[],
  ) => {
    if (!userId) return;
    const docRef = doc(db, "backpack", userId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj = getUserData(data);

        // Correctly resolve nested fields (e.g. 'course.courses' -> userObj.course.courses)
        let currentList: T[] = [];
        const fieldParts = field.split(".");
        if (fieldParts.length === 2 && fieldParts[0] === "course") {
          const courseObj = (userObj.course as Record<string, any>) || {};
          if (Array.isArray(courseObj[fieldParts[1]])) {
            currentList = courseObj[fieldParts[1]] as T[];
          }
        } else {
          if (Array.isArray(userObj[field])) {
            currentList = userObj[field] as T[];
          }
        }

        const updatedList = updateFn(currentList);

        // Use Firestore dot notation to natively update the nested field without overwriting other map fields
        await updateDoc(docRef, { [`user.${field}`]: updatedList });
      }
    } catch (err) {
      console.error(`Error updating ${field} in backpack/${userId}:`, err);
    }
  };

  const addNotification = (
    notifData: Omit<AppNotification, "id" | "createdAt" | "read">,
  ) => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    };

    const targetUid = notifData.userId || currentUser?.id;
    if (targetUid) {
      updateBackpackUserField<AppNotification>(
        targetUid,
        "notifications",
        (list) => [newNotif, ...list],
      ).catch(console.error);
    }

    if (!notifData.userId || notifData.userId === currentUser?.id) {
      setNotifications((prev) => [newNotif, ...prev]);
      // Send push notification if granted
      sendPushNotification(newNotif.title, {
        body: newNotif.message,
        linkUrl: newNotif.linkUrl,
      });
    }
  };

  const markNotificationRead = (id: string) => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        (list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      ).catch(console.error);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        (list) => list.map((n) => ({ ...n, read: true })),
      ).catch(console.error);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        () => [],
      ).catch(console.error);
    }
    setNotifications([]);
  };

  // Fetch all global data and user-specific data from backpack documents
  const loadAllBackpackData = useCallback(async () => {
    try {
      const backpackSnap = await getDocs(collection(db, "backpack"));

      const allOrganizations: Organization[] = [];
      const allCourses: Course[] = [];
      const allEnrollmentRequests: EnrollmentRequest[] = [];
      const allOrgJoinRequests: OrgJoinRequest[] = [];
      const allOrgMembers: OrgMember[] = [];
      const allUserProgress: UserProgress[] = [];
      const allMaterials: Material[] = [];
      const allAttendance: AttendanceRecord[] = [];
      const allAssessments: Assessment[] = [];
      const allSubmissions: Submission[] = [];
      const allEvents: ScheduleEvent[] = [];
      const allMessages: ChatMessage[] = [];
      const allDonationsFromBackpack: CourseDonation[] = [];

      backpackSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const userObj = getUserData(data);

        // Extract organization data
        const personalInfo =
          (userObj.personalInformation as Record<string, unknown>) || {};
        if (
          personalInfo.role === "organization" ||
          personalInfo.orgType ||
          personalInfo.registrationId ||
          personalInfo.accreditationStatus ||
          personalInfo.isAccredited
        ) {
          allOrganizations.push({
            id: (personalInfo.id as string) || docSnap.id,
            name:
              (personalInfo.fullname as string) ||
              (personalInfo.name as string) ||
              "Unnamed Organization",
            description: (personalInfo.description as string) || "",
            logoUrl: personalInfo.logoUrl as string | undefined,
            ownerId: (personalInfo.ownerId as string) || docSnap.id,
            baseCurrency: (personalInfo.baseCurrency as string) || "USD",
            location: personalInfo.location as string | undefined,
            orgType:
              (personalInfo.orgType as "basic" | "higher" | "vocational") ||
              "basic",
            kycVerified: (personalInfo.kycVerified as boolean) ?? false,
            kycDocumentUrl: personalInfo.kycDocumentUrl as string | undefined,
            address: personalInfo.address as string | undefined,
            registrationId: personalInfo.registrationId as string | undefined,
            isAccredited: (personalInfo.isAccredited as boolean) ?? false,
            accreditingBody: personalInfo.accreditingBody as string | undefined,
            accreditationStatus:
              (personalInfo.accreditationStatus as
                | "accredited"
                | "pending"
                | "unaccredited") ||
              (personalInfo.isAccredited ? "accredited" : "unaccredited"),
            accreditationDocUrl: personalInfo.accreditationDocUrl as
              | string
              | undefined,
            motto: personalInfo.motto as string | undefined,
            phone: personalInfo.phone as string | undefined,
            website: personalInfo.website as string | undefined,
            themeColor: personalInfo.themeColor as string | undefined,
            academicHighlights: personalInfo.academicHighlights as
              | string[]
              | undefined,
            isDeleted: (personalInfo.isDeleted as boolean) ?? false,
            paystackSubaccount:
              personalInfo.paystackSubaccount as Organization["paystackSubaccount"],
            plan: (personalInfo.plan as OrgPlanTier) || "free",
          });
        }

        // Extract nested arrays
        if (Array.isArray(userObj.enrollmentRequests)) {
          allEnrollmentRequests.push(
            ...(userObj.enrollmentRequests as EnrollmentRequest[]),
          );
        }
        if (Array.isArray(userObj.orgJoinRequests)) {
          allOrgJoinRequests.push(
            ...(userObj.orgJoinRequests as OrgJoinRequest[]),
          );
        }
        if (Array.isArray(userObj.courseDonations)) {
          allDonationsFromBackpack.push(
            ...(userObj.courseDonations as CourseDonation[]),
          );
        }

        const courseObj = userObj.course as Record<string, unknown> | undefined;
        if (courseObj) {
          if (Array.isArray(courseObj.courses))
            allCourses.push(...(courseObj.courses as Course[]));
          if (Array.isArray(courseObj.orgMembers))
            allOrgMembers.push(...(courseObj.orgMembers as OrgMember[]));
          if (Array.isArray(courseObj.userProgress))
            allUserProgress.push(...(courseObj.userProgress as UserProgress[]));
          if (Array.isArray(courseObj.materials))
            allMaterials.push(...(courseObj.materials as Material[]));
          if (Array.isArray(courseObj.attendance))
            allAttendance.push(...(courseObj.attendance as AttendanceRecord[]));
          if (Array.isArray(courseObj.assessments))
            allAssessments.push(...(courseObj.assessments as Assessment[]));
          if (Array.isArray(courseObj.submissions))
            allSubmissions.push(...(courseObj.submissions as Submission[]));
          if (Array.isArray(courseObj.scheduleEvents))
            allEvents.push(...(courseObj.scheduleEvents as ScheduleEvent[]));
          if (Array.isArray(courseObj.messages))
            allMessages.push(...(courseObj.messages as ChatMessage[]));
        }

        if (docSnap.id === currentUser?.id) {
          if (Array.isArray(userObj.notifications)) {
            setNotifications(userObj.notifications as AppNotification[]);
          }
        }
      });

      const dedupeById = <T extends { id?: string }>(arr: T[]): T[] => {
        const map = new Map<string, T>();
        arr.forEach((item) => {
          if (item.id) map.set(item.id, item);
        });
        return Array.from(map.values());
      };

      const updateAndCache = <T,>(
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

      updateAndCache(
        "organizations",
        dedupeById(allOrganizations),
        setOrganizations,
      );
      updateAndCache("courses", dedupeById(allCourses), setCourses);
      updateAndCache(
        "enrollmentRequests",
        dedupeById(allEnrollmentRequests),
        setEnrollmentRequests,
      );
      updateAndCache(
        "orgJoinRequests",
        dedupeById(allOrgJoinRequests),
        setOrgJoinRequests,
      );
      updateAndCache(
        "courseDonations",
        dedupeById(allDonationsFromBackpack),
        setCourseDonations,
      );
      updateAndCache(
        "course.userProgress",
        dedupeById(allUserProgress),
        setUserProgress,
      );
      updateAndCache(
        "course.materials",
        dedupeById(allMaterials),
        setMaterials,
      );
      updateAndCache("course.attendance", allAttendance, setAttendanceRecords); // attendance might not have id dedupe in old code
      updateAndCache(
        "course.assessments",
        dedupeById(allAssessments),
        setAssessments,
      );
      updateAndCache(
        "course.submissions",
        dedupeById(allSubmissions),
        setSubmissions,
      );

      // Intelligent deduplication of schedule events to prevent duplicate live class items
      const dedupeScheduleEvents = (
        events: ScheduleEvent[],
      ): ScheduleEvent[] => {
        const byId = dedupeById(events);
        const result: ScheduleEvent[] = [];
        const activeCourseMap = new Set<string>();
        const seenEventSignature = new Set<string>();

        // Sort so active events or more recently dated events take precedence
        const sorted = [...byId].sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return (b.date || "").localeCompare(a.date || "");
        });

        for (const evt of sorted) {
          if (!evt.id || !evt.courseId) continue;

          // Ensure only ONE active live session per course at any given time
          if (evt.isActive) {
            if (activeCourseMap.has(evt.courseId)) {
              result.push({ ...evt, isActive: false });
              continue;
            }
            activeCourseMap.add(evt.courseId);
          }

          // Deduplicate events that share identical courseId, date, time, and title
          const sig = `${evt.courseId}_${evt.date}_${evt.time}_${(evt.title || "").trim().toLowerCase()}`;
          if (seenEventSignature.has(sig)) {
            continue;
          }
          seenEventSignature.add(sig);
          result.push(evt);
        }

        return result;
      };

      updateAndCache(
        "course.scheduleEvents",
        dedupeScheduleEvents(allEvents),
        setScheduleEvents,
      );
      updateAndCache(
        "course.orgMembers",
        dedupeById(allOrgMembers),
        setOrgMembers,
      );
      updateAndCache("course.messages", dedupeById(allMessages), setMessages);
    } catch (err) {
      console.error("loadAllBackpackData failed:", err);
    } finally {
      setIsLoadingApp(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadAllBackpackData();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        collection(db, "backpack"),
        () => {
          loadAllBackpackData();
        },
        (err) => {
          console.warn("Backpack realtime listener notice:", err);
        },
      );
    } catch (e) {
      console.warn("Could not bind backpack listener:", e);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadAllBackpackData]);

  // Organization Operations (stored inside backpack/{userId} -> user -> personalInformation)
  const updateOrganization = async (
    id: string,
    updates: Partial<Organization>,
  ) => {
    const cleaned = sanitizeForFirestore(updates);
    const existingOrg = organizations.find(
      (o) => o.id === id || o.ownerId === id,
    );
    const targetUid =
      existingOrg?.ownerId ||
      existingOrg?.id ||
      (id.startsWith("org_") ? id.replace("org_", "") : id) ||
      currentUser?.id ||
      "";

    if (targetUid) {
      const personalUpdates: Record<string, unknown> = { ...cleaned };
      if (updates.name) personalUpdates.fullname = updates.name;
      await updateBackpackPersonalInfo(targetUid, personalUpdates);
    }

    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === id || o.ownerId === id || o.id === targetUid
          ? { ...o, ...cleaned }
          : o,
      ),
    );
  };

  const deleteOrganization = async (id: string) => {
    const existingOrg = organizations.find(
      (o) => o.id === id || o.ownerId === id,
    );
    const targetUid =
      existingOrg?.ownerId ||
      existingOrg?.id ||
      (id.startsWith("org_") ? id.replace("org_", "") : id) ||
      currentUser?.id ||
      "";

    if (targetUid) {
      await updateBackpackPersonalInfo(targetUid, { isDeleted: true });
    }

    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === id || o.ownerId === id || o.id === targetUid
          ? { ...o, isDeleted: true }
          : o,
      ),
    );
  };

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
        paystackSubaccount: org.paystackSubaccount,
      });
    }
    setOrganizations((prev) => [
      ...prev.filter((o) => o.id !== org.id && o.ownerId !== targetUid),
      { ...cleaned, id: org.id || targetUid, ownerId: targetUid },
    ]);
  };

  const upgradeOrganizationPlan = (orgId: string) => {
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId ||
        o.ownerId === orgId ||
        o.id === `org_${orgId}` ||
        `org_${o.id}` === orgId
          ? { ...o, plan: "paid" }
          : o,
      ),
    );
  };

  // Course Operations (stored in backpack/{orgId}.user.courses)
  const addCourse = async (course: Course) => {
    const cleaned = sanitizeForFirestore(course);
    const targetUid = course.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<Course>(
        targetUid,
        "course.courses",
        (list) => [...list.filter((c) => c.id !== course.id), cleaned],
      );
    }
    setCourses((prev) => [...prev.filter((c) => c.id !== course.id), cleaned]);
  };

  const updateCourse = async (courseId: string, updates: Partial<Course>) => {
    const cleaned = sanitizeForFirestore(updates);
    const existingCourse = courses.find((c) => c.id === courseId);
    if (!existingCourse) return;

    const targetUid = existingCourse.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<Course>(
        targetUid,
        "course.courses",
        (list) =>
          list.map((c) => (c.id === courseId ? { ...c, ...cleaned } : c)),
      );
    }
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...cleaned } : c)),
    );
  };

  const addCourseDonation = async (donation: CourseDonation) => {
    const cleaned = sanitizeForFirestore(donation);
    const targetUid = donation.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<CourseDonation>(
        targetUid,
        "courseDonations",
        (list) => [...list.filter((d) => d.id !== donation.id), cleaned],
      );
    }
    setCourseDonations((prev) => [
      ...prev.filter((d) => d.id !== donation.id),
      cleaned,
    ]);
  };

  // Enrollment Request Operations (stored in backpack/{userId}.user.enrollmentRequests & org's backpack)
  const addEnrollmentRequest = async (req: EnrollmentRequest) => {
    const existingReq = enrollmentRequests.find(
      (r) => r.userId === req.userId && r.courseId === req.courseId,
    );
    let reapplicationHistory = req.reapplicationHistory || [];
    if (
      existingReq &&
      (existingReq.status === "rejected" || existingReq.status === "cancelled")
    ) {
      const pastRecord: ReapplicationRecord = {
        id: existingReq.id,
        sessionId: existingReq.sessionId,
        sessionName: existingReq.sessionName,
        appliedAt: existingReq.appliedAt || new Date().toISOString(),
        status: existingReq.status,
        rejectedAt: existingReq.rejectedAt,
        rejectionReason: existingReq.rejectionReason,
      };
      reapplicationHistory = [
        ...(existingReq.reapplicationHistory || []),
        pastRecord,
      ];
    }
    const payload: EnrollmentRequest = { ...req, reapplicationHistory };
    const cleaned = sanitizeForFirestore(payload);

    if (req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) => [...list.filter((r) => r.id !== req.id), cleaned],
      );
    if (req.orgId && req.orgId !== req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) => [...list.filter((r) => r.id !== req.id), cleaned],
      );

    setEnrollmentRequests((prev) => [
      ...prev.filter(
        (r) =>
          r.id !== req.id &&
          !(r.courseId === req.courseId && r.userId === req.userId),
      ),
      cleaned,
    ]);

    if (req.orgId) {
      addNotification({
        userId: req.orgId,
        title: "New Admission Application",
        message: `${req.userName || "A student"} applied for "${req.courseTitle || "Course"}"${req.sessionName ? ` (${req.sessionName})` : ""}.`,
        type: "enrollment",
        linkUrl: `/dashboard`,
      });
    }
  };

  const updateEnrollmentRequest = async (
    id: string,
    status?: "approved" | "rejected" | "cancelled" | "pending",
    paymentStatus?: "unpaid" | "paid",
    rejectionReason?: string,
  ) => {
    const req = enrollmentRequests.find((r) => r.id === id);
    if (!req) return;
    const updates: Partial<EnrollmentRequest> = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (status === "rejected") {
      updates.rejectedAt = new Date().toISOString();
      if (rejectionReason) updates.rejectionReason = rejectionReason;
      if (req.sessionId) updates.rejectedSessionId = req.sessionId;
    }
    const cleanUpdates = sanitizeForFirestore(updates);
    if (req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) =>
          list.map((r) => (r.id === req.id ? { ...r, ...cleanUpdates } : r)),
      );
    if (req.orgId && req.orgId !== req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) =>
          list.map((r) => (r.id === req.id ? { ...r, ...cleanUpdates } : r)),
      );

    if (status && status !== "cancelled") {
      const sessionInfo = req.sessionName ? ` for ${req.sessionName}` : "";
      addNotification({
        userId: req.userId,
        title: `Enrollment Application ${status.toUpperCase()}`,
        message:
          status === "approved"
            ? `Congratulations! Your admission application for "${req.courseTitle || "the course"}"${sessionInfo} has been approved.`
            : `Your application for "${req.courseTitle || "the course"}"${sessionInfo} was declined.${rejectionReason ? ` Note: ${rejectionReason}` : " You may reapply in the next admission session."}`,
        type: "enrollment",
        linkUrl: `/course/${req.courseId}`,
      });
    }
    setEnrollmentRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  };

  const cancelEnrollmentRequest = async (id: string) => {
    const req = enrollmentRequests.find((r) => r.id === id);
    if (!req) return;
    const updates: Partial<EnrollmentRequest> = {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    };
    const cleanUpdates = sanitizeForFirestore(updates);
    if (req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) =>
          list.map((r) => (r.id === req.id ? { ...r, ...cleanUpdates } : r)),
      );
    if (req.orgId && req.orgId !== req.userId)
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) =>
          list.map((r) => (r.id === req.id ? { ...r, ...cleanUpdates } : r)),
      );

    addNotification({
      userId: req.userId,
      title: "Course Application Cancelled",
      message: `Your application for "${req.courseTitle || "Course"}" has been cancelled.`,
      type: "info",
    });
    setEnrollmentRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  };
  const getCourseAdmissionGate = (courseId: string): AdmissionGateStatus => {
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      return {
        isVocational: false,
        isDonationFunded: false,
        tuitionCostPerStudent: 0,
        totalDonations: 0,
        maxAdmissibleStudents: 0,
        currentlyAdmittedCount: 0,
        remainingSpots: 0,
        canAdmitMore: false,
        currency: "USD",
        nextSeatNeededAmount: 0,
      };
    }

    const org = organizations.find((o) => o.id === course.orgId);
    const isVocational = org?.orgType === "vocational";
    const isDonationFunded = course.fundingModel === "donations_sponsorships";
    const tuitionCostPerStudent =
      course.tuitionCostPerStudent || course.price || 0;
    const currency = course.currency || "USD";

    const totalDonations =
      course.totalDonationsReceived ||
      courseDonations
        .filter((d) => d.courseId === courseId)
        .reduce((sum, d) => sum + d.amount, 0);

    const currentlyAdmittedCount = enrollmentRequests.filter(
      (r) => r.courseId === courseId && r.status === "approved",
    ).length;

    let maxAdmissibleStudents = -1;
    let remainingSpots = 999999;
    let canAdmitMore = true;
    let nextSeatNeededAmount = 0;

    if (isDonationFunded && tuitionCostPerStudent > 0) {
      maxAdmissibleStudents = Math.floor(
        totalDonations / tuitionCostPerStudent,
      );
      remainingSpots = Math.max(
        0,
        maxAdmissibleStudents - currentlyAdmittedCount,
      );
      canAdmitMore = remainingSpots > 0;

      const currentFundsNeeded =
        (currentlyAdmittedCount + 1) * tuitionCostPerStudent;
      nextSeatNeededAmount = Math.max(0, currentFundsNeeded - totalDonations);
    }

    return {
      isVocational,
      isDonationFunded,
      tuitionCostPerStudent,
      totalDonations,
      maxAdmissibleStudents,
      currentlyAdmittedCount,
      remainingSpots,
      canAdmitMore,
      currency,
      nextSeatNeededAmount,
    };
  };

  // Admission Session Management
  const openCourseAdmission = async (courseId: string, sessionId?: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const sessions = course.admissionSessions
      ? [...course.admissionSessions]
      : [];
    let activeSession = sessionId
      ? sessions.find((s) => s.id === sessionId)
      : sessions.find((s) => s.status === "open");

    // If no active session exists or specified session not open, activate/open it
    if (!activeSession) {
      if (sessions.length > 0) {
        // Open the most recent session
        sessions[0] = { ...sessions[0], status: "open" };
        activeSession = sessions[0];
      } else {
        // Create an initial session
        const currentYear = new Date().getFullYear();
        const initialSession: AdmissionSession = {
          id: generateId("ses"),
          name: `${currentYear}/${currentYear + 1} Academic Session`,
          status: "open",
          startDate: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
        };
        sessions.push(initialSession);
        activeSession = initialSession;
      }
    } else {
      // Mark selected session as open
      const updatedSessions = sessions.map((s) =>
        s.id === activeSession!.id ? { ...s, status: "open" as const } : s,
      );
      sessions.splice(0, sessions.length, ...updatedSessions);
    }

    const updates: Partial<Course> = {
      admissionStatus: "open",
      activeSessionId: activeSession.id,
      activeSessionName: activeSession.name,
      admissionSessions: sessions,
    };

    await updateCourse(courseId, updates);
  };

  const closeCourseAdmission = async (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const sessions = (course.admissionSessions || []).map((s) =>
      s.id === course.activeSessionId
        ? {
            ...s,
            status: "closed" as const,
            closedAt: new Date().toISOString(),
          }
        : s,
    );

    const updates: Partial<Course> = {
      admissionStatus: "closed",
      admissionSessions: sessions,
    };

    await updateCourse(courseId, updates);
  };

  const createCourseAdmissionSession = async (
    courseId: string,
    sessionData: {
      name: string;
      startDate?: string;
      endDate?: string;
      applicationDeadline?: string;
      academicYear?: string;
      notes?: string;
      autoOpen?: boolean;
    },
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newSessionId = generateId("ses");
    const autoOpen = sessionData.autoOpen !== false; // default true

    const newSession: AdmissionSession = {
      id: newSessionId,
      name: sessionData.name.trim(),
      status: autoOpen ? "open" : "closed",
      startDate: sessionData.startDate,
      endDate: sessionData.endDate,
      applicationDeadline: sessionData.applicationDeadline,
      academicYear: sessionData.academicYear,
      notes: sessionData.notes,
      createdAt: new Date().toISOString(),
    };

    // If opening new session, close old active sessions
    let sessions = course.admissionSessions
      ? [...course.admissionSessions]
      : [];
    if (autoOpen) {
      sessions = sessions.map((s) => ({
        ...s,
        status: "closed" as const,
        closedAt: s.closedAt || new Date().toISOString(),
      }));
    }
    sessions = [newSession, ...sessions];

    const updates: Partial<Course> = {
      admissionSessions: sessions,
      ...(autoOpen
        ? {
            admissionStatus: "open",
            activeSessionId: newSession.id,
            activeSessionName: newSession.name,
          }
        : {}),
    };

    await updateCourse(courseId, updates);
  };

  const updateCourseAdmissionSession = async (
    courseId: string,
    sessionId: string,
    updates: Partial<AdmissionSession>,
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.admissionSessions) return;

    const sessions = course.admissionSessions.map((s) =>
      s.id === sessionId ? { ...s, ...updates } : s,
    );
    const updatedCourseData: Partial<Course> = { admissionSessions: sessions };

    if (updates.name && course.activeSessionId === sessionId) {
      updatedCourseData.activeSessionName = updates.name;
    }
    if (updates.status && course.activeSessionId === sessionId) {
      updatedCourseData.admissionStatus = updates.status;
    }

    await updateCourse(courseId, updatedCourseData);
  };

  // Org Join Requests (stored in backpack/{userId}.user.orgJoinRequests & org's backpack)
  const addOrgJoinRequest = async (req: OrgJoinRequest) => {
    const cleaned = sanitizeForFirestore(req);
    if (req.userId) {
      await updateBackpackUserField<OrgJoinRequest>(
        req.userId,
        "orgJoinRequests",
        (list) => [...list.filter((r) => r.id !== req.id), cleaned],
      );
    }
    if (req.orgId && req.orgId !== req.userId) {
      await updateBackpackUserField<OrgJoinRequest>(
        req.orgId,
        "orgJoinRequests",
        (list) => [...list.filter((r) => r.id !== req.id), cleaned],
      );
    }
    setOrgJoinRequests((prev) => [
      ...prev.filter((r) => r.id !== req.id),
      cleaned,
    ]);
  };

  const updateOrgJoinRequest = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    const req = orgJoinRequests.find((r) => r.id === id);
    if (req) {
      if (req.userId) {
        await updateBackpackUserField<OrgJoinRequest>(
          req.userId,
          "orgJoinRequests",
          (list) => list.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      }
      if (req.orgId && req.orgId !== req.userId) {
        await updateBackpackUserField<OrgJoinRequest>(
          req.orgId,
          "orgJoinRequests",
          (list) => list.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      }
      addNotification({
        userId: req.userId,
        title: `Member Join Request ${status.toUpperCase()}`,
        message: `Your request to join ${req.orgName} was ${status}.`,
        type: "info",
        linkUrl: `/dashboard`,
      });
    }
    setOrgJoinRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  // Org Members (stored in backpack/{orgId}.user.orgMembers and orgMembers collection)
  const addOrgMember = async (member: OrgMember) => {
    const cleaned = sanitizeForFirestore(member);
    const targetUid = member.orgId?.startsWith("org_")
      ? member.orgId.replace("org_", "")
      : member.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<OrgMember>(
        targetUid,
        "course.orgMembers",
        (list) => [...list.filter((m) => m.id !== member.id), cleaned],
      );
    }
    setOrgMembers((prev) => [
      ...prev.filter((m) => m.id !== member.id),
      cleaned,
    ]);

    if (member.status === "invited") {
      let invitedUserId = member.userId;
      if (!invitedUserId && member.email) {
        try {
          const q = query(collection(db, "backpack"));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            const data = docSnap.data() as Record<string, any>;
            const userObj = getUserData(data);
            const pi =
              (userObj.personalInformation as Record<string, any>) || {};
            if (pi.email?.toLowerCase() === member.email.toLowerCase()) {
              invitedUserId = docSnap.id;
              break;
            }
          }
        } catch (err) {
          console.error("Error finding user by email:", err);
        }
      }

      if (invitedUserId) {
        addNotification({
          userId: invitedUserId,
          title: `Organization Invite`,
          message: `You have been invited to join an organization as a ${member.role}.`,
          type: "enrollment",
        });
      }
    }
  };

  const updateOrgMember = async (id: string, updates: Partial<OrgMember>) => {
    const member = orgMembers.find((m) => m.id === id);
    if (member && member.orgId) {
      const targetUid = member.orgId.startsWith("org_")
        ? member.orgId.replace("org_", "")
        : member.orgId;
      await updateBackpackUserField<OrgMember>(
        targetUid,
        "course.orgMembers",
        (list) => list.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    }
    setOrgMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    );
  };

  const deleteOrgMember = async (id: string) => {
    const member = orgMembers.find((m) => m.id === id);
    if (member && member.orgId) {
      const targetUid = member.orgId.startsWith("org_")
        ? member.orgId.replace("org_", "")
        : member.orgId;
      await updateBackpackUserField<OrgMember>(
        targetUid,
        "course.orgMembers",
        (list) => list.filter((m) => m.id !== id),
      );
    }
    setOrgMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // User Progress (stored in backpack/{userId}.user.userProgress)
  const updateProgress = async (progress: UserProgress) => {
    const progressId =
      progress.id || `prog_${progress.userId}_${progress.courseId}`;
    const cleaned = sanitizeForFirestore({ ...progress, id: progressId });

    if (progress.userId) {
      await updateBackpackUserField<UserProgress>(
        progress.userId,
        "course.userProgress",
        (list) => {
          const existingIdx = list.findIndex(
            (p) =>
              p.userId === progress.userId && p.courseId === progress.courseId,
          );
          if (existingIdx >= 0) {
            const updated = [...list];
            updated[existingIdx] = cleaned;
            return updated;
          }
          return [...list, cleaned];
        },
      );
    }

    setUserProgress((prev) => {
      const idx = prev.findIndex(
        (p) => p.userId === progress.userId && p.courseId === progress.courseId,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = cleaned;
        return updated;
      }
      return [...prev, cleaned];
    });
  };

  // Materials (stored in backpack/{targetId}.user.materials)
  const addMaterial = async (material: Material) => {
    const matId =
      material.id || `mat_${Math.random().toString(36).substring(2, 15)}`;
    const cleaned = sanitizeForFirestore({ ...material, id: matId });
    const targetUid = currentUser?.id || "";

    if (targetUid) {
      await updateBackpackUserField<Material>(
        targetUid,
        "course.materials",
        (list) => [...list, cleaned],
      );
    }
    setMaterials((prev) => [...prev, cleaned]);
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    const targetUid = currentUser?.id || "";
    const existing = materials.find((m) => m.id === id);
    if (targetUid && existing) {
      await updateBackpackUserField<Material>(
        targetUid,
        "course.materials",
        (list) => list.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    }
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    );
  };

  const deleteMaterial = async (id: string) => {
    const targetUid = currentUser?.id || "";

    // Optimistic update
    setMaterials((prev) => prev.filter((m) => m.id !== id));

    if (targetUid) {
      try {
        await updateBackpackUserField<Material>(
          targetUid,
          "course.materials",
          (list) => list.filter((m) => m.id !== id),
        );
      } catch (err) {
        console.error("Failed to delete material from backend:", err);
      }
    }
  };

  // Attendance Records (stored in backpack/{targetId}.user.attendance)
  const addAttendanceRecord = async (record: AttendanceRecord) => {
    const attId = record.id || `att_${Date.now()}_${record.courseId}`;
    const cleaned = sanitizeForFirestore({ ...record, id: attId });
    const targetUid = currentUser?.id || "";

    if (targetUid) {
      await updateBackpackUserField<AttendanceRecord>(
        targetUid,
        "attendance",
        (list) => [...list, cleaned],
      );
    }
    setAttendanceRecords((prev) => [...prev, cleaned]);
  };

  // Assessments (stored in backpack/{targetId}.user.assessments)
  const addAssessment = async (assessment: Assessment) => {
    const cleaned = sanitizeForFirestore(assessment);
    const targetUid = currentUser?.id || "";

    if (targetUid) {
      await updateBackpackUserField<Assessment>(
        targetUid,
        "course.assessments",
        (list) => [...list.filter((a) => a.id !== assessment.id), cleaned],
      );
    }
    setAssessments((prev) => [
      ...prev.filter((a) => a.id !== assessment.id),
      cleaned,
    ]);
  };

  // Submissions (stored in student's backpack & course instructor's backpack)
  const addSubmission = async (submission: Submission) => {
    const cleaned = sanitizeForFirestore(submission);
    if (submission.userId) {
      await updateBackpackUserField<Submission>(
        submission.userId,
        "course.submissions",
        (list) => [...list.filter((s) => s.id !== submission.id), cleaned],
      );
    }
    setSubmissions((prev) => [
      ...prev.filter((s) => s.id !== submission.id),
      cleaned,
    ]);
  };

  const updateSubmissionScore = async (
    id: string,
    score: number,
    feedback: string,
  ) => {
    const sub = submissions.find((s) => s.id === id);
    if (sub && sub.userId) {
      await updateBackpackUserField<Submission>(
        sub.userId,
        "course.submissions",
        (list) =>
          list.map((s) =>
            s.id === id ? { ...s, score, feedback, status: "graded" } : s,
          ),
      );
    }
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, score, feedback, status: "graded" } : s,
      ),
    );
  };

  // Schedule Events (stored in backpack/{targetId}.user.scheduleEvents)
  const addScheduleEvent = async (event: ScheduleEvent) => {
    const canonicalRoom = getLiveClassRoomName(event, event.courseId);
    const meetingUrl =
      event.meetingUrl?.trim() || getJitsiMeetingUrl(canonicalRoom);
    const cleaned = sanitizeForFirestore({
      ...event,
      meetingUrl,
    });
    const targetUid = currentUser?.id || "";

    // 1. Check if an identical event or already active event exists for this course to prevent duplicates
    let eventIdToUse = event.id;
    const existingMatch = scheduleEvents.find((e) => {
      if (e.id === event.id) return true;
      if (event.isActive && e.courseId === event.courseId && e.isActive)
        return true;
      if (
        e.courseId === event.courseId &&
        e.date === event.date &&
        e.time === event.time &&
        (e.title || "").trim().toLowerCase() ===
          (event.title || "").trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (existingMatch) {
      eventIdToUse = existingMatch.id;
      cleaned.id = existingMatch.id;
    }

    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "course.scheduleEvents",
        (list) => [
          ...list.filter(
            (e) =>
              e.id !== eventIdToUse &&
              (!event.isActive || e.courseId !== event.courseId || !e.isActive),
          ),
          cleaned,
        ],
      );
    }
    const course = courses.find((c) => c.id === event.courseId);
    if (course?.orgId && course.orgId !== targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        course.orgId,
        "course.scheduleEvents",
        (list) => [
          ...list.filter(
            (e) =>
              e.id !== eventIdToUse &&
              (!event.isActive || e.courseId !== event.courseId || !e.isActive),
          ),
          cleaned,
        ],
      );
    }

    setScheduleEvents((prev) => [
      ...prev.filter(
        (e) =>
          e.id !== eventIdToUse &&
          (!event.isActive || e.courseId !== event.courseId || !e.isActive),
      ),
      cleaned,
    ]);

    // 2. Dispatch notifications ONLY to ENROLLED STUDENTS and CO-STAFF, EXCLUDING THE CALL INITIATOR!
    if (event.isActive && event.courseId) {
      const courseTitle = course?.title || "Course";
      const enrolledStudentIds = enrollmentRequests
        .filter((r) => r.courseId === event.courseId && r.status === "approved")
        .map((r) => r.userId)
        .filter(Boolean) as string[];

      const assignedInstructorIds = orgMembers
        .filter((m) => m.courseIds?.includes(event.courseId))
        .map((m) => m.id)
        .filter(Boolean) as string[];

      const courseStaffIds = [course?.createdBy, course?.orgId].filter(
        Boolean,
      ) as string[];

      // CRITICAL: Filter out the call initiator (currentUser.id) so the person who started the class is not notified
      const targetRecipientIds = Array.from(
        new Set([
          ...enrolledStudentIds,
          ...assignedInstructorIds,
          ...courseStaffIds,
        ]),
      ).filter((uid): uid is string => Boolean(uid && uid !== currentUser?.id));

      for (const recipientId of targetRecipientIds) {
        addNotification({
          userId: recipientId,
          courseId: event.courseId,
          title: `📹 Live Class Started: ${event.title}`,
          message: `The live stream for "${courseTitle}" is officially active. Click to join now!`,
          type: "live_class",
          linkUrl: `/course/${event.courseId}?live=true&eventId=${cleaned.id}`,
        });
      }
    }
  };

  const updateScheduleEvent = async (
    id: string,
    updates: Partial<ScheduleEvent>,
  ) => {
    const existingEvt = scheduleEvents.find((e) => e.id === id);
    const effectiveCourseId = updates.courseId || existingEvt?.courseId;
    const course = courses.find((c) => c.id === effectiveCourseId);

    const mergedEvt: Partial<ScheduleEvent> = {
      ...existingEvt,
      ...updates,
    };
    if (updates.isActive && !mergedEvt.meetingUrl) {
      const room = getLiveClassRoomName(mergedEvt, effectiveCourseId);
      updates.meetingUrl = getJitsiMeetingUrl(room);
    }

    const targetUid = currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "course.scheduleEvents",
        (list) =>
          list.map((e) =>
            e.id === id
              ? { ...e, ...updates }
              : updates.isActive && e.courseId === effectiveCourseId
                ? { ...e, isActive: false }
                : e,
          ),
      );
    }
    if (course?.orgId && course.orgId !== targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        course.orgId,
        "course.scheduleEvents",
        (list) =>
          list.map((e) =>
            e.id === id
              ? { ...e, ...updates }
              : updates.isActive && e.courseId === effectiveCourseId
                ? { ...e, isActive: false }
                : e,
          ),
      );
    }

    setScheduleEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, ...updates }
          : updates.isActive && e.courseId === effectiveCourseId
            ? { ...e, isActive: false }
            : e,
      ),
    );

    // Notify only if transition from inactive -> active
    const wasAlreadyActive = existingEvt?.isActive === true;
    if (updates.isActive && !wasAlreadyActive && effectiveCourseId) {
      const evt = existingEvt || scheduleEvents.find((e) => e.id === id);
      const courseTitle = course?.title || "Course";
      const eventTitle = updates.title || evt?.title || "Class Session";

      const enrolledStudentIds = enrollmentRequests
        .filter(
          (r) => r.courseId === effectiveCourseId && r.status === "approved",
        )
        .map((r) => r.userId)
        .filter(Boolean) as string[];

      const assignedInstructorIds = orgMembers
        .filter((m) => m.courseIds?.includes(effectiveCourseId))
        .map((m) => m.id)
        .filter(Boolean) as string[];

      const courseStaffIds = [course?.createdBy, course?.orgId].filter(
        Boolean,
      ) as string[];

      // CRITICAL: Filter out the call initiator (currentUser.id) so the person who started the class is not notified
      const targetRecipientIds = Array.from(
        new Set([
          ...enrolledStudentIds,
          ...assignedInstructorIds,
          ...courseStaffIds,
        ]),
      ).filter((uid): uid is string => Boolean(uid && uid !== currentUser?.id));

      for (const recipientId of targetRecipientIds) {
        addNotification({
          userId: recipientId,
          courseId: effectiveCourseId,
          title: `📹 Live Class Started: ${eventTitle}`,
          message: `The live stream for "${courseTitle}" is officially active. Click to join now!`,
          type: "live_class",
          linkUrl: `/course/${effectiveCourseId}?live=true&eventId=${id}`,
        });
      }
    }
  };

  const deleteScheduleEvent = async (id: string) => {
    const existingEvt = scheduleEvents.find((e) => e.id === id);
    const course = courses.find((c) => c.id === existingEvt?.courseId);
    const targetUid = currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "course.scheduleEvents",
        (list) => list.filter((e) => e.id !== id),
      );
    }
    if (course?.orgId && course.orgId !== targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        course.orgId,
        "course.scheduleEvents",
        (list) => list.filter((e) => e.id !== id),
      );
    }
    setScheduleEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // Real-time course chat messages
  const sendMessage = async (msg: ChatMessage) => {
    const cleaned = sanitizeForFirestore(msg);
    const course = courses.find((c) => c.id === msg.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    await updateBackpackUserField<ChatMessage>(
      targetUid,
      "course.messages",
      (list) => [...list, cleaned],
    );
    setMessages((prev) => [...prev, msg]);
  };

  const addDiscussionChannel = async (channel: DiscussionChannel) => {
    const cleaned = sanitizeForFirestore(channel);
    const course = courses.find((c) => c.id === channel.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionChannel>(
        targetUid,
        "course.discussionChannels",
        (list) => [...list.filter((c) => c.id !== channel.id), cleaned],
      );
    }
    setDiscussionChannels((prev) => [
      ...prev.filter((c) => c.id !== channel.id),
      cleaned,
    ]);
  };

  const addDiscussionMessage = async (message: DiscussionMessage) => {
    const cleaned = sanitizeForFirestore(message);
    const course = courses.find((c) => c.id === message.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionMessage>(
        targetUid,
        "course.discussionMessages",
        (list) => [...list.filter((m) => m.id !== message.id), cleaned],
      );
    }
    setDiscussionMessages((prev) => [
      ...prev.filter((m) => m.id !== message.id),
      cleaned,
    ]);

    if (message.parentId) {
      const parent = discussionMessages.find((m) => m.id === message.parentId);
      if (parent) {
        const updatedParent = {
          ...parent,
          replyCount: (parent.replyCount || 0) + 1,
        };
        const parentCourse = courses.find((c) => c.id === parent.courseId);
        const parentTargetUid = parentCourse?.orgId || currentUser?.id || "";
        if (parentTargetUid) {
          await updateBackpackUserField<DiscussionMessage>(
            parentTargetUid,
            "course.discussionMessages",
            (list) => list.map((m) => (m.id === parent.id ? updatedParent : m)),
          );
        }
        setDiscussionMessages((prev) =>
          prev.map((m) => (m.id === parent.id ? updatedParent : m)),
        );
      }
    }
  };

  const toggleMessageReaction = async (
    messageId: string,
    emoji: string,
    userId: string,
  ) => {
    const message = discussionMessages.find((m) => m.id === messageId);
    if (!message) return;

    const current = message.reactions?.[emoji] || [];
    const hasReacted = current.includes(userId);
    const updatedEmojiList = hasReacted
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    const updatedMessage: DiscussionMessage = {
      ...message,
      reactions: { ...(message.reactions || {}), [emoji]: updatedEmojiList },
    };

    const course = courses.find((c) => c.id === message.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionMessage>(
        targetUid,
        "course.discussionMessages",
        (list) => list.map((m) => (m.id === messageId ? updatedMessage : m)),
      );
    }
    setDiscussionMessages((prev) =>
      prev.map((m) => (m.id === messageId ? updatedMessage : m)),
    );
  };

  const setMessageVerified = async (messageId: string, verified: boolean) => {
    const message = discussionMessages.find((m) => m.id === messageId);
    if (!message) return;
    const updatedMessage = { ...message, verified };

    const course = courses.find((c) => c.id === message.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionMessage>(
        targetUid,
        "course.discussionMessages",
        (list) => list.map((m) => (m.id === messageId ? updatedMessage : m)),
      );
    }
    setDiscussionMessages((prev) =>
      prev.map((m) => (m.id === messageId ? updatedMessage : m)),
    );
  };

  const addPoll = async (poll: DiscussionPoll) => {
    const cleaned = sanitizeForFirestore(poll);
    const course = courses.find((c) => c.id === poll.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionPoll>(
        targetUid,
        "course.discussionPolls",
        (list) => [...list.filter((p) => p.id !== poll.id), cleaned],
      );
    }
    setDiscussionPolls((prev) => [
      ...prev.filter((p) => p.id !== poll.id),
      cleaned,
    ]);
  };

  const voteOnPoll = async (
    pollId: string,
    optionId: string,
    userId: string,
  ) => {
    const poll = discussionPolls.find((p) => p.id === pollId);
    if (!poll) return;

    const updatedOptions = poll.options.map((o) => ({
      ...o,
      votes: o.votes.filter((id) => id !== userId),
    }));
    const targetOption = updatedOptions.find((o) => o.id === optionId);
    if (targetOption) targetOption.votes.push(userId);
    const updatedPoll = { ...poll, options: updatedOptions };

    const course = courses.find((c) => c.id === poll.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionPoll>(
        targetUid,
        "course.discussionPolls",
        (list) => list.map((p) => (p.id === pollId ? updatedPoll : p)),
      );
    }
    setDiscussionPolls((prev) =>
      prev.map((p) => (p.id === pollId ? updatedPoll : p)),
    );
  };

  const pingPresence = async (
    courseId: string,
    userId: string,
    userName: string,
    role?: "instructor" | "ta" | "student",
  ) => {
    const entry: CoursePresence = {
      id: `${courseId}_${userId}`,
      courseId,
      userId,
      userName,
      role,
      lastActiveAt: Date.now(),
    };
    const cleaned = sanitizeForFirestore(entry);
    const course = courses.find((c) => c.id === courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<CoursePresence>(
        targetUid,
        "course.coursePresence",
        (list) => [...list.filter((p) => p.id !== entry.id), cleaned],
      );
    }
    setCoursePresence((prev) => [
      ...prev.filter((p) => p.id !== entry.id),
      cleaned,
    ]);
  };

  const toggleChannelSubscription = async (
    channelId: string,
    userId: string,
  ) => {
    const channel = discussionChannels.find((c) => c.id === channelId);
    if (!channel) return;
    const current = channel.subscriberIds || [];
    const updatedChannel: DiscussionChannel = {
      ...channel,
      subscriberIds: current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    };
    await addDiscussionChannel(updatedChannel); // upsert-by-id, safe to reuse
  };

  const addChannelResource = async (
    channelId: string,
    resource: DiscussionResource,
  ) => {
    const channel = discussionChannels.find((c) => c.id === channelId);
    if (!channel) return;
    const updatedChannel: DiscussionChannel = {
      ...channel,
      resources: [...(channel.resources || []), resource],
    };
    await addDiscussionChannel(updatedChannel);
  };

  const togglePinMessage = async (messageId: string, pinned: boolean) => {
    const message = discussionMessages.find((m) => m.id === messageId);
    if (!message) return;
    const updatedMessage = { ...message, pinned };

    const course = courses.find((c) => c.id === message.courseId);
    const targetUid = course?.orgId || currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<DiscussionMessage>(
        targetUid,
        "course.discussionMessages",
        (list) => list.map((m) => (m.id === messageId ? updatedMessage : m)),
      );
    }
    setDiscussionMessages((prev) =>
      prev.map((m) => (m.id === messageId ? updatedMessage : m)),
    );
  };

  return (
    <AppContext.Provider
      value={{
        isLoadingApp,
        organizations,
        courses,
        enrollmentRequests,
        courseDonations,
        orgJoinRequests,
        orgMembers,
        userProgress,
        materials,
        attendanceRecords,
        assessments,
        submissions,
        scheduleEvents,
        messages,
        discussionChannels,
        discussionMessages,
        discussionPolls,
        coursePresence,
        notifications,
        addOrganization,
        updateOrganization,
        upgradeOrganizationPlan,
        deleteOrganization,
        addCourse,
        updateCourse,
        addCourseDonation,
        getCourseAdmissionGate,
        addEnrollmentRequest,
        updateEnrollmentRequest,
        cancelEnrollmentRequest,
        openCourseAdmission,
        closeCourseAdmission,
        createCourseAdmissionSession,
        updateCourseAdmissionSession,
        addOrgJoinRequest,
        updateOrgJoinRequest,
        addOrgMember,
        updateOrgMember,
        deleteOrgMember,
        updateProgress,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addAttendanceRecord,
        sendMessage,
        addDiscussionChannel,
        addDiscussionMessage,
        toggleMessageReaction,
        setMessageVerified,
        togglePinMessage,
        toggleChannelSubscription,
        addChannelResource,
        addPoll,
        voteOnPoll,
        pingPresence,
        refreshData: loadAllBackpackData,
        addAssessment,
        addSubmission,
        updateSubmissionScore,
        addScheduleEvent,
        updateScheduleEvent,
        deleteScheduleEvent,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
