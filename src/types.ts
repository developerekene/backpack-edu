export type Role = "student" | "organization" | "instructor";

export interface PaystackSubaccount {
  subaccount_code: string;
  business_name: string;
  bank_code: string;
  bank_name?: string;
  account_number: string;
  account_name?: string;
  percentage_charge: number; // e.g., 90 (%) goes to provider, 10% to platform
  description?: string;
  is_verified?: boolean;
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
  totalAmount: number;
  providerShareAmount: number;
  platformFeeAmount: number;
  percentageCharge: number;
  currency: string;
  status: "initialized" | "success" | "failed";
  createdAt: string;
  paymentUrl?: string;
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
  bio?: string;
  headline?: string;
  cvUrl?: string;
  kycVerified?: boolean;
  kycDocumentUrl?: string;
  userDocuments?: UserDocument[];
  paystackSubaccount?: PaystackSubaccount;
  createdAt?: string;
  accommodations?: SpecialNeedsAccommodations;

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
}

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
  type: "video" | "document" | "embed" | "text" | "link";
  content?: string;
  url?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
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

export interface AttendanceRecord {
  id?: string;
  courseId: string;
  date: string;
  records: Record<string, boolean>; // userId -> isPresent
}

export interface Material {
  id?: string;
  courseId: string;
  title: string;
  url: string;
  type: "pdf" | "doc" | "video" | "link";
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
  title: string;
  message: string;
  type: "live_class" | "enrollment" | "grade" | "material" | "info";
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}
