export type Role = "student" | "organization" | "instructor" | "super_admin" | "org_admin";

export interface OrganizationAdmin {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "staff";
  permissions: string[]; // e.g. ["attendance_edit", "course_edit", "member_manage", "domain_manage"]
  orgId: string;
  password?: string; // For mock local auth if needed, though we prefer linking to a user
  userId?: string;
}

export interface PaystackSubaccount {
  subaccount_code: string;
  business_name: string;
  bank_code: string;
  bank_name?: string;
  country?: string;
  currency?: string;
  account_number: string;
  account_name?: string;
  percentage_charge: number; // e.g., 85 (%) goes to provider, 15% to platform
  description?: string;
  is_verified?: boolean;
  // is_live?: boolean; // Commented out per user instruction
  mode?: "test" | "live";
  updatedAt?: string;
}

export interface PaystackSplitTransaction {
  id: string;
  reference: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentEmail: string;
  providerId: string;
  providerType: "organization" | "instructor";
  providerName: string;
  subaccountCode: string;
  subaccount_code?: string;
  // is_live?: boolean; // Commented out per user instruction
  mode?: "test" | "live";
  totalAmount: number;
  providerShareAmount: number;
  platformFeeAmount: number;
  percentageCharge: number;
  currency: string;
  status: "initialized" | "success" | "failed";
  createdAt: string;
  paymentUrl?: string;
}

export interface InstructorPayrollRecipient {
  id: string;
  orgId: string;
  instructorId: string;
  instructorName: string;
  instructorEmail?: string;
  subaccountCode: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  currency: string;
  defaultSalary?: number;
  roleTitle?: string;
  source?: "online" | "offline";
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollSplitMember {
  instructorId: string;
  instructorName: string;
  instructorEmail?: string;
  subaccountCode: string;
  bankName?: string;
  accountNumber?: string;
  amount: number; // Fixed amount in major currency unit (e.g. NGN 150000) when flat split
  sharePercentage?: number; // % share when percentage split
}

export interface PayrollSplitGroup {
  id: string;
  orgId: string;
  name: string;
  splitCode: string; // Live Paystack SPL_... code
  paystackSplitId?: number | string;
  type: "flat" | "percentage";
  currency: string;
  bearerType: "all-proportional" | "all" | "subaccount" | "account";
  bearerSubaccount?: string;
  members: PayrollSplitMember[];
  totalAmount?: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollDisbursement {
  id: string;
  orgId: string;
  reference: string;
  paymentType: "individual" | "split_group" | "batch_split";
  splitGroupId?: string;
  splitCode?: string;
  splitGroupName?: string;
  payerEmail: string;
  currency: string;
  totalAmount: number;
  platformCut: 0; // Guaranteed zero platform touch
  recipients: Array<{
    instructorId: string;
    instructorName: string;
    instructorEmail?: string;
    subaccountCode: string;
    bankName?: string;
    accountNumber?: string;
    amount: number;
  }>;
  status: "success" | "failed" | "initialized";
  note?: string;
  payPeriod?: string;
  paidAt: string;
  createdAt: string;
  initiatedBy?: string;
}

export interface UserDocument {
  id: string;
  title: string;
  url: string;
  category: "cv" | "certificate" | "id_proof" | "transcript" | "other";
  uploadedAt: string;
}

export interface SpecialNeedsAccommodations {
  enabled: boolean;
  disabilityCategories: string[]; // e.g. "visual_impairment", "hearing_impairment", "adhd_neurodivergent", "dyslexia_reading", "motor_mobility", "chronic_illness", "mental_health", "temporary_injury", "other"
  otherCategoryDescription?: string;
  examTimeMultiplier: 1.0 | 1.25 | 1.5 | 2.0;
  preferredFormatting: string[]; // e.g. "large_text", "dyslexia_font", "extra_breaks", "screen_reader_optimized", "captioning_subtitles", "reduced_motion"
  medicalNotes?: string;
  emergencyHealthNotice?: string;
  requestedServices?: string[]; // e.g. "sign_language", "captions", "notetaker", "braille_tactile", "assistive_tech", "flexible_deadlines"
  allowInstructorVisibility?: boolean;
  allowReviewerVisibility?: boolean;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  orgId?: string;
  bio?: string;
  headline?: string;
  cvUrl?: string;
  kycVerified?: boolean;
  kycDocumentUrl?: string;
  userDocuments?: UserDocument[];
  paystackSubaccount?: PaystackSubaccount;
  createdAt?: string;
  accommodations?: SpecialNeedsAccommodations;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspendedReason?: string;

