export type Role = 'student' | 'organization' | 'instructor';

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
  providerType: 'organization' | 'instructor';
  providerName: string;
  subaccountCode: string;
  totalAmount: number;
  providerShareAmount: number;
  platformFeeAmount: number;
  percentageCharge: number;
  currency: string;
  status: 'initialized' | 'success' | 'failed';
  createdAt: string;
  paymentUrl?: string;
}

export interface UserDocument {
  id: string;
  title: string;
  url: string;
  category: 'cv' | 'certificate' | 'id_proof' | 'transcript' | 'other';
  uploadedAt: string;
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

  // Organization attributes stored directly in personalInformation map
  description?: string;
  location?: string;
  baseCurrency?: string;
  orgType?: 'basic' | 'higher' | 'vocational';
  address?: string;
  registrationId?: string;
  isAccredited?: boolean;
  accreditingBody?: string;
  accreditationStatus?: 'accredited' | 'pending' | 'unaccredited';
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
  orgType?: 'basic' | 'higher' | 'vocational';
  kycVerified?: boolean;
  kycDocumentUrl?: string;
  address?: string;
  registrationId?: string;
  isAccredited?: boolean;
  accreditingBody?: string;
  accreditationStatus?: 'accredited' | 'pending' | 'unaccredited';
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
  status: 'open' | 'closed';
  startDate?: string;
  endDate?: string;
  applicationDeadline?: string;
  academicYear?: string;
  notes?: string;
  createdAt: string;
  closedAt?: string;
}

export interface Course {
  id: string;
  orgId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  paymentTerms?: 'one-time' | 'installment';
  paymentTermsAllowed?: 'one-time' | 'installment' | 'both';
  installmentInterval?: 'weekly' | 'monthly' | 'custom';
  customMilestonesText?: string;
  qualificationTitle?: string;
  qualificationType?: 'bachelors' | 'masters' | 'doctorate' | 'diploma' | 'certificate' | 'professional' | 'other';
  instructorName?: string;
  instructorId?: string;
  requiredDocuments?: string[];
  requirements?: string;
  applicationProcess?: string;
  instructorRequirements?: string;
  admissionStatus?: 'open' | 'closed'; // 'open' = accepting applications, 'closed' = admissions closed
  activeSessionId?: string;
  activeSessionName?: string;
  admissionSessions?: AdmissionSession[];
  modules: CourseModule[];
  certificateConfig?: { enabled: boolean; logoUrl?: string; signatureUrl?: string; customText?: string; orgName?: string; gradeLevel?: string; authorizedSealUrl?: string; qualificationTitle?: string };
}

export interface CourseModuleMedia {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

export interface CourseModuleItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'embed' | 'text' | 'link';
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
  status: 'pending' | 'approved' | 'rejected';
}

export interface ReapplicationRecord {
  id: string;
  sessionId?: string;
  sessionName?: string;
  appliedAt: string;
  status: 'rejected' | 'cancelled';
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface EnrollmentRequest {
  id: string;
  userId: string;
  orgId: string;
  courseId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid';
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
  paymentMethod?: 'one-time' | 'installment';
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
}

export interface UserProgress {
  id?: string;
  userId: string;
  courseId: string;
  completedModuleIds: string[];
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
  type: 'pdf' | 'doc' | 'video' | 'link';
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId?: string;
  name: string;
  email: string;
  role: 'instructor' | 'student';
  department?: string;
  courseIds?: string[];
  joinedAt: string;
  status: 'active' | 'invited' | 'pending' | 'graduated';
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
  fileType?: 'image' | 'video' | 'document';
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  type: 'assignment' | 'test' | 'exam' | 'project';
  maxScore: number;
  dueDate: string;
  isGroup?: boolean;
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
  status: 'submitted' | 'graded';
}

export interface ScheduleEvent {
  id: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  type: 'lecture' | 'meeting' | 'exam';
  meetingUrl?: string; // For the video call
  isActive?: boolean;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'live_class' | 'enrollment' | 'grade' | 'material' | 'info';
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}

