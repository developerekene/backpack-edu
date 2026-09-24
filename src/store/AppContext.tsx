import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
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
} from "../types";
import { useAuth } from "./AuthContext";
import { sendPushNotification } from "../lib/pushNotifications";
import { generateId } from "../lib/id";

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
    loadCache("orgMembers", []),
  );
  const [userProgress, setUserProgress] = useState<UserProgress[]>(() =>
    loadCache("userProgress", []),
  );
  const [materials, setMaterials] = useState<Material[]>(() =>
    loadCache("materials", []),
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >(() => loadCache("attendanceRecords", []));
  const [assessments, setAssessments] = useState<Assessment[]>(() =>
    loadCache("assessments", []),
  );
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    loadCache("submissions", []),
  );
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(() =>
    loadCache("scheduleEvents", []),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadCache("messages", []),
  );
  const [discussionChannels, setDiscussionChannels] = useState<
    DiscussionChannel[]
  >(() => loadCache("discussionChannels", []));
  const [discussionMessages, setDiscussionMessages] = useState<
    DiscussionMessage[]
  >(() => loadCache("discussionMessages", []));
  const [discussionPolls, setDiscussionPolls] = useState<DiscussionPoll[]>(() =>
    loadCache("discussionPolls", []),
  );
  const [coursePresence, setCoursePresence] = useState<CoursePresence[]>(() =>
    loadCache("coursePresence", []),
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadCache("notifications", []),
  );
  const [registeredUsers, setRegisteredUsers] = useState<
    { id: string; email: string; name: string; role?: string }[]
  >(() => loadCache("registeredUsers", []));

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
        const currentList: T[] = Array.isArray(userObj[field])
          ? (userObj[field] as T[])
          : [];
        const updatedList = updateFn(currentList);
        const updatedUser = {
          ...userObj,
          [field]: updatedList,
        };
        await updateDoc(docRef, { user: updatedUser });
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

    setNotifications((prev) => [newNotif, ...prev]);

    // Send push notification if granted
    sendPushNotification(newNotif.title, {
      body: newNotif.message,
      linkUrl: newNotif.linkUrl,
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Fetch all global data and user-specific data from backpack documents
  // useEffect(() => {
  const loadAllBackpackData = async () => {
    try {
      const backpackSnap = await getDocs(collection(db, "backpack"));

      const allOrganizations: Organization[] = [];
      const allCourses: Course[] = [];
      const allEnrollments: EnrollmentRequest[] = [];
      const allOrgJoinRequests: OrgJoinRequest[] = [];
      const allMembers: OrgMember[] = [];
      const allProgress: UserProgress[] = [];
      const allMaterials: Material[] = [];
      const allAttendance: AttendanceRecord[] = [];
      const allAssessments: Assessment[] = [];
      const allSubmissions: Submission[] = [];
      const allScheduleEvents: ScheduleEvent[] = [];
      const allMessages: ChatMessage[] = [];
      const allDiscussionChannels: DiscussionChannel[] = [];
      const allDiscussionMessages: DiscussionMessage[] = [];
      const allDiscussionPolls: DiscussionPoll[] = [];
      const allCoursePresence: CoursePresence[] = [];
      const allDonations: CourseDonation[] = [];
      const allRegisteredUsers: {
        id: string;
        email: string;
        name: string;
        role?: string;
      }[] = [];

      backpackSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const userObj = getUserData(data);
        const personalInfo =
          (userObj.personalInformation as Record<string, unknown>) || {};

        const userEmail =
          (personalInfo.email as string) ||
          (userObj.email as string) ||
          (data.email as string);
        if (userEmail) {
          allRegisteredUsers.push({
            id: docSnap.id,
            email: userEmail.toLowerCase().trim(),
            name:
              (personalInfo.fullname as string) ||
              (personalInfo.name as string) ||
              (userObj.name as string) ||
              "Student",
            role:
              (personalInfo.role as string) ||
              (userObj.role as string) ||
              "student",
          });
        }

        // Extract organization from user.personalInformation map
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
          });
        }

        if (Array.isArray(userObj.courses)) allCourses.push(...userObj.courses);
        if (Array.isArray(userObj.enrollmentRequests))
          allEnrollments.push(...userObj.enrollmentRequests);
        if (Array.isArray(userObj.orgJoinRequests))
          allOrgJoinRequests.push(...userObj.orgJoinRequests);
        if (Array.isArray(userObj.orgMembers))
          allMembers.push(...userObj.orgMembers);
        if (Array.isArray(userObj.userProgress))
          allProgress.push(...userObj.userProgress);
        if (Array.isArray(userObj.materials))
          allMaterials.push(...userObj.materials);
        if (Array.isArray(userObj.attendance))
          allAttendance.push(...userObj.attendance);
        if (Array.isArray(userObj.assessments))
          allAssessments.push(...userObj.assessments);
        if (Array.isArray(userObj.submissions))
          allSubmissions.push(...userObj.submissions);
        if (Array.isArray(userObj.scheduleEvents))
          allScheduleEvents.push(...userObj.scheduleEvents);
        if (Array.isArray(userObj.messages))
          allMessages.push(...userObj.messages);
        if (Array.isArray(userObj.discussionChannels))
          allDiscussionChannels.push(...userObj.discussionChannels);
        if (Array.isArray(userObj.discussionMessages))
          allDiscussionMessages.push(...userObj.discussionMessages);
        if (Array.isArray(userObj.discussionPolls))
          allDiscussionPolls.push(...userObj.discussionPolls);
        if (Array.isArray(userObj.coursePresence))
          allCoursePresence.push(...userObj.coursePresence);
        if (Array.isArray(userObj.courseDonations))
          allDonations.push(...userObj.courseDonations);
      });

      // Deduplicate arrays by id
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
          // Ignore cache errors
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
        dedupeById(allEnrollments),
        setEnrollmentRequests,
      );
      updateAndCache(
        "courseDonations",
        dedupeById(allDonations),
        setCourseDonations,
      );
      updateAndCache(
        "orgJoinRequests",
        dedupeById(allOrgJoinRequests),
        setOrgJoinRequests,
      );
      updateAndCache("userProgress", dedupeById(allProgress), setUserProgress);
      updateAndCache("materials", dedupeById(allMaterials), setMaterials);
      updateAndCache("attendanceRecords", allAttendance, setAttendanceRecords);
      updateAndCache("assessments", dedupeById(allAssessments), setAssessments);
      updateAndCache("submissions", dedupeById(allSubmissions), setSubmissions);
      updateAndCache(
        "scheduleEvents",
        dedupeById(allScheduleEvents),
        setScheduleEvents,
      );
      updateAndCache("orgMembers", dedupeById(allMembers), setOrgMembers);
      updateAndCache("messages", dedupeById(allMessages), setMessages);
      updateAndCache(
        "discussionChannels",
        dedupeById(allDiscussionChannels),
        setDiscussionChannels,
      );
      updateAndCache(
        "discussionMessages",
        dedupeById(allDiscussionMessages),
        setDiscussionMessages,
      );
      updateAndCache(
        "discussionPolls",
        dedupeById(allDiscussionPolls),
        setDiscussionPolls,
      );
      updateAndCache(
        "coursePresence",
        dedupeById(allCoursePresence),
        setCoursePresence,
        "registeredUsers",
        dedupeById(allRegisteredUsers),
        setRegisteredUsers,
      );
    } catch (err) {
      console.error("loadAllBackpackData failed:", err);
    } finally {
      setIsLoadingApp(false);
    }
  };

  useEffect(() => {
    loadAllBackpackData();
  }, [currentUser]);

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

  // Course Operations (stored in backpack/{orgId}.user.courses)
  const addCourse = async (course: Course) => {
    const cleaned = sanitizeForFirestore(course);
    const targetUid = course.orgId || currentUser?.id || "";

    await updateBackpackUserField<Course>(targetUid, "courses", (list) => [
      ...list.filter((c) => c.id !== course.id),
      cleaned,
    ]);
    setCourses((prev) => [...prev.filter((c) => c.id !== course.id), cleaned]);
  };

  const updateCourse = async (courseId: string, updates: Partial<Course>) => {
    const cleaned = sanitizeForFirestore(updates);
    const existingCourse = courses.find((c) => c.id === courseId);
    if (!existingCourse) return;

    const targetUid = existingCourse.orgId || currentUser?.id || "";
    await updateBackpackUserField<Course>(targetUid, "courses", (list) =>
      list.map((c) => (c.id === courseId ? { ...c, ...cleaned } : c)),
    );
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...cleaned } : c)),
    );
  };

  // Admission Gate calculation
  // "The organisation should provide a tuition cost per student for the course to calculate admission gate (decimal results should only consider the whole number for the number of students allowed to join)."
  const getCourseAdmissionGate = (courseId: string): AdmissionGateStatus => {
    const course = courses.find((c) => c.id === courseId);
    const org = organizations.find(
      (o) => o.id === course?.orgId || o.ownerId === course?.orgId,
    );
    const isVocational = org?.orgType === "vocational";
    const isDonationFunded =
      isVocational && course?.fundingModel === "donations_sponsorships";
    const tuitionCost = isDonationFunded
      ? course?.tuitionCostPerStudent || course?.price || 0
      : course?.price || 0;

    const donations = courseDonations.filter((d) => d.courseId === courseId);
    const totalDonations =
      donations.reduce((sum, d) => sum + d.amount, 0) ||
      course?.totalDonationsReceived ||
      0;

    // Decimal results should only consider the whole number for the number of students allowed to join
    const maxAdmissibleStudents =
      isDonationFunded && tuitionCost > 0
        ? Math.floor(totalDonations / tuitionCost)
        : 0;

    const approvedEnrollments = enrollmentRequests.filter(
      (r) => r.courseId === courseId && r.status === "approved",
    );
    const currentlyAdmittedCount = approvedEnrollments.length;
    const remainingSpots = isDonationFunded
      ? Math.max(0, maxAdmissibleStudents - currentlyAdmittedCount)
      : 999999;
    const canAdmitMore =
      !isDonationFunded || currentlyAdmittedCount < maxAdmissibleStudents;
    const nextSeatNeededAmount =
      isDonationFunded && tuitionCost > 0
        ? Math.max(
            0,
            (currentlyAdmittedCount + 1) * tuitionCost - totalDonations,
          )
        : 0;

    return {
      isVocational,
      isDonationFunded,
      tuitionCostPerStudent: tuitionCost,
      totalDonations,
      maxAdmissibleStudents,
      currentlyAdmittedCount,
      remainingSpots,
      canAdmitMore,
      currency: course?.currency || "NGN",
      nextSeatNeededAmount,
    };
  };

  const addCourseDonation = async (donation: CourseDonation) => {
    const cleaned = sanitizeForFirestore(donation);
    const targetOrgId = donation.orgId;
    const existingOrg = organizations.find(
      (o) => o.id === targetOrgId || o.ownerId === targetOrgId,
    );
    const targetUid = existingOrg?.ownerId || existingOrg?.id || targetOrgId;

    if (targetUid) {
      await updateBackpackUserField<CourseDonation>(
        targetUid,
        "courseDonations",
        (list) => [...list.filter((d) => d.id !== donation.id), cleaned],
      );
    }

    setCourseDonations((prev) => {
      const updated = [...prev.filter((d) => d.id !== donation.id), cleaned];
      try {
        localStorage.setItem(
          "bp_cache_courseDonations",
          JSON.stringify(updated),
        );
      } catch {
        // Ignore cache errors
      }
      return updated;
    });

    const targetCourse = courses.find((c) => c.id === donation.courseId);
    if (targetCourse) {
      const newTotal =
        (targetCourse.totalDonationsReceived || 0) + donation.amount;
      await updateCourse(targetCourse.id, { totalDonationsReceived: newTotal });
    }

    const courseTitle = targetCourse?.title || "Vocational Course";
    const donorDisplay = donation.isAnonymous
      ? "An anonymous donor"
      : donation.donorName || "A generous sponsor";

    if (
      donation.donationType === "sponsorship" &&
      donation.sponsoredStudentEmails &&
      donation.sponsoredStudentEmails.length > 0
    ) {
      const studentEmails = donation.sponsoredStudentEmails;
      const registeredStudentSummaries: string[] = [];
      const nonUserStudentEmails: string[] = [];

      for (const rawEmail of studentEmails) {
        const cleanEmail = rawEmail.trim().toLowerCase();
        if (!cleanEmail) continue;

        // Find if this student is an existing registered user
        const matchingUser =
          registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail) ||
          (currentUser?.email?.toLowerCase() === cleanEmail
            ? currentUser
            : undefined);

        const studentMeta = donation.sponsoredStudents?.find(
          (s) => s.email.toLowerCase() === cleanEmail,
        );
        const effectiveStudentName =
          matchingUser?.name ||
          (studentMeta?.name?.trim()
            ? studentMeta.name.trim()
            : "Sponsored Student");

        // Always create OrgMember invite record with fee covered
        const newInvite: OrgMember = {
          id: generateId("member"),
          orgId: targetOrgId,
          name: effectiveStudentName,
          email: cleanEmail,
          role: "student",
          department: "Sponsored / Vocational Program",
          courseIds: [donation.courseId],
          joinedAt: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: "invited",
          requiresPayment: false,
          requiresDocuments: false,
          inviteNote: `Full tuition sponsored by ${donorDisplay}.`,
        };
        await addOrgMember(newInvite);

        if (matchingUser) {
          registeredStudentSummaries.push(
            `${matchingUser.name} (${cleanEmail})`,
          );
          // Student is a registered user: notify them IN-APP (like when invited to courses)
          addNotification({
            userId: matchingUser.id,
            title: "Course Sponsorship & Invitation 🎓",
            message: `You have been sponsored by ${donorDisplay} for "${courseTitle}"! Your tuition is fully covered. Click to accept and start learning.`,
            type: "enrollment",
            linkUrl: `/dashboard#pending-course-invitations`,
          });
        } else {
          // Student is NOT a registered user yet
          const displayStr = studentMeta?.name?.trim()
            ? `${studentMeta.name.trim()} (${cleanEmail})`
            : cleanEmail;
          nonUserStudentEmails.push(displayStr);
        }
      }

      // School gets in-app notification detailing both registered student users and non-user students
      if (targetUid) {
        const regMsg =
          registeredStudentSummaries.length > 0
            ? ` Registered student user(s): ${registeredStudentSummaries.join(", ")}.`
            : "";
        const nonUserMsg =
          nonUserStudentEmails.length > 0
            ? ` Non-user student email(s): ${nonUserStudentEmails.join(", ")}.`
            : "";

        addNotification({
          userId: targetUid,
          title: "Student Sponsorship Received 🎓",
          message: `${donorDisplay} has sponsored tuition for ${studentEmails.length} student(s) for "${courseTitle}".${regMsg}${nonUserMsg}`,
          type: "enrollment",
          linkUrl: `/dashboard`,
        });
      }

      // Check if any matching enrollment requests exist and flag as sponsored
      const matchingReqs = enrollmentRequests.filter(
        (r) =>
          r.courseId === donation.courseId &&
          r.userEmail &&
          studentEmails.some(
            (e) => e.toLowerCase() === r.userEmail?.toLowerCase(),
          ),
      );
      for (const req of matchingReqs) {
        await updateEnrollmentRequest(req.id, undefined, undefined, undefined, {
          isSponsored: true,
          sponsorName: donation.isAnonymous
            ? "Anonymous Sponsor"
            : donation.donorName,
          sponsorEmail: donation.donorEmail,
        });
      }
    } else {
      if (targetUid) {
        addNotification({
          userId: targetUid,
          title: "New Course Donation Received 💖",
          message: `${donorDisplay} donated towards student tuition seats for "${courseTitle}".`,
          type: "info",
          linkUrl: `/dashboard`,
        });
      }
    }
  };

  // Enrollment Request Operations (stored in backpack/{userId}.user.enrollmentRequests & org's backpack)
  const addEnrollmentRequest = async (req: EnrollmentRequest) => {
    // Check if there was an existing request for this user and course (e.g. previously rejected or cancelled)
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

    const payload: EnrollmentRequest = {
      ...req,
      reapplicationHistory,
    };
    const cleaned = sanitizeForFirestore(payload);

    // Store in student's backpack (replacing any existing request for same course or id)
    if (req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) => [
          ...list.filter(
            (r) =>
              r.id !== req.id &&
              !(r.courseId === req.courseId && r.userId === req.userId),
          ),
          cleaned,
        ],
      );
    }
    // Also store in org's backpack if distinct
    if (req.orgId && req.orgId !== req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) => [
          ...list.filter(
            (r) =>
              r.id !== req.id &&
              !(r.courseId === req.courseId && r.userId === req.userId),
          ),
          cleaned,
        ],
      );
    }

    setEnrollmentRequests((prev) => [
      ...prev.filter(
        (r) =>
          r.id !== req.id &&
          !(r.courseId === req.courseId && r.userId === req.userId),
      ),
      cleaned,
    ]);

    // Send notification to organization / course owner
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
    extraUpdates?: Partial<EnrollmentRequest>,
  ) => {
    const req = enrollmentRequests.find((r) => r.id === id);
    if (!req) return;

    const updates: Partial<EnrollmentRequest> = { ...(extraUpdates || {}) };
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (status === "rejected") {
      updates.rejectedAt = new Date().toISOString();
      if (rejectionReason) updates.rejectionReason = rejectionReason;
      if (req.sessionId) updates.rejectedSessionId = req.sessionId;
    }

    if (status === "approved") {
      const targetCourse = courses.find((c) => c.id === req.courseId);
      const targetOrg = organizations.find(
        (o) =>
          o.id === targetCourse?.orgId || o.ownerId === targetCourse?.orgId,
      );
      if (
        targetOrg?.orgType === "vocational" &&
        targetCourse?.fundingModel === "donations_sponsorships"
      ) {
        const gate = getCourseAdmissionGate(targetCourse.id);
        // Only the number of students whose tuition could be covered by these donations can be admitted
        if (!gate.canAdmitMore) {
          throw new Error(
            `Admission Gate Reached: Current donations (${gate.currency} ${gate.totalDonations.toLocaleString()}) only cover up to ${gate.maxAdmissibleStudents} student(s) at ${gate.currency} ${gate.tuitionCostPerStudent.toLocaleString()} per student. At least ${gate.currency} ${gate.nextSeatNeededAmount.toLocaleString()} more in donations or sponsorships is required before admitting another student.`,
          );
        }
        // Student admission is fully covered by donor funding
        updates.paymentStatus = "paid";
      }
    }

    // Auto-detect if student was sponsored by a donor
    if (req.userEmail && !updates.isSponsored) {
      const courseSponsorships = courseDonations.filter(
        (d) =>
          d.courseId === req.courseId &&
          d.donationType === "sponsorship" &&
          d.sponsoredStudentEmails?.some(
            (e) => e.toLowerCase() === req.userEmail?.toLowerCase(),
          ),
      );
      if (courseSponsorships.length > 0) {
        const sp = courseSponsorships[0];
        updates.isSponsored = true;
        updates.sponsorName = sp.isAnonymous
          ? "Anonymous Sponsor"
          : sp.donorName;
        updates.sponsorEmail = sp.donorEmail;
      }
    }

    if (req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) => list.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    }
    if (req.orgId && req.orgId !== req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) => list.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    }

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

    if (req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.userId,
        "enrollmentRequests",
        (list) => list.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    }
    if (req.orgId && req.orgId !== req.userId) {
      await updateBackpackUserField<EnrollmentRequest>(
        req.orgId,
        "enrollmentRequests",
        (list) => list.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    }

    // Add in-app notification
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
        "orgMembers",
        (list) => [...list.filter((m) => m.id !== member.id), cleaned],
      );
    }
    setOrgMembers((prev) => [
      ...prev.filter((m) => m.id !== member.id),
      cleaned,
    ]);
  };

  const updateOrgMember = async (id: string, updates: Partial<OrgMember>) => {
    const member = orgMembers.find((m) => m.id === id);
    if (member && member.orgId) {
      const targetUid = member.orgId.startsWith("org_")
        ? member.orgId.replace("org_", "")
        : member.orgId;
      await updateBackpackUserField<OrgMember>(
        targetUid,
        "orgMembers",
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
        "orgMembers",
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
        "userProgress",
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
        "materials",
        (list) => [...list, cleaned],
      );
    }
    setMaterials((prev) => [...prev, cleaned]);
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    const targetUid = currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<Material>(targetUid, "materials", (list) =>
        list.map((m) => (m.id === id ? { ...m, ...updates } : m)),
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
          "materials",
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
        "assessments",
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
        "submissions",
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
        "submissions",
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
    const cleaned = sanitizeForFirestore(event);
    const targetUid = currentUser?.id || "";

    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "scheduleEvents",
        (list) => [...list.filter((e) => e.id !== event.id), cleaned],
      );
    }
    setScheduleEvents((prev) => [
      ...prev.filter((e) => e.id !== event.id),
      cleaned,
    ]);
  };

  const updateScheduleEvent = async (
    id: string,
    updates: Partial<ScheduleEvent>,
  ) => {
    const targetUid = currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "scheduleEvents",
        (list) => list.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
    }

    setScheduleEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
    if (updates.isActive) {
      const evt = scheduleEvents.find((e) => e.id === id);
      if (evt) {
        addNotification({
          title: `📹 Live Class Started: ${evt.title}`,
          message: `The live stream for this class has officially started. Click to join now!`,
          type: "live_class",
          linkUrl: `/course/${evt.courseId}`,
        });
      }
    }
  };

  const deleteScheduleEvent = async (id: string) => {
    const targetUid = currentUser?.id || "";
    if (targetUid) {
      await updateBackpackUserField<ScheduleEvent>(
        targetUid,
        "scheduleEvents",
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
      "messages",
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
        "discussionChannels",
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
        "discussionMessages",
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
            "discussionMessages",
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
        "discussionMessages",
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
        "discussionMessages",
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
        "discussionPolls",
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

    // One vote per user per poll: remove this user from every option first,
    // then add them to the chosen one (lets a vote change count as a switch).
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
        "discussionPolls",
        (list) => list.map((p) => (p.id === pollId ? updatedPoll : p)),
      );
    }
    setDiscussionPolls((prev) =>
      prev.map((p) => (p.id === pollId ? updatedPoll : p)),
    );
  };

  // Heartbeat presence. "Online" is derived in the UI as
  // (Date.now() - lastActiveAt) < 2 minutes -- there is no disconnect
  // hook in this storage pattern, so a closed tab simply ages out rather
  // than being detected immediately.
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
        "coursePresence",
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
        "discussionMessages",
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