  // Organization attributes stored directly in personalInformation map
  description?: string;
  location?: string;
  baseCurrency?: string;
  orgType?: "basic" | "higher" | "vocational";
  address?: string;
  registrationId?: string;
  isAccredited?: boolean;
  accreditingBody?: string;
  accreditationStatus?: "accredited" | "pending" | "unaccredited";
  accreditationDocUrl?: string;
  ownerId?: string;
  logoUrl?: string;
  motto?: string;
  phone?: string;
  website?: string;
  themeColor?: string;
  academicHighlights?: string[];
  isDeleted?: boolean;
  plan?: OrgPlanTier;
}

export type OrgPlanTier = "free" | "paid";

export interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  ownerId: string;
  baseCurrency: string;
  location?: string;
  orgType?: "basic" | "higher" | "vocational";
  kycVerified?: boolean;
  kycDocumentUrl?: string;
  address?: string;
  registrationId?: string;
  isAccredited?: boolean;
  accreditingBody?: string;
  accreditationStatus?: "accredited" | "pending" | "unaccredited";
  accreditationDocUrl?: string;
  motto?: string;
  phone?: string;
  website?: string;
  themeColor?: string;
  academicHighlights?: string[];
  isDeleted?: boolean;
  paystackSubaccount?: PaystackSubaccount;
  plan?: OrgPlanTier;
  // Domain Verification
  domain?: string; // e.g. "academy.edu"
  isDomainVerified?: boolean;
  domainVerificationToken?: string;
  domainVerificationMethod?: "dns" | "html" | "meta";
  // Staff / Org Admins
  admins?: OrganizationAdmin[];
}

export interface AdmissionSession {
  id: string;
  name: string; // e.g. "2026/2027 Session", "Fall 2026 Cohort", "Batch A - 2026"
  status: "open" | "closed";
  startDate?: string;
  endDate?: string;
  applicationDeadline?: string;
  academicYear?: string;
  notes?: string;
  createdAt: string;
  closedAt?: string;
}

export interface CourseReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  role?: string;
}

export interface CourseFAQ {
  question: string;
  answer: string;
  category?: string;
}

export interface Course {
  id: string;
  orgId: string;
  createdBy?: string;
  title: string;
  subtitle?: string;
  description: string;
  coverImageUrl?: string;
  price: number;
  currency: string;
  paymentTerms?: "one-time" | "installment";
  paymentTermsAllowed?: "one-time" | "installment" | "both";
  installmentInterval?: "weekly" | "monthly" | "custom";
  customMilestonesText?: string;
  qualificationTitle?: string;
  qualificationType?:
    | "bachelors"
    | "masters"
    | "doctorate"
    | "diploma"
    | "certificate"
    | "professional"
    | "other";
  instructorName?: string;
  instructorId?: string;
  instructors?: string[];
  instructorBio?: string;
  instructorTitle?: string;
  instructorAvatarUrl?: string;
  pacing?: "self-paced" | "live-online" | "blended";
  timeCommitment?: string;
  durationWeeks?: number | string;
  totalHours?: number | string;
  language?: string;
  subtitles?: string[];
  accessDuration?: string;
  accessType?: "graduation_removal" | "lifetime" | "session_bound" | "fixed_term" | "custom";
  studentRemovalOnGraduation?: boolean;
  learningObjectives?: string[];
  whyItMatters?: string;
  prerequisites?: string[];
  certificationDetails?: string;
  refundPolicy?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: CourseReview[];
  faqs?: CourseFAQ[];
  studentMetrics?: {
    enrolledCount?: number;
    completionRate?: string;
    satisfactionRate?: string;
  };
  requiredDocuments?: string[];
  requirements?: string;
  applicationProcess?: string;
  instructorRequirements?: string;
  admissionStatus?: "open" | "closed"; // 'open' = accepting applications, 'closed' = admissions closed
  activeSessionId?: string;
  activeSessionName?: string;
  admissionSessions?: AdmissionSession[];
  fundingModel?: "direct_tuition" | "donations_sponsorships";
  tuitionCostPerStudent?: number;
  totalDonationsReceived?: number;
  donationTargetAmount?: number;
  modules: CourseModule[];
  certificateConfig?: {
    enabled: boolean;
    logoUrl?: string;
    signatureUrl?: string;
    customText?: string;
    orgName?: string;
    gradeLevel?: string;
    authorizedSealUrl?: string;
    qualificationTitle?: string;
    themeColor?: string;
    textColor?: string;
    layout?: "classic" | "modern" | "minimal" | "elegant" | "creative";
  };
}

