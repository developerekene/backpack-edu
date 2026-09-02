import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Menu,
  X,
  FileText,
  Database,
  ListChecks,
  Scale,
  Share2,
  Cookie,
  Clock,
  UserCheck,
  Baby,
  GraduationCap,
  Building2,
  Lock,
  ExternalLink,
  Globe,
  RefreshCw,
  Mail,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  ChevronRight,
  List,
  Presentation,
  Users,
  MailCheck,
} from "lucide-react";

/* ============================================================= */
/* Types & Data                                                   */
/* ============================================================= */

type Audience = "students" | "instructors" | "organizations";

interface Block {
  type: "paragraph" | "list" | "subsection" | "note" | "table";
  heading?: string;
  text?: string;
  items?: string[];
  noteType?: "info" | "warning" | "success";
  columns?: string[];
  rows?: string[][];
  audience?: Audience;
}

interface PolicySection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  audiences: Audience[]; // empty = applies to everyone
  intro?: string;
  searchTerms?: string[];
  blocks: Block[];
}

const AUDIENCES: {
  key: Audience | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "all", label: "Everyone", icon: Users },
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "instructors", label: "Instructors", icon: Presentation },
  { key: "organizations", label: "Organizations", icon: Building2 },
];

const sections: PolicySection[] = [
  /* ----------------------------------------------------- */
  /* 1. Overview                                           */
  /* ----------------------------------------------------- */
  {
    id: "overview",
    title: "Overview",
    icon: FileText,
    audiences: [],
    intro:
      "Backpack is an education technology platform that helps schools, academies, instructors, and students organize courses, track progress, run live classes, and manage learning — all in one place.",
    searchTerms: ["introduction", "welcome", "who we are", "about this policy"],
    blocks: [
      {
        type: "paragraph",
        text: "This Privacy Policy explains what information we collect when you use the Backpack platform (the \u201cPlatform\u201d), why we collect it, how we use and protect it, and the choices you have over your personal information. We have written it in plain, human language because we believe privacy should not require a law degree to understand.",
      },
      {
        type: "paragraph",
        text: "The Policy applies to everyone who uses the Platform \u2014 students, instructors, parents and guardians, and the schools, academies, and organizations that sponsor learning. When an organization (such as a school or academy) invites you to a course, we may process your information on behalf of that organization. In those cases, your relationship with the organization, and its own privacy practices, may also apply.",
      },
      {
        type: "list",
        heading: "Our promises to you",
        items: [
          "We never sell your personal information. Not now, not ever.",
          "You can access, correct, export, or delete your information whenever you choose.",
          "We only collect what we need to make the Platform work well for you.",
          "We protect learners, especially minors, with extra care.",
          "We use trusted, vetted service providers to keep your data safe.",
          "We are always reachable \u2014 just email support@backpack.africa.",
        ],
      },
      {
        type: "note",
        noteType: "info",
        text: "If you have questions at any point, you can reach our team at support@backpack.africa with the subject line \u201cPrivacy\u201d. We are here to help you understand your rights.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 2. Information We Collect                             */
  /* ----------------------------------------------------- */
  {
    id: "information",
    title: "Information We Collect",
    icon: Database,
    audiences: [],
    intro:
      "The information we collect depends on how you use the Platform and your role within it. We collect only what is necessary to deliver, secure, and improve your learning experience.",
    searchTerms: [
      "data we collect",
      "personal data",
      "what we collect",
      "account",
    ],
    blocks: [
      {
        type: "paragraph",
        text: "Information you provide directly. When you create an account or interact with the Platform, you give us information such as your name, email address, phone number, profile photo, and account preferences. We also keep records of the messages you send us through support.",
      },
      {
        type: "subsection",
        heading: "If you are a student",
        audience: "students",
        text: "To deliver your courses we collect your enrollment details, guardian or parent contact information (when required for younger learners), course progress, quiz and assessment results, submitted assignments, certificates earned, and live-class attendance. If you take a proctored assessment, we may temporarily process camera, microphone, and screen information to protect academic integrity \u2014 you will always be told before a session is monitored.",
      },
      {
        type: "subsection",
        heading: "If you are an instructor",
        audience: "instructors",
        text: "To help you teach, we collect your professional details such as your qualifications, teaching experience, biography, and the course content you upload. When you earn payouts through the Platform, we also collect the payment details needed to pay you.",
      },
      {
        type: "subsection",
        heading: "If you are an organization",
        audience: "organizations",
        text: "To operate your programs, we collect your organization\u2019s name, registration and business details, administrator contact information, billing information, and the learner rosters you upload. We process this information to run your courses and to manage your subscription and payments.",
      },
      {
        type: "subsection",
        heading: "Information collected automatically",
        text: "When you use the Platform, we automatically collect technical information such as your device type, browser, operating system, IP address, pages you visit, and how you interact with features. This helps us keep the Platform secure and understand how to improve it.",
      },
      {
        type: "subsection",
        heading: "Payment information",
        text: "When you pay for a course or service, your card details and bank information are collected and processed directly by our trusted payment providers (such as Paystack). We do not store your full card number or CVV on our servers.",
      },
      {
        type: "subsection",
        heading: "Live classes and communications",
        text: "When you join a live class or group call, we may process audio and video through our video provider (such as LiveKit) to connect you with your instructor and classmates. We may also collect the content you share in course discussions and chat.",
      },
      {
        type: "table",
        heading: "A quick summary of what we collect",
        columns: ["Information", "Who provides it", "Why we collect it"],
        rows: [
          [
            "Name, email, phone number",
            "All users",
            "To create and manage your account",
          ],
          [
            "Course progress, quizzes, assignments",
            "Students",
            "To deliver courses and track learning",
          ],
          [
            "Qualifications and course content",
            "Instructors",
            "To publish and teach courses",
          ],
          [
            "Organization and billing details",
            "Organizations",
            "To operate programs and billing",
          ],
          [
            "Device, browser, and usage data",
            "All users",
            "To secure and improve the Platform",
          ],
          [
            "Payment details",
            "All users",
            "Processed securely by Paystack for transactions",
          ],
          [
            "Proctored session recordings",
            "Students",
            "To protect academic integrity (with notice)",
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 3. How We Use Your Information                        */
  /* ----------------------------------------------------- */
  {
    id: "how-we-use",
    title: "How We Use Your Information",
    icon: ListChecks,
    audiences: [],
    intro:
      "We use your information to make the Platform work for you, to keep it safe, and to improve it over time. We never use your data in ways that are not explained here or permitted by law.",
    searchTerms: ["purposes", "why we use", "marketing", "processing"],
    blocks: [
      {
        type: "list",
        items: [
          "To provide and operate the Platform \u2014 including your account, courses, dashboards, and live classes.",
          "To deliver courses and track your learning progress, grades, and certificates.",
          "To process payments, refunds, and instructor payouts.",
          "To communicate with you \u2014 notifications, announcements, and important updates about your courses.",
          "To personalize your experience and recommend relevant courses and content.",
          "To protect the integrity of assessments and prevent fraud or misuse of the Platform.",
          "To keep the Platform secure, investigate issues, and respond to support requests.",
          "To understand how the Platform is used and to improve features and performance.",
          "To comply with legal, tax, and regulatory obligations.",
        ],
      },
      {
        type: "note",
        noteType: "success",
        text: "We only send marketing messages if you have asked to receive them, and you can opt out at any time without affecting your access to courses.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 4. Legal Basis for Processing                         */
  /* ----------------------------------------------------- */
  {
    id: "legal-basis",
    title: "Legal Basis for Processing",
    icon: Scale,
    audiences: [],
    intro:
      "Where data protection laws (such as the GDPR or Nigeria Data Protection Act) apply, we process personal information only when we have a valid legal reason to do so.",
    searchTerms: ["legal grounds", "gdpr", "ndpa", "contract", "consent"],
    blocks: [
      {
        type: "table",
        heading: "The legal grounds we rely on",
        columns: ["Legal basis", "What it covers", "Example"],
        rows: [
          [
            "Contract",
            "To perform the services you requested",
            "Creating your account and enrolling you in a course",
          ],
          [
            "Consent",
            "Where you have freely agreed",
            "Marketing emails and optional proctoring",
          ],
          [
            "Legitimate interest",
            "Where our interests don\u2019t override your rights",
            "Security, fraud prevention, and product improvements",
          ],
          [
            "Legal obligation",
            "To comply with the law",
            "Keeping financial records required by regulators",
          ],
        ],
      },
      {
        type: "paragraph",
        text: "Where we rely on your consent, you may withdraw it at any time through your account settings or by contacting us, and we will stop that processing without affecting the lawfulness of anything done before you withdrew consent.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 5. How We Share Your Information                      */
  /* ----------------------------------------------------- */
  {
    id: "sharing",
    title: "How We Share Your Information",
    icon: Share2,
    audiences: [],
    intro:
      "We do not sell your personal information. We share it only in the limited circumstances described below, and only with trusted parties who agree to protect it.",
    searchTerms: ["disclose", "third parties", "share data", "providers"],
    blocks: [
      {
        type: "list",
        items: [
          "Service providers \u2014 trusted companies that help us run the Platform, such as payment processors (Paystack), video and live-class infrastructure (LiveKit), hosting, and analytics providers.",
          "Organizations that sponsor your course \u2014 if you enroll through a school or academy, that organization may see your progress and assessment results to support your learning.",
          "With your consent \u2014 we share information when you have clearly asked us to.",
          "Legal and safety requirements \u2014 we may disclose information to comply with a legal obligation, protect the rights and safety of our users, or respond to valid legal requests.",
          "Business transfers \u2014 if we merge with, are acquired by, or sell parts of the business, your information may be transferred to the new owner, who must honor this policy.",
        ],
      },
      {
        type: "note",
        noteType: "warning",
        text: "We may share aggregated or anonymized statistics (for example, \u201c12,000 learners completed a course this year\u201d) that cannot be used to identify any individual.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 6. Cookies & Similar Technologies                     */
  /* ----------------------------------------------------- */
  {
    id: "cookies",
    title: "Cookies & Similar Technologies",
    icon: Cookie,
    audiences: [],
    intro:
      "Cookies are small files stored on your device that help the Platform remember you and understand how it is used.",
    searchTerms: [
      "tracking",
      "browser storage",
      "local storage",
      "preferences",
    ],
    blocks: [
      {
        type: "list",
        heading: "Types of cookies we use",
        items: [
          "Essential cookies \u2014 required for the Platform to work, such as keeping you signed in.",
          "Preference cookies \u2014 remember your theme (dark or light), language, and settings.",
          "Analytics cookies \u2014 help us understand how users navigate the Platform so we can improve it.",
        ],
      },
      {
        type: "paragraph",
        text: "You can control or delete cookies through your browser settings. Please note that disabling essential cookies may prevent certain parts of the Platform from working as intended.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 7. Data Retention                                     */
  /* ----------------------------------------------------- */
  {
    id: "retention",
    title: "Data Retention & Deletion",
    icon: Clock,
    audiences: [],
    intro:
      "We keep your information only for as long as it is needed for the purposes described in this policy, or as required by law.",
    searchTerms: ["how long", "delete account", "store data", "records"],
    blocks: [
      {
        type: "table",
        heading: "How long we keep information",
        columns: ["Information", "Retention period", "Reason"],
        rows: [
          [
            "Account and profile details",
            "While your account is active, then a short grace period",
            "To keep your account usable and recoverable",
          ],
          [
            "Course progress and records",
            "While your account is active; longer if required by your organization",
            "To preserve academic records and certificates",
          ],
          [
            "Payment and billing records",
            "As long as required by law (e.g., for tax and audit)",
            "To meet legal and financial obligations",
          ],
          [
            "Live-class and proctoring recordings",
            "For a limited period needed for integrity and support",
            "To resolve disputes and protect academic integrity",
          ],
          [
            "Support and communication logs",
            "A reasonable period to improve service",
            "To respond to questions and improve support",
          ],
        ],
      },
      {
        type: "paragraph",
        text: "You can request deletion of your account and information at any time. When you do, we will remove or anonymize your personal information, except where we are required by law to keep certain records (such as financial records).",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 8. Your Privacy Rights                                */
  /* ----------------------------------------------------- */
  {
    id: "rights",
    title: "Your Privacy Rights & Choices",
    icon: UserCheck,
    audiences: [],
    intro:
      "You are in control of your information. Depending on where you live, you may have the following rights, and we will honor them for all users.",
    searchTerms: [
      "access",
      "correction",
      "delete data",
      "portability",
      "object",
      "rights",
    ],
    blocks: [
      {
        type: "list",
        items: [
          "Access \u2014 request a copy of the personal information we hold about you.",
          "Correction \u2014 ask us to fix inaccurate or incomplete information.",
          "Deletion \u2014 ask us to delete your personal information.",
          "Restriction \u2014 ask us to limit how we process your information in certain cases.",
          "Portability \u2014 receive your information in a structured, machine-readable format.",
          "Objection \u2014 object to processing based on legitimate interests or marketing.",
          "Withdraw consent \u2014 remove consent you previously gave for optional processing.",
          "Opt-out of marketing \u2014 unsubscribe from promotional messages at any time.",
          "Complain \u2014 lodge a complaint with your local data protection authority.",
        ],
      },
      {
        type: "subsection",
        heading: "If an organization manages your learning",
        audience: "organizations",
        text: "When a school or academy sponsors your course, that organization may act as the controller of your learner data. In that case, you may contact your organization directly to exercise your rights, and we will support the organization in responding to your request. Organizations may also request access to or correction of learner data on your behalf, subject to their own policies and applicable law.",
      },
      {
        type: "paragraph",
        text: "To exercise any of these rights, email support@backpack.africa with the subject line \u201cPrivacy Request\u201d, or use the account settings where available. We will respond within the time required by law, and we may need to verify your identity before processing your request.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 9. Children's Privacy                                 */
  /* ----------------------------------------------------- */
  {
    id: "children",
    title: "Children\u2019s Privacy",
    icon: Baby,
    audiences: ["students", "instructors"],
    intro:
      "We are deeply committed to protecting the privacy of young learners who use the Platform.",
    searchTerms: [
      "kids",
      "minors",
      "coppa",
      "parental consent",
      "under 13",
      "guardian",
    ],
    blocks: [
      {
        type: "paragraph",
        text: "The Platform is designed for learners of all ages within the programs of schools and academies. We do not knowingly collect personal information from children under the applicable minimum age (typically 13, or older where required by local law) without verifiable parental or guardian consent.",
      },
      {
        type: "paragraph",
        text: "Where a child under the minimum age is enrolled, we collect only the information needed to deliver the learning program. Parents and guardians have the right to review their child\u2019s information, ask us to correct it, or request its deletion at any time by contacting us at support@backpack.africa.",
      },
      {
        type: "note",
        noteType: "info",
        text: "If you believe we have collected information from a child without appropriate consent, please contact us immediately and we will delete it promptly.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 10. Instructor Guidance                               */
  /* ----------------------------------------------------- */
  {
    id: "instructor-data",
    title: "Instructor Guidance on Student Data",
    icon: GraduationCap,
    audiences: ["instructors"],
    intro:
      "As an instructor, you may have access to information about the students you teach. With that access comes responsibility.",
    searchTerms: [
      "teacher",
      "student data",
      "privacy for instructors",
      "best practices",
    ],
    blocks: [
      {
        type: "list",
        heading: "What we ask of instructors",
        items: [
          "Collect only the student information you genuinely need to teach and assess.",
          "Inform students and guardians about what you collect and why.",
          "Keep student grades, submissions, and personal details confidential.",
          "Do not share or export student personal data for unrelated purposes.",
          "Follow your organization\u2019s data protection and safeguarding policies.",
          "Use proctoring and monitoring features only where permitted and clearly announced.",
        ],
      },
      {
        type: "paragraph",
        text: "If you accidentally expose student data or suspect a breach, please notify us right away so we can help contain and resolve the issue.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 11. Organization Responsibilities                     */
  /* ----------------------------------------------------- */
  {
    id: "org-responsibilities",
    title: "Organization Responsibilities",
    icon: Building2,
    audiences: ["organizations"],
    intro:
      "When your organization sponsors courses and manages learners through Backpack, you may act as the controller of learner data. We are here to support you.",
    searchTerms: [
      "school",
      "academy",
      "controller",
      "learner data",
      "institution",
    ],
    blocks: [
      {
        type: "list",
        heading: "Your responsibilities include",
        items: [
          "Having a lawful basis for collecting and using learner data.",
          "Providing learners and guardians with a clear privacy notice.",
          "Responding to learner data requests (access, correction, deletion).",
          "Keeping learner rosters and records accurate and up to date.",
          "Ensuring any third-party tools you connect comply with privacy laws.",
          "Notifying us promptly of any data incidents involving learner information.",
        ],
      },
      {
        type: "note",
        noteType: "warning",
        text: "We process learner data on your behalf and act as a data processor for the information you upload. Where our terms give you controller responsibilities, we will support you in meeting them.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 12. Security                                          */
  /* ----------------------------------------------------- */
  {
    id: "security",
    title: "How We Protect Your Information",
    icon: Lock,
    audiences: [],
    intro:
      "We take the security of your information seriously and use appropriate technical and organizational measures to protect it.",
    searchTerms: [
      "encryption",
      "safe",
      "protection",
      "breach",
      "access control",
    ],
    blocks: [
      {
        type: "list",
        items: [
          "Encryption of data in transit and at rest.",
          "Secure, role-based access controls so only authorized people reach your data.",
          "Continuous monitoring for suspicious activity and threats.",
          "Regular security reviews and updates of our systems and dependencies.",
          "Careful vetting of any third-party provider that touches your data.",
        ],
      },
      {
        type: "paragraph",
        text: "No method of transmission or storage is 100% secure. If you become aware of a security issue or vulnerability, please report it to support@backpack.africa so we can investigate quickly.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 13. Third-Party Links & Services                      */
  /* ----------------------------------------------------- */
  {
    id: "third-party",
    title: "Third-Party Links & Services",
    icon: ExternalLink,
    audiences: [],
    intro:
      "The Platform may include links to external websites or use services provided by trusted partners.",
    searchTerms: ["external links", "paystack", "livekit", "embedded content"],
    blocks: [
      {
        type: "paragraph",
        text: "We use reputable providers to handle certain parts of the experience, including payment processing (Paystack) and live video (LiveKit). These providers have their own privacy practices, which you can review on their websites.",
      },
      {
        type: "paragraph",
        text: "When you click a link that takes you away from the Platform, the privacy policy of that website will apply. We are not responsible for the content or privacy practices of external sites, so we encourage you to review their policies.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 14. International Data Transfers                      */
  /* ----------------------------------------------------- */
  {
    id: "transfers",
    title: "International Data Transfers",
    icon: Globe,
    audiences: [],
    intro:
      "Backpack serves learners and educators across Africa and beyond, so your information may be processed in countries other than your own.",
    searchTerms: [
      "cross border",
      "cloud",
      "location",
      "regions",
      "outside your country",
    ],
    blocks: [
      {
        type: "paragraph",
        text: "To deliver a reliable experience, your information may be stored on secure cloud infrastructure that could be located in a different country from where you live. Whenever we transfer personal data across borders, we apply appropriate safeguards (such as standard contractual clauses) to ensure it remains protected to the same standard described in this policy.",
      },
      {
        type: "note",
        noteType: "info",
        text: "We support learning across many regions and currencies, and we remain committed to keeping your data protected wherever it is processed.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 15. Changes to This Policy                            */
  /* ----------------------------------------------------- */
  {
    id: "changes",
    title: "Changes to This Policy",
    icon: RefreshCw,
    audiences: [],
    intro:
      "The Platform will evolve, and this policy will be updated to match. When it changes, we will make sure you know.",
    searchTerms: ["update", "revision", "notice", "effective date"],
    blocks: [
      {
        type: "paragraph",
        text: "We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the Platform (such as an in-app notice or email) and update the \u201cLast updated\u201d date at the top of this page.",
      },
      {
        type: "paragraph",
        text: "We encourage you to review this page periodically. Your continued use of the Platform after changes take effect means you accept the updated policy.",
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 16. Contact Us                                        */
  /* ----------------------------------------------------- */
  {
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    audiences: [],
    intro:
      "We are here for you. If you have any questions about this policy, your data, or your privacy rights, please reach out.",
    searchTerms: [
      "reach us",
      "support",
      "email",
      "dpo",
      "privacy request",
      "address",
    ],
    blocks: [
      {
        type: "paragraph",
        text: "Our team is happy to answer your questions. For privacy-related matters, please use the subject line \u201cPrivacy\u201d so we can route your request to the right team quickly.",
      },
      {
        type: "list",
        heading: "How to reach us",
        items: [
          "Email: support@backpack.africa",
          "Privacy requests: support@backpack.africa (subject: \u201cPrivacy Request\u201d)",
          "Security reports: support@backpack.africa (subject: \u201cSecurity\u201d)",
          "Response time: we aim to respond within 7 business days",
        ],
      },
    ],
  },

  /* ----------------------------------------------------- */
  /* 17. Glossary                                          */
  /* ----------------------------------------------------- */
  {
    id: "glossary",
    title: "Glossary",
    icon: BookOpen,
    audiences: [],
    intro:
      "A few terms, explained in plain language, so the policy is easy to understand.",
    searchTerms: ["terms", "definitions", "meaning"],
    blocks: [
      {
        type: "table",
        heading: "Terms we use",
        columns: ["Term", "What it means"],
        rows: [
          [
            "Personal information",
            "Information that identifies you, such as your name, email, or phone number",
          ],
          [
            "Controller",
            "The party that decides why and how personal information is processed",
          ],
          [
            "Processor",
            "The party that processes personal information on behalf of a controller",
          ],
          [
            "Service provider",
            "A trusted company we use to help deliver the Platform",
          ],
          [
            "Cookies",
            "Small files stored on your device that help the Platform remember you",
          ],
          [
            "Proctoring",
            "Monitoring an assessment to protect academic integrity",
          ],
          [
            "Aggregated data",
            "Combined statistics that cannot identify any individual",
          ],
        ],
      },
    ],
  },
];

/* ============================================================= */
/* Helpers                                                        */
/* ============================================================= */

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sectionSearchText = (s: PolicySection, index: number) => {
  const parts: string[] = [
    String(index + 1).padStart(2, "0"), // match by section number (01, 02, ...)
    s.title,
    s.intro ?? "",
    ...(s.searchTerms ?? []),
  ];
  s.blocks.forEach((b) => {
    if (b.heading) parts.push(b.heading);
    if (b.text) parts.push(b.text);
    b.items?.forEach((i) => parts.push(i));
    b.rows?.forEach((r) => r.forEach((c) => parts.push(c)));
  });
  return parts.join(" ");
};

const Highlight = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  // escapeRegExp guarantees a valid pattern, so the split below cannot throw.
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark
            key={i}
            className="bg-indigo-200 dark:bg-indigo-500/40 text-slate-900 dark:text-white rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};

/* ============================================================= */
/* Block renderer                                                 */
/* ============================================================= */

const BlockView = ({
  block,
  query,
  audience,
}: {
  block: Block;
  query: string;
  audience: Audience | "all";
}) => {
  if (block.audience && audience !== "all" && block.audience !== audience)
    return null;

  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <Highlight text={block.text ?? ""} query={query} />
        </p>
      );

    case "list":
      return (
        <div>
          {block.heading && (
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              <Highlight text={block.heading} query={query} />
            </h4>
          )}
          <ul className="space-y-3">
            {block.items?.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  <Highlight text={item} query={query} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "subsection":
      return (
        <div>
          {block.heading && (
            <h4 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              <Highlight text={block.heading} query={query} />
            </h4>
          )}
          {block.text && (
            <p className="mt-2 text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <Highlight text={block.text} query={query} />
            </p>
          )}
        </div>
      );

    case "note": {
      const styles: Record<string, string> = {
        info: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300",
        warning:
          "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300",
        success:
          "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
      };
      const icons: Record<
        string,
        React.ComponentType<{ className?: string }>
      > = {
        info: Info,
        warning: AlertCircle,
        success: CheckCircle,
      };
      const Icon = icons[block.noteType ?? "info"];
      return (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${styles[block.noteType ?? "info"]}`}
        >
          <Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <Highlight text={block.text ?? ""} query={query} />
          </p>
        </div>
      );
    }

    case "table":
      return (
        <div>
          {block.heading && (
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              <Highlight text={block.heading} query={query} />
            </h4>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <table className="w-full min-w-130 text-left text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80">
                  {block.columns?.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <Highlight text={col} query={query} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows?.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 text-slate-600 dark:text-slate-400 align-top ${
                          ci === 0
                            ? "font-semibold text-slate-800 dark:text-slate-200"
                            : ""
                        }`}
                      >
                        <Highlight text={cell} query={query} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
};

/* ============================================================= */
/* Main Component                                                 */
/* ============================================================= */

const Policy: React.FC = () => {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience | "all">("all");
  const [activeId, setActiveId] = useState<string>(sections[0].id);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    return sections.filter((s, i) => {
      const audienceOk =
        audience === "all" ||
        s.audiences.length === 0 ||
        s.audiences.includes(audience);
      if (!audienceOk) return false;
      if (!normalizedQuery) return true;
      // Search by section number ("01", "02", ...): "1" matches "01", "17" matches "17".
      const isNumeric = /^\d{1,2}$/.test(normalizedQuery);
      if (isNumeric) {
        return (
          String(i + 1).padStart(2, "0") === normalizedQuery.padStart(2, "0")
        );
      }
      // Otherwise match against the title, keywords, and section content.
      return sectionSearchText(s, i).toLowerCase().includes(normalizedQuery);
    });
  }, [normalizedQuery, audience]);

  const activeSection = visibleSections.some((s) => s.id === activeId)
    ? activeId
    : (visibleSections[0]?.id ?? null);

  /* Scroll-spy: track the section currently in view */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileTocOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && visibleSections[0]) {
      scrollToSection(visibleSections[0].id);
    }
  };

  const isFiltering = normalizedQuery !== "" || audience !== "all";

  return (
    <div className="pb-16">
      {/* ========================================== */}
      {/* HERO */}
      {/* ========================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-6 py-12 sm:px-10 sm:py-16">
        {/* Decorative glow */}
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-indigo-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-400 font-medium">Privacy Policy</span>
          </nav>

          {/* Badge */}
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Privacy &amp; Data Protection
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Your privacy matters.{" "}
            <span className="text-indigo-400">Here’s how we protect it.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
            Backpack is an education technology platform built for students,
            instructors, and organizations. This policy explains what
            information we collect, why we collect it, and the control you
            always have over your data.
          </p>

          {/* Meta chips */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Last updated: September 1, 2026
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Effective immediately
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Applies across all regions
            </span>
          </div>

          {/* Audience cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            {[
              {
                icon: GraduationCap,
                label: "For Students",
                desc: "Your learning data, your rights",
              },
              {
                icon: Presentation,
                label: "For Instructors",
                desc: "Teaching data handled responsibly",
              },
              {
                icon: Building2,
                label: "For Organizations",
                desc: "Learner data managed with care",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-300">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* STICKY SEARCH + AUDIENCE FILTER */}
      {/* ========================================== */}
      <div className="sticky top-16 z-30 mt-6 -mx-2 px-2 py-2 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by number (01, 02…) or keyword \u2014 e.g. \u201cprivacy rights\u201d, \u201cproctoring\u201d, \u201cpayments\u201d\u2026"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/70 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
            />
            {normalizedQuery && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Audience pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Users className="w-3.5 h-3.5" /> View for:
            </span>
            {AUDIENCES.map((a) => {
              const active = audience === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                  }`}
                >
                  <a.icon className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result count */}
        {isFiltering && (
          <div className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            {visibleSections.length === 0
              ? "No sections match your search. Try a different keyword."
              : `Showing ${visibleSections.length} of ${sections.length} sections${
                  normalizedQuery ? ` matching \u201c${query}\u201d` : ""
                }.`}
            {normalizedQuery && visibleSections.length > 0 && (
              <button
                onClick={() => scrollToSection(visibleSections[0].id)}
                className="ml-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Jump to first result
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MAIN GRID: TOC + CONTENT                  */}
      {/* ========================================== */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* ---- Table of contents (desktop) ---- */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 max-h-[calc(100vh-9.5rem)] overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              <List className="w-4 h-4" />
              On this page
            </div>
            <nav className="space-y-1">
              {sections.map((s, i) => {
                const visible = visibleSections.some((v) => v.id === s.id);
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-start gap-2.5 text-left rounded-lg px-3 py-2 text-[13px] transition-all ${
                      visible ? "" : "opacity-30"
                    } ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
                    }`}
                  >
                    <span
                      className={`shrink-0 mt-0.5 text-[11px] font-mono font-semibold ${
                        active
                          ? "text-indigo-500 dark:text-indigo-400"
                          : "text-slate-400"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ---- Content ---- */}
        <div>
          {/* Mobile TOC toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileTocOpen((o) => !o)}
              className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              <span className="inline-flex items-center gap-2">
                <List className="w-4 h-4 text-indigo-500" />
                On this page
              </span>
              {mobileTocOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
            {mobileTocOpen && (
              <nav className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/60 p-3 space-y-1">
                {sections.map((s, i) => {
                  const visible = visibleSections.some((v) => v.id === s.id);
                  const active = activeSection === s.id;
                  if (!visible) return null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-[11px] font-mono text-slate-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Section cards */}
          {visibleSections.length === 0 ? (
            <div className="text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 py-16 px-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                No matching sections
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                We couldn’t find anything matching your search. Try a different
                keyword or clear the filters.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setAudience("all");
                }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map((s, i) => {
                const visible = visibleSections.some((v) => v.id === s.id);
                return (
                  <section
                    key={s.id}
                    id={s.id}
                    className={`scroll-mt-36 rounded-3xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 sm:p-8 transition-opacity ${
                      visible ? "" : "hidden"
                    }`}
                  >
                    {/* Section header */}
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <s.icon className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                          Section {String(i + 1).padStart(2, "0")}
                          {s.audiences.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold normal-case">
                              <Users className="w-3 h-3" />
                              {s.audiences
                                .map(
                                  (a) => a.charAt(0).toUpperCase() + a.slice(1),
                                )
                                .join(" & ")}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          <Highlight text={s.title} query={query} />
                        </h2>
                        {s.intro && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            <Highlight text={s.intro} query={query} />
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Section body */}
                    <div className="mt-6 space-y-5">
                      {s.blocks.map((b, bi) => (
                        <BlockView
                          key={bi}
                          block={b}
                          query={query}
                          audience={audience}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* ---- Contact CTA ---- */}
          <div className="mt-10 rounded-3xl bg-indigo-600 overflow-hidden relative p-8 sm:p-10 text-white">
            <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-100 text-xs font-bold uppercase tracking-wider">
                  <MailCheck className="w-4 h-4" />
                  Questions?
                </span>
                <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold">
                  We’re here to help protect your data.
                </h3>
                <p className="mt-3 text-sm text-indigo-100 leading-relaxed max-w-xl">
                  Whether you’re a student, instructor, or organization, our
                  team is ready to answer your privacy questions and help you
                  exercise your rights.
                </p>
              </div>
              <a
                href="mailto:support@backpack.africa?subject=Privacy"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition"
              >
                <Mail className="w-4 h-4" />
                support@backpack.africa
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Bottom trust line */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Backpack. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <Link to="/" className="hover:text-indigo-500 transition-colors">
                Home
              </Link>
              <Link
                to="/about-us"
                className="hover:text-indigo-500 transition-colors"
              >
                About Us
              </Link>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Your data is protected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policy;