export interface CourseModuleMedia {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "document";
}

export interface CourseModuleItem {
  id: string;
  title: string;
  type: "text" | "video" | "document" | "audio" | "picture" | "embed" | "link";
  description?: string;
  content?: string;
  url?: string;
  videoUrl?: string;
  documentUrl?: string;
  audioUrl?: string;
  pictureUrl?: string;
  embedUrl?: string;
  formats?: ("text" | "video" | "document" | "audio" | "picture" | "embed" | "link")[];
  duration?: string;
  learningOutcome?: string;
}

export type CourseLecture = CourseModuleItem;

export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  learningObjectives?: string;
  items?: CourseModuleItem[];
  lectures?: CourseModuleItem[];
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  learningGoals?: string;
  sections?: CourseSection[];
  items?: CourseModuleItem[];

  content?: string;
  fileUrls?: string[];
  media?: CourseModuleMedia[];
}

export interface OrgJoinRequest {
  id: string;
  userId: string;
  orgId: string;
  userName: string;
  orgName: string;
  status: "pending" | "approved" | "rejected";
}

export interface ReapplicationRecord {
  id: string;
  sessionId?: string;
  sessionName?: string;
  appliedAt: string;
  status: "rejected" | "cancelled";
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface EnrollmentRequest {
  id: string;
  userId: string;
  orgId: string;
  courseId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  paymentStatus?: "unpaid" | "paid";
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
  paymentMethod?: "one-time" | "installment";
  sessionId?: string;
  sessionName?: string;
  documents?: Record<string, string>; // docName -> fileUrl
  additionalDocuments?: Array<{ id: string; name: string; url: string }>;
  requirementAnswers?: Record<string, string>;
  studentNotes?: string;
  requirementFileUrl?: string;
  appliedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectedSessionId?: string;
  reapplicationHistory?: ReapplicationRecord[];
  isSponsored?: boolean;
  sponsorName?: string;
  sponsorEmail?: string;
  accommodations?: SpecialNeedsAccommodations;
}

export interface CourseDonation {
  id: string;
  courseId: string;
  courseTitle?: string;
  orgId: string;
  amount: number;
  currency: string;
  donorName?: string;
  donorEmail: string;
  isAnonymous?: boolean;
  donationType: "general" | "sponsorship";
  numberOfStudents?: number;
  sponsoredStudentEmails?: string[];
  sponsoredStudents?: { name?: string; email: string }[];
  donorNote?: string;
  message?: string;
  paymentReference?: string;
  transactionRef?: string;
  status?: string;
  donorOrganization?: string;
  seatsSponsored?: number;
  createdAt: string;
}

export interface UserProgress {
  id?: string;
  userId: string;
  courseId: string;
  completedModuleIds: string[];
  completedItemIds?: string[];
  performanceScore: number;
}

export type AttendanceMode = "physical" | "online" | "hybrid";
export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type TeacherDutyType =
  | "teaching"
  | "office_hours"
  | "grading"
  | "lab_supervision"
  | "department_duty"
  | "general_duty";
export type TeacherDutyStatus = "on_duty" | "completed" | "delayed";

export interface GateLogMovement {
  id: string;
  type: "in" | "out";
  timestampMs: number;
  timeDisplay: string; // e.g. "07:54 AM"
  location?: string;
  note?: string;
  recordedBy?: string;
}

export interface GateLogRecord {
  id: string;
  orgId: string;
  date: string; // YYYY-MM-DD
  personId: string;
  personName: string;
  personEmail?: string;
  personRole: "teacher" | "student";
  personType?: "online" | "offline";
  status: "on_campus" | "left_campus";
  firstArrivalTime?: string;
  lastCheckOutTime?: string;
  movements: GateLogMovement[];
  totalCampusMinutes: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineRosterStudent {
  id: string;
  orgId?: string;
  courseId: string;
  name: string;
  code?: string;
  email?: string;
  studentType: "offline";
  addedAt: string;
  addedBy?: string;
}

export interface SchoolOfflineMember {
  id: string;
  orgId: string;
  name: string;
  role: "teacher" | "student";
  code?: string;
  email?: string;
  department?: string;
  addedAt: string;
  addedBy?: string;
}

export interface TeacherDutyRecord {
  id: string;
  orgId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // e.g. "08:15 AM"
  checkOutTime?: string; // e.g. "04:30 PM"
  totalMinutes?: number;
  mode: "physical" | "online" | "hybrid";
  location?: string; // e.g. "Campus Block B Faculty Room", "Virtual Academic Station"
  dutyType: TeacherDutyType;
  status: TeacherDutyStatus;
  workNotes?: string;
  courseId?: string;
  courseTitle?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TruancySummary {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  courseId: string;
  courseTitle: string;
  totalSessions: number;
  attendedSessions: number;
  unexcusedAbsences: number;
  excusedAbsences: number;
  lateArrivals: number;
  attendanceRate: number; // 0 - 100 percentage
  truancyLevel: "good" | "warning" | "critical";
  lastAbsenceDate?: string;
}

export interface AttendanceMovement {
  action: "in" | "out";
  time: string;
  timestampMs: number;
  channel?: "offline" | "online";
}

export interface AttendanceEntry {
  id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  role: "student" | "instructor";
  participantType?: "online" | "offline"; // Online auto-registered vs Offline added
  status: AttendanceStatus;
  activeInClass?: boolean; // True while currently in class awaiting check-out
  checkInTime?: string; // e.g. "08:30 AM"
  checkInMs?: number;
  checkOutTime?: string; // e.g. "12:45 PM"
  checkOutMs?: number;
  movements?: AttendanceMovement[];
  durationMinutes: number; // accumulated class engagement duration in minutes
  location?: string; // e.g. "Campus Hall A", "Online Live Classroom"
  verifiedBy?: string; // admin or instructor name
  method?: "manual" | "duty_terminal" | "live_online" | "verification_code" | "self_clock" | "campus_terminal";
  notes?: string;
  truancyWarning?: boolean;
  excuseReason?:
    | "medical"
    | "authorized_leave"
    | "family_emergency"
    | "school_event"
    | "technical_disruption";
  excuseNotes?: string;
}

export interface AttendanceRecord {
  id?: string;
  courseId: string;
  courseTitle?: string;
  orgId?: string;
  date: string; // YYYY-MM-DD
  records?: Record<string, boolean>; // backward-compatible userId -> isPresent
  mode?: AttendanceMode; // "physical" | "online" | "hybrid"
  sessionStatus?: "live" | "ended";
  sessionTitle?: string; // e.g., "Physical Day 14 Lecture", "Campus Morning Attendance", "Live Online Class"
  location?: string; // e.g., "Campus Block B, Hall 102"
  startTime?: string;
  startMs?: number;
  endTime?: string;
  endMs?: number;
  expectedDurationMinutes?: number;
  verificationCode?: string; // 6-digit session pin for student roll call
  schoolType?: "physical" | "online" | "hybrid";
  truancyThresholdPercent?: number; // e.g. 10
  entries?: AttendanceEntry[];
  instructorEngagement?: {
    instructorId: string;
    instructorName: string;
    participantType?: "online" | "offline";
    activeInClass?: boolean;
    checkInTime?: string;
    checkInMs?: number;
    checkOutTime?: string;
    checkOutMs?: number;
    durationMinutes: number;
    status: AttendanceStatus;
    dutyType?: TeacherDutyType;
    workNotes?: string;
  };
  totalAttendees?: number;
  avgEngagementMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id?: string;
  courseId: string;
  title: string;
  url?: string;
  type: "pdf" | "doc" | "video" | "link" | "notes";
  content?: string;
  createdAt?: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId?: string;
  name: string;
  email: string;
  role: "instructor" | "student";
  department?: string;
  courseIds?: string[];
  joinedAt: string;
  status: "active" | "invited" | "pending" | "graduated";
  requiresPayment?: boolean;
  requiresDocuments?: boolean;
  requiredDocNames?: string[];
  inviteNote?: string;
}

export interface ChatMessage {
  id?: string;
  courseId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  fileUrl?: string;
  fileType?: "image" | "video" | "document";
}

export interface DiscussionChannel {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  pinned?: boolean;
  order?: number;
  createdAt: string;
  resources?: DiscussionResource[];
  subscriberIds?: string[];
}

export interface DiscussionMessage {
  id: string;
  channelId: string;
  courseId: string;
  parentId?: string;
  senderId: string;
  senderName: string;
  senderRole?: "instructor" | "ta" | "student";
  text: string;
  fileUrl?: string;
  fileType?: "image" | "video" | "document";
  reactions?: Record<string, string[]>;
  verified?: boolean;
  replyCount?: number;
  createdAt: number;
  pinned?: boolean;
  links?: { label: string; url: string }[];
}

export interface DiscussionResource {
  id: string;
  name: string;
  url: string;
  sizeLabel?: string;
  addedByName?: string;
  verified?: boolean;
  createdAt: string;
}

export interface DiscussionPollOption {
  id: string;
  label: string;
  votes: string[];
}

export interface DiscussionPoll {
  id: string;
  channelId: string;
  courseId: string;
  question: string;
  options: DiscussionPollOption[];
  closesAt: number;
  createdAt: number;
}
export interface CoursePresence {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  role?: "instructor" | "ta" | "student";
  lastActiveAt: number;
}

// export interface Assessment {
//   id: string;
//   courseId: string;
//   title: string;
//   type: 'assignment' | 'test' | 'exam' | 'project';
//   maxScore: number;
//   dueDate: string;
//   isGroup?: boolean;
// }

export type AssessmentType =
  | "assignment"
  | "quiz"
  | "test"
  | "exam"
  | "project"
  | "classwork";

export type GradingType = "points" | "percentage" | "letter";

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "file_upload"
  | "mixed";

export type SubmissionMethod = "online" | "file_upload" | "in_class";

export interface Assessment {
  id: string;
  courseId: string;
  questions?: AssessmentQuestion[];

  // 1. Basic Assessment Information
  title: string;
  type: AssessmentType;
  subject?: string;
  gradeLevel?: string;
  description?: string;
  instructorName?: string;

  // 2. Scheduling
  startDate?: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;

  // 3. Grading
  maxScore: number;
  passingScore?: number;
  gradingType?: GradingType;
  weight?: number;

  // 4. Assessment Format
  questionType?: QuestionType;
  numberOfQuestions?: number;
  pointsPerQuestion?: number;
  attachments?: string[];
  referenceMaterials?: string;

  // 5. Student / Group Settings
  assignedStudentIds?: string[];
  isGroup?: boolean;
  groupSize?: number;
  randomizeQuestions?: boolean;
  allowMultipleAttempts?: boolean;
  maxAttempts?: number;

  // 6. Submission Settings
  submissionMethod?: SubmissionMethod;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
  allowResubmission?: boolean;
  requireStudentComments?: boolean;

  // 7. Results & Feedback
  showScoreImmediately?: boolean;
  releaseResultsDate?: string;
  showCorrectAnswers?: boolean;
  teacherFeedback?: string;
  allowStudentReview?: boolean;
}

export interface AssessmentQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  format: "objective" | "essay";
  questionType: "multiple_choice" | "true_false" | "essay";
  prompt: string;
  points: number;
  options?: AssessmentQuestionOption[];
  correctBoolean?: boolean;
  rubric?: string;
}

export interface Submission {
  id: string;
  assessmentId: string;
  userId: string;
  userName?: string;
  courseId: string;
  submittedAt: string;
  content: string;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  status: "submitted" | "graded";
  answers?: Record<string, string>;
  autoGradedPoints?: number;
  autoGradedMax?: number;
  pendingEssayGrading?: boolean;
  essayScores?: Record<string, number>;
}

export interface ScheduleEvent {
  id: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  type: "lecture" | "meeting" | "exam";
  meetingUrl?: string; // For the video call
  isActive?: boolean;
}

export interface AppNotification {
  id: string;
  userId?: string;
  courseId?: string;
  title: string;
  message: string;
  type: "live_class" | "enrollment" | "grade" | "material" | "info";
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}
