import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  CheckSquare,
  Square,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Landmark,
  SlidersHorizontal,
  MinusCircle,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import {
  PayrollDisbursement,
  PayrollPayslip,
  PayrollSalaryBreakdown,
  PayrollSalaryLineItem,
  PayrollSplitGroup,
  PayrollSplitMember,
} from "../../types";
import {
  checkPayrollRunStatus,
  createPayrollSplitGroup,
  DynamicPayrollSplitPayload,
  initializePayrollTransaction,
  issuePayrollPayslips,
  verifyTransaction,
} from "../../lib/paystackGateway";
import {
  generateReferenceNumber,
  triggerPayrollPaystackCheckout,
} from "../../lib/paystack";
import { generateId } from "../../lib/id";
import { CheckoutDisclosure } from "../components/CheckoutDisclosure";
import { formatPriceWithDecimals } from "../../lib/price";

interface UnifiedPayrollInstructor {
  id: string;
  name: string;
  email: string;
  courseTitles: string[];
  subaccountCode?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  currency: string;
}

interface PayrollCheckoutDraft {
  reference: string;
  paymentType: "individual" | "split_group" | "batch_split";
  title: string;
  currency: string;
  netSalariesTotal: number;
  platformFee: number;
  grandTotal: number;
  subaccountCode?: string;
  splitCode?: string;
  splitGroupId?: string;
  splitGroupName?: string;
  recipients: PayrollDisbursement["recipients"];
  clearSelectionOnSuccess?: boolean;
}

const SUPPORTED_PAYROLL_CURRENCIES = ["NGN", "GHS", "KES", "ZAR", "USD"];

const DEFAULT_FEE_PER_STAFF: Record<string, number> = {
  NGN: 500,
  GHS: 25,
  KES: 250,
  ZAR: 50,
  USD: 2,
};

const ALLOWANCE_PRESETS = [
  "Housing Allowance",
  "Transport Allowance",
  "Teaching Bonus",
  "Exam Supervision",
];

const DEDUCTION_PRESETS = [
  "Income Tax (PAYE)",
  "Pension Contribution",
  "Health Insurance",
  "Loan Repayment",
];

function computeBreakdownTotals(
  basicSalary: number,
  allowances: PayrollSalaryLineItem[],
  deductions: PayrollSalaryLineItem[],
): PayrollSalaryBreakdown {
  const cleanBasic = Math.max(0, Math.round(basicSalary * 100) / 100);
  const cleanAllowances = allowances
    .filter((a) => a.label.trim() && Number(a.amount) > 0)
    .map((a) => ({
      ...a,
      label: a.label.trim(),
      amount: Math.round(Number(a.amount) * 100) / 100,
    }));
  const cleanDeductions = deductions
    .filter((d) => d.label.trim() && Number(d.amount) > 0)
    .map((d) => ({
      ...d,
      label: d.label.trim(),
      amount: Math.round(Number(d.amount) * 100) / 100,
    }));

  const totalAllowances =
    Math.round(cleanAllowances.reduce((s, a) => s + a.amount, 0) * 100) / 100;
  const grossSalary = Math.round((cleanBasic + totalAllowances) * 100) / 100;
  const totalDeductions =
    Math.round(cleanDeductions.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  const netSalary = Math.max(
    0,
    Math.round((grossSalary - totalDeductions) * 100) / 100,
  );

  return {
    basicSalary: cleanBasic,
    allowances: cleanAllowances,
    deductions: cleanDeductions,
    grossSalary,
    totalAllowances,
    totalDeductions,
    netSalary,
  };
}

/**
 * Inspects selected payroll instructors, groups them by payout subaccount, and calculates
 * each instructor's exact minor-unit salary share for dynamic split initialization.
 * Payroll transactions always use bearer_type "all-proportional" so main platform accounts are untouched.
 */
function buildPayrollDynamicSplit(
  selectedItems: Array<{ subaccountCode: string; amount: number }>,
  feePerStaffAmount: number,
): {
  instructorSplits: Array<{ subaccount: string; share: number }>;
  dynamicSplit: DynamicPayrollSplitPayload;
  netTotal: number;
  platformFee: number;
  grandTotal: number;
} {
  const subaccountTotals = new Map<string, number>();
  for (const item of selectedItems) {
    const subCode = item.subaccountCode.trim();
    const shareKobo = Math.round(Math.max(0, Number(item.amount || 0)) * 100);
    if (!subCode || shareKobo <= 0) continue;
    subaccountTotals.set(subCode, (subaccountTotals.get(subCode) || 0) + shareKobo);
  }

  const instructorSplits = Array.from(subaccountTotals.entries()).map(
    ([subaccount, share]) => ({
      subaccount,
      share,
    }),
  );

  const netTotalKobo = instructorSplits.reduce((s, v) => s + v.share, 0);
  const netTotal = netTotalKobo / 100;
  const platformFee =
    Math.round(Math.max(0, feePerStaffAmount) * selectedItems.length * 100) / 100;
  const grandTotal = Math.round((netTotal + platformFee) * 100) / 100;

  return {
    instructorSplits,
    dynamicSplit: {
      type: "flat",
      bearer_type: "all-proportional",
      subaccounts: instructorSplits,
    },
    netTotal,
    platformFee,
    grandTotal,
  };
}

export const PayrollPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    organizations,
    courses,
    orgMembers,
    allUsers,
    payrollSplitGroups,
    payrollDisbursements,
    payrollPayslips,
    savePayrollSplitGroup,
    deletePayrollSplitGroup,
    recordPayrollDisbursement,
  } = useAppContext();

  const isAuthorized =
    currentUser?.role === "organization" ||
    currentUser?.role === "org_admin" ||
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

  const isInstructorOnly = currentUser?.role === "instructor" && !isAuthorized;

  const myOrg = useMemo(() => {
    if (!currentUser) return null;
    return (
      organizations.find(
        (o) =>
          o.id === currentUser.id ||
          o.ownerId === currentUser.id ||
          o.id === `org_${currentUser.id}` ||
          (currentUser.orgId &&
            (o.id === currentUser.orgId || o.ownerId === currentUser.orgId)),
      ) || null
    );
  }, [organizations, currentUser]);

  const orgId =
    myOrg?.id || myOrg?.ownerId || currentUser?.orgId || currentUser?.id || "";

  // 3 Clear Workspace Tabs: Run Payroll | Saved Pay Groups | History & Payslips
  const [activeTab, setActiveTab] = useState<"run" | "templates" | "records">(
    "run",
  );
  const [recordsView, setRecordsView] = useState<"payments" | "payslips">(
    "payments",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [payslipSearch, setPayslipSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "individual" | "group"
  >("all");
  const [currency, setCurrency] = useState<string>(() => {
    const base = myOrg?.baseCurrency?.toUpperCase() || "NGN";
    return SUPPORTED_PAYROLL_CURRENCIES.includes(base) ? base : "NGN";
  });
  const [paymentChannel, setPaymentChannel] = useState<
    "checkout" | "bank_transfer"
  >("checkout");
  const [customFeePerStaff, setCustomFeePerStaff] = useState<string | null>(
    null,
  );
  const feePerStaff = useMemo(() => {
    if (customFeePerStaff !== null) {
      const parsed = Number(customFeePerStaff);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return DEFAULT_FEE_PER_STAFF[currency] ?? 500;
  }, [customFeePerStaff, currency]);

  const [payerEmailOverride, setPayerEmailOverride] = useState<string | null>(
    null,
  );
  const payerEmail = payerEmailOverride ?? currentUser?.email ?? "";
  const [payPeriod, setPayPeriod] = useState<string>(() =>
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  );
  const [paymentNote, setPaymentNote] = useState<string>("");

  // Per-instructor salary inputs, detailed breakdowns, role titles, and payroll batch selection
  const [salaryInputs, setSalaryInputs] = useState<Record<string, string>>({});
  const [salaryBreakdowns, setSalaryBreakdowns] = useState<
    Record<string, PayrollSalaryBreakdown>
  >({});
  const [roleTitles, setRoleTitles] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveBatchAsGroup, setSaveBatchAsGroup] = useState<boolean>(false);
  const [batchGroupName, setBatchGroupName] = useState<string>("");

  // Salary & Payslip Breakdown Modal State
  const [breakdownModalInst, setBreakdownModalInst] =
    useState<UnifiedPayrollInstructor | null>(null);
  const [draftRoleTitle, setDraftRoleTitle] = useState("Instructor");
  const [draftBasicSalary, setDraftBasicSalary] = useState("");
  const [draftAllowances, setDraftAllowances] = useState<
    PayrollSalaryLineItem[]
  >([]);
  const [draftDeductions, setDraftDeductions] = useState<
    PayrollSalaryLineItem[]
  >([]);
  const [breakdownError, setBreakdownError] = useState("");

  // Feedback alerts
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  // Corporate Bank Transfer & Digital Payslip Modals
  const [transferModalDisbursement, setTransferModalDisbursement] =
    useState<PayrollDisbursement | null>(null);
  const [verifyingTransfer, setVerifyingTransfer] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewPayslip, setPreviewPayslip] = useState<PayrollPayslip | null>(
    null,
  );

  // Create Saved Pay Group Modal
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"flat" | "percentage">(
    "flat",
  );
  const [groupMemberShares, setGroupMemberShares] = useState<
    Record<string, { included: boolean; value: string }>
  >({});
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupFormError, setGroupFormError] = useState("");

  // Percentage Pay Group Pool Modal
  const [payingGroupModal, setPayingGroupModal] =
    useState<PayrollSplitGroup | null>(null);
  const [groupTotalPayInput, setGroupTotalPayInput] = useState("");

  // Confirm Delete Saved Group Modal
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{
    id: string;
    label: string;
  } | null>(null);

  // Tuition-style Payroll Checkout Review Modal (processed via Paystack Public Key)
  const [payrollCheckoutDraft, setPayrollCheckoutDraft] =
    useState<PayrollCheckoutDraft | null>(null);
  const [isPayrollDisclosureAcknowledged, setIsPayrollDisclosureAcknowledged] =
    useState(false);
  const [isCheckoutPopupActive, setIsCheckoutPopupActive] = useState(false);

  // Build unified list of organization instructors using ONLY their own self-created payout accounts
  const unifiedInstructors = useMemo<UnifiedPayrollInstructor[]>(() => {
    if (!currentUser) return [];

    const orgIdVariants = new Set(
      [
        orgId,
        myOrg?.id,
        myOrg?.ownerId,
        currentUser.orgId,
        currentUser.role === "organization" ? currentUser.id : undefined,
      ].filter(Boolean) as string[],
    );

    const orgCourses = courses.filter(
      (c) =>
        orgIdVariants.has(c.orgId) ||
        (currentUser.role === "organization" &&
          c.createdBy === currentUser.id),
    );

    const map = new Map<string, UnifiedPayrollInstructor>();

    const findUserMatch = (id?: string, email?: string, name?: string) =>
      allUsers.find(
        (u) =>
          u.role !== "super_admin" &&
          u.email?.toLowerCase() !== "ekenehq@gmail.com" &&
          ((id && u.id === id) ||
            (email && u.email?.toLowerCase() === email.toLowerCase()) ||
            (name &&
              u.name?.toLowerCase().trim() === name.toLowerCase().trim())),
      );

    const upsertInstructor = (params: {
      id: string;
      name: string;
      email?: string;
      courseTitle?: string;
    }) => {
      const normEmail = (params.email || "").trim().toLowerCase();
      if (normEmail === "ekenehq@gmail.com") return;
      const userMatch = findUserMatch(params.id, params.email, params.name);
      if (userMatch?.role === "super_admin") return;

      const existingKey =
        Array.from(map.keys()).find((k) => {
          const entry = map.get(k);
          if (!entry) return false;
          return (
            entry.id === params.id ||
            (userMatch && entry.id === userMatch.id) ||
            (normEmail && entry.email.toLowerCase() === normEmail)
          );
        }) ||
        userMatch?.id ||
        params.id;

      const existing = map.get(existingKey);
      const effectiveId = userMatch?.id || existing?.id || params.id;
      const rawSub = userMatch?.paystackSubaccount;
      const instructorSubaccount =
        rawSub?.subaccount_code?.startsWith("ACCT_") && rawSub?.is_active !== false
          ? rawSub
          : undefined;

      const courseTitles = new Set(existing?.courseTitles || []);
      if (params.courseTitle) courseTitles.add(params.courseTitle);

      map.set(existingKey, {
        id: effectiveId,
        name: userMatch?.name || params.name || existing?.name || "Instructor",
        email:
          userMatch?.email || params.email || existing?.email || "",
        courseTitles: Array.from(courseTitles),
        subaccountCode:
          instructorSubaccount?.subaccount_code || existing?.subaccountCode,
        bankCode: instructorSubaccount?.bank_code || existing?.bankCode,
        bankName: instructorSubaccount?.bank_name || existing?.bankName,
        accountNumber:
          instructorSubaccount?.account_number || existing?.accountNumber,
        accountName: instructorSubaccount?.account_name || existing?.accountName,
        currency: instructorSubaccount?.currency || existing?.currency || currency,
      });
    };

    // 1. Organization members with instructor role
    orgMembers
      .filter((m) => orgIdVariants.has(m.orgId) && m.role === "instructor")
      .forEach((m) => {
        upsertInstructor({
          id: m.userId || m.id,
          name: m.name,
          email: m.email,
        });
      });

    // 2. Instructors assigned directly to org courses
    orgCourses.forEach((course) => {
      if (course.instructorId) {
        const u = findUserMatch(
          course.instructorId,
          undefined,
          course.instructorName,
        );
        upsertInstructor({
          id: u?.id || course.instructorId,
          name: u?.name || course.instructorName || "Course Instructor",
          email: u?.email || "",
          courseTitle: course.title,
        });
      }
      if (Array.isArray(course.instructors)) {
        course.instructors.forEach((instId) => {
          const u = findUserMatch(instId);
          const m = orgMembers.find(
            (om) => om.userId === instId || om.id === instId,
          );
          upsertInstructor({
            id: u?.id || m?.userId || instId,
            name: u?.name || m?.name || "Assigned Instructor",
            email: u?.email || m?.email || "",
            courseTitle: course.title,
          });
        });
      }
    });

    // 3. Registered instructors belonging to this organization
    allUsers
      .filter(
        (u) =>
          u.role === "instructor" &&
          u.email?.toLowerCase() !== "ekenehq@gmail.com" &&
          u.orgId &&
          orgIdVariants.has(u.orgId),
      )
      .forEach((u) => {
        upsertInstructor({
          id: u.id,
          name: u.name,
          email: u.email,
        });
      });

    return Array.from(map.values()).sort((a, b) => {
      if (Boolean(a.subaccountCode) !== Boolean(b.subaccountCode)) {
        return a.subaccountCode ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [currentUser, orgId, myOrg, courses, orgMembers, allUsers, currency]);

  const orgSplitGroups = useMemo(() => {
    const orgIdVariants = new Set(
      [
        orgId,
        myOrg?.id,
        myOrg?.ownerId,
        currentUser?.orgId,
        currentUser?.role === "organization" ? currentUser.id : undefined,
      ].filter(Boolean) as string[],
    );
    return payrollSplitGroups.filter(
      (g) => !g.orgId || orgIdVariants.has(g.orgId),
    );
  }, [payrollSplitGroups, orgId, myOrg, currentUser]);

  const orgDisbursements = useMemo(() => {
    const orgIdVariants = new Set(
      [
        orgId,
        myOrg?.id,
        myOrg?.ownerId,
        currentUser?.orgId,
        currentUser?.role === "organization" ? currentUser.id : undefined,
      ].filter(Boolean) as string[],
    );
    return payrollDisbursements.filter(
      (d) => !d.orgId || orgIdVariants.has(d.orgId),
    );
  }, [payrollDisbursements, orgId, myOrg, currentUser]);

  const orgPayslips = useMemo(() => {
    const map = new Map<string, PayrollPayslip>();
    const orgIdVariants = new Set(
      [
        orgId,
        myOrg?.id,
        myOrg?.ownerId,
        currentUser?.orgId,
        currentUser?.role === "organization" ? currentUser.id : undefined,
      ].filter(Boolean) as string[],
    );

    payrollPayslips
      .filter((p) => !p.orgId || orgIdVariants.has(p.orgId))
      .forEach((p) => map.set(p.id, p));

    orgDisbursements.forEach((d) => {
      if (d.status !== "success") return;
      if (d.payslips && d.payslips.length > 0) {
        d.payslips.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
      } else {
        d.recipients.forEach((r, idx) => {
          const fallbackId = `ps_${d.reference}_${idx + 1}`;
          if (!map.has(fallbackId)) {
            const paidDate = d.paidAt || d.createdAt;
            const datePart = paidDate.slice(0, 7).replace("-", "");
            const shortRef =
              d.reference
                .replace(/[^A-Z0-9]/gi, "")
                .slice(-5)
                .toUpperCase() || "PAY";
            const breakdown: PayrollSalaryBreakdown =
              r.breakdown ||
              computeBreakdownTotals(r.amount, [], []);
            map.set(fallbackId, {
              id: fallbackId,
              payslipNumber: `PS-${datePart}-${shortRef}-${String(idx + 1).padStart(2, "0")}`,
              disbursementId: d.id,
              reference: d.reference,
              orgId: d.orgId,
              organizationName: myOrg?.name || "Organization Payroll",
              instructorId: r.instructorId,
              instructorName: r.instructorName,
              instructorEmail: r.instructorEmail,
              roleTitle: r.roleTitle || "Instructor",
              subaccountCode: r.subaccountCode,
              bankName: r.bankName,
              accountNumberMasked: r.accountNumber
                ? `****${r.accountNumber.slice(-4)}`
                : undefined,
              currency: d.currency,
              netSalary: r.amount,
              breakdown,
              payPeriod: d.payPeriod,
              settlementSchedule: "Next business day direct bank settlement",
              issuedAt: paidDate,
              paidAt: paidDate,
              verifiedVia: d.webhookConfirmed ? "webhook" : "checkout",
            });
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      (b.paidAt || b.issuedAt).localeCompare(a.paidAt || a.issuedAt),
    );
  }, [payrollPayslips, orgDisbursements, orgId, myOrg, currentUser]);

  const myInstructorPayslips = useMemo(() => {
    if (!currentUser) return [];
    const emailLower = (currentUser.email || "").toLowerCase();
    const allSlips = new Map<string, PayrollPayslip>();
    payrollPayslips.forEach((p) => allSlips.set(p.id, p));
    payrollDisbursements.forEach((d) => {
      if (d.status !== "success") return;
      d.payslips?.forEach((p) => {
        if (!allSlips.has(p.id)) allSlips.set(p.id, p);
      });
    });

    return Array.from(allSlips.values())
      .filter(
        (p) =>
          p.instructorId === currentUser.id ||
          (emailLower && p.instructorEmail?.toLowerCase() === emailLower),
      )
      .sort((a, b) =>
        (b.paidAt || b.issuedAt).localeCompare(a.paidAt || a.issuedAt),
      );
  }, [payrollPayslips, payrollDisbursements, currentUser]);

  // Download itemized PDF payslip (Earnings + Deductions + Net Salary)
  const downloadPayslipPdf = useCallback((slip: PayrollPayslip) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(0, 120, 212);
    doc.rect(0, 0, 595, 92, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(19);
    doc.setFont("helvetica", "bold");
    doc.text(slip.organizationName || "Organization Payroll", 40, 42);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL DIGITAL SALARY PAYSLIP", 40, 64);
    doc.text(`Payslip No: ${slip.payslipNumber}`, 555, 42, { align: "right" });
    doc.text(
      `Issued: ${new Date(slip.issuedAt).toLocaleDateString()}`,
      555,
      64,
      { align: "right" },
    );

    doc.setTextColor(15, 23, 42);
    let y = 126;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Instructor & Payment Summary", 40, y);
    y += 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y, 555, y);
    y += 20;

    const metaRows: Array<[string, string]> = [
      ["Instructor Name", slip.instructorName],
      ["Role / Title", slip.roleTitle || "Instructor"],
      ["Email", slip.instructorEmail || "—"],
      [
        "Pay Period",
        slip.payPeriod ||
          new Date(slip.paidAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
      ],
      ["Destination Bank", slip.bankName || "Connected Bank Account"],
      ["Account", slip.accountNumberMasked || "Verified Bank Account"],
      ["Payment Reference", slip.reference],
      ["Paid Date", new Date(slip.paidAt).toLocaleString()],
    ];

    doc.setFontSize(10);
    metaRows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(label, 40, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(String(value), 200, y);
      y += 20;
    });

    const bd = slip.breakdown || computeBreakdownTotals(slip.netSalary, [], []);

    // Earnings Section
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Earnings Breakdown", 40, y);
    y += 10;
    doc.line(40, y, 555, y);
    y += 18;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Basic Salary", 40, y);
    doc.text(
      `${slip.currency} ${bd.basicSalary.toLocaleString()}`,
      555,
      y,
      { align: "right" },
    );
    y += 18;

    bd.allowances.forEach((a) => {
      doc.text(a.label, 40, y);
      doc.text(
        `+${slip.currency} ${a.amount.toLocaleString()}`,
        555,
        y,
        { align: "right" },
      );
      y += 18;
    });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Gross Earnings", 40, y);
    doc.text(`${slip.currency} ${bd.grossSalary.toLocaleString()}`, 555, y, {
      align: "right",
    });

    // Deductions Section
    y += 24;
    doc.setFontSize(11.5);
    doc.text("Deductions", 40, y);
    y += 10;
    doc.line(40, y, 555, y);
    y += 18;

    doc.setFontSize(10);
    if (bd.deductions.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("No deductions applied", 40, y);
      doc.text(`${slip.currency} 0`, 555, y, { align: "right" });
      y += 18;
    } else {
      bd.deductions.forEach((d) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(d.label, 40, y);
        doc.setTextColor(185, 28, 28);
        doc.text(
          `-${slip.currency} ${d.amount.toLocaleString()}`,
          555,
          y,
          { align: "right" },
        );
        y += 18;
      });
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Total Deductions", 40, y);
    doc.text(
      `-${slip.currency} ${bd.totalDeductions.toLocaleString()}`,
      555,
      y,
      { align: "right" },
    );

    // Net Salary Summary Box
    y += 24;
    doc.setFillColor(240, 247, 253);
    doc.roundedRect(40, y, 515, 64, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 120, 212);
    doc.text("NET SALARY SETTLED TO BANK ACCOUNT", 58, y + 24);
    doc.setFontSize(21);
    doc.setTextColor(15, 23, 42);
    doc.text(`${slip.currency} ${slip.netSalary.toLocaleString()}`, 535, y + 42, {
      align: "right",
    });

    y += 88;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Settlement Schedule: ${slip.settlementSchedule}. This official digital payslip confirms direct payout to the instructor's bank account.`,
      40,
      y,
    );
    doc.save(
      `Payslip-${slip.payslipNumber}-${slip.instructorName.replace(/\s+/g, "_")}.pdf`,
    );
  }, []);

  const verifyPendingTransferDisbursement = useCallback(
    async (disbursement: PayrollDisbursement, silent = false) => {
      if (!disbursement?.reference) return;
      if (!silent) setVerifyingTransfer(true);
      try {
        const res = await checkPayrollRunStatus(disbursement.reference);
        if (res.status === "success") {
          let finalSlips: PayrollPayslip[] = (res.payslips ||
            []) as PayrollPayslip[];
          if (finalSlips.length === 0) {
            const issued = await issuePayrollPayslips({
              reference: disbursement.reference,
              orgId: disbursement.orgId,
              organizationName:
                myOrg?.name || currentUser?.name || "Organization Payroll",
              payerEmail: disbursement.payerEmail,
              currency: disbursement.currency,
              payPeriod: disbursement.payPeriod,
              paidAt: res.paidAt || new Date().toISOString(),
              recipients: disbursement.recipients.map((r) => ({
                instructorId: r.instructorId,
                instructorName: r.instructorName,
                instructorEmail: r.instructorEmail,
                roleTitle: r.roleTitle,
                subaccount_code: r.subaccountCode,
                bankName: r.bankName,
                accountNumber: r.accountNumber,
                amount: r.amount,
                breakdown: r.breakdown,
              })),
            });
            finalSlips = issued?.payslips || [];
          }

          const updated: PayrollDisbursement = {
            ...disbursement,
            status: "success",
            webhookConfirmed: Boolean(res.webhookConfirmed),
            settlementStatus: "confirmed_settling",
            paidAt: res.paidAt || new Date().toISOString(),
            payslips: finalSlips,
          };
          await recordPayrollDisbursement(updated);
          setTransferModalDisbursement(null);
          setActiveTab("records");
          setRecordsView("payslips");
          setStatusBanner({
            type: "success",
            title: "Bank Transfer Confirmed & Digital Payslips Issued",
            message: `Transfer for ${disbursement.currency} ${disbursement.totalAmount.toLocaleString()} is confirmed. Salaries settle directly to staff bank accounts on the next business day, and ${finalSlips.length} itemized digital payslip${finalSlips.length === 1 ? " is" : "s are"} ready.`,
          });
        } else if (!silent) {
          setStatusBanner({
            type: "info",
            title: "Awaiting Bank Transfer Confirmation",
            message:
              "Your transfer has not cleared yet. Once received, confirmation and digital payslips are issued automatically.",
          });
        }
      } catch (err) {
        if (!silent) {
          setStatusBanner({
            type: "error",
            title: "Verification Check Notice",
            message:
              err instanceof Error
                ? err.message
                : "Could not verify transfer status right now.",
          });
        }
      } finally {
        if (!silent) setVerifyingTransfer(false);
      }
    },
    [myOrg, currentUser, recordPayrollDisbursement],
  );

  // Auto-poll webhook/verification status while Bank Transfer invoice modal is open
  useEffect(() => {
    if (
      !transferModalDisbursement ||
      transferModalDisbursement.status === "success"
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      verifyPendingTransferDisbursement(transferModalDisbursement, true);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [transferModalDisbursement, verifyPendingTransferDisbursement]);

  if (!currentUser || (!isAuthorized && !isInstructorOnly)) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
          Organization Payroll Access Required
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Only organizations, authorized school administrators, and instructors
          viewing payslips can access this page.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-[#0078d4] text-white rounded-xl text-sm font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Focused Instructor Portal: View & Download Itemized Digital Payslips
  if (isInstructorOnly) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-12 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-[#0078d4]/10 dark:bg-[#04a4ec]/15 text-[#0078d4] dark:text-[#04a4ec]">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-heading">
                My Salary Payslips
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View your salary breakdown and download official digital payslips
              settled straight to your payout account.
            </p>
          </div>
          <Link
            to="/settings"
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 self-start"
          >
            Manage Payout Bank Account
          </Link>
        </div>

        {myInstructorPayslips.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-2">
            <FileText className="w-9 h-9 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Digital Payslips Issued Yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Whenever your organization pays your salary through payroll, your
              itemized digital payslip will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myInstructorPayslips.map((slip) => {
              const bd =
                slip.breakdown ||
                computeBreakdownTotals(slip.netSalary, [], []);
              return (
                <div
                  key={slip.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-mono font-bold text-[#0078d4] dark:text-[#04a4ec]">
                        {slip.payslipNumber}
                      </p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {slip.payPeriod || "Salary Payment"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {slip.organizationName} •{" "}
                        {new Date(slip.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {slip.currency} {slip.netSalary.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Direct Bank Settlement
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between">
                      <span>Basic + Allowances:</span>
                      <span className="font-mono font-semibold">
                        {slip.currency} {bd.grossSalary.toLocaleString()}
                      </span>
                    </div>
                    {bd.totalDeductions > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span>Deductions:</span>
                        <span className="font-mono font-semibold">
                          -{slip.currency} {bd.totalDeductions.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                      Bank: <strong>{slip.bankName || "Connected Bank"}</strong>{" "}
                      {slip.accountNumberMasked
                        ? `(${slip.accountNumberMasked})`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPayslip(slip)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      View Breakdown
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPayslipPdf(slip)}
                      className="flex-1 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Itemized Payslip Preview Modal for Instructor */}
        {previewPayslip && (
          <PayslipPreviewModal
            slip={previewPayslip}
            onClose={() => setPreviewPayslip(null)}
            onDownload={() => downloadPayslipPdf(previewPayslip)}
          />
        )}
      </div>
    );
  }

  const getInstructorBreakdown = (
    inst: UnifiedPayrollInstructor,
  ): PayrollSalaryBreakdown => {
    const custom = salaryBreakdowns[inst.id];
    if (custom) return custom;
    const raw = Number(salaryInputs[inst.id] || 0);
    const cleanNet = Number.isFinite(raw) && raw > 0 ? raw : 0;
    return computeBreakdownTotals(cleanNet, [], []);
  };

  const getSalaryAmount = (inst: UnifiedPayrollInstructor): number => {
    return getInstructorBreakdown(inst).netSalary;
  };

  const openBreakdownModal = (inst: UnifiedPayrollInstructor) => {
    const existing = salaryBreakdowns[inst.id];
    const currentAmount = Number(salaryInputs[inst.id] || 0);
    setBreakdownModalInst(inst);
    setDraftRoleTitle(roleTitles[inst.id] || "Instructor");
    setDraftBasicSalary(
      existing
        ? String(existing.basicSalary)
        : currentAmount > 0
          ? String(currentAmount)
          : "",
    );
    setDraftAllowances(
      existing?.allowances ? existing.allowances.map((a) => ({ ...a })) : [],
    );
    setDraftDeductions(
      existing?.deductions ? existing.deductions.map((d) => ({ ...d })) : [],
    );
    setBreakdownError("");
  };

  const handleSaveBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakdownModalInst) return;
    const basicNum = Number(draftBasicSalary || 0);
    if (!Number.isFinite(basicNum) || basicNum < 0) {
      setBreakdownError("Basic salary must be 0 or greater.");
      return;
    }
    const computed = computeBreakdownTotals(
      basicNum,
      draftAllowances,
      draftDeductions,
    );
    if (computed.netSalary <= 0) {
      setBreakdownError(
        "Net take-home salary must be greater than zero after deductions.",
      );
      return;
    }
    setSalaryBreakdowns((prev) => ({
      ...prev,
      [breakdownModalInst.id]: computed,
    }));
    setRoleTitles((prev) => ({
      ...prev,
      [breakdownModalInst.id]: draftRoleTitle.trim() || "Instructor",
    }));
    setSalaryInputs((prev) => ({
      ...prev,
      [breakdownModalInst.id]: String(computed.netSalary),
    }));
    if (!selectedIds.includes(breakdownModalInst.id)) {
      setSelectedIds((prev) => [...prev, breakdownModalInst.id]);
    }
    setBreakdownModalInst(null);
  };

  const filteredInstructors = unifiedInstructors.filter((inst) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      inst.name.toLowerCase().includes(q) ||
      inst.email.toLowerCase().includes(q) ||
      inst.courseTitles.some((c) => c.toLowerCase().includes(q))
    );
  });

  const linkedInstructors = unifiedInstructors.filter((i) =>
    Boolean(i.subaccountCode),
  );
  const selectedLinkedInstructors = linkedInstructors.filter((i) =>
    selectedIds.includes(i.id),
  );
  const batchTotalAmount = selectedLinkedInstructors.reduce(
    (sum, inst) => sum + getSalaryAmount(inst),
    0,
  );
  const batchProcessingFee =
    Math.round(feePerStaff * selectedLinkedInstructors.length * 100) / 100;
  const batchGrandTotal =
    Math.round((batchTotalAmount + batchProcessingFee) * 100) / 100;

  // Complete a verified checkout disbursement & issue itemized digital payslips
  const finalizeCheckoutDisbursement = async (params: {
    reference: string;
    paymentType: "individual" | "split_group" | "batch_split";
    splitGroupId?: string;
    splitCode?: string;
    splitGroupName?: string;
    netSalariesTotal: number;
    platformFee: number;
    grandTotal: number;
    currency: string;
    recipients: PayrollDisbursement["recipients"];
  }) => {
    let verifiedStatus: "success" | "initialized" = "success";
    let webhookConfirmed = false;
    let paidAt = new Date().toISOString();
    let payslips: PayrollPayslip[] = [];

    try {
      const verify = await verifyTransaction(params.reference);
      if (verify?.status && verify.status !== "success") {
        verifiedStatus = "initialized";
      }
      if (verify?.paid_at) paidAt = verify.paid_at;
    } catch {
      // Keep confirmed popup reference if verification endpoint takes a moment
    }

    try {
      const statusRes = await checkPayrollRunStatus(params.reference);
      if (statusRes?.webhookConfirmed) webhookConfirmed = true;
      if (statusRes?.payslips && statusRes.payslips.length > 0) {
        payslips = statusRes.payslips as PayrollPayslip[];
      }
    } catch {
      // Fallback to issue-payslips below
    }

    if (payslips.length === 0) {
      try {
        const issued = await issuePayrollPayslips({
          reference: params.reference,
          orgId,
          organizationName: myOrg?.name || currentUser.name,
          payerEmail: payerEmail.trim(),
          currency: params.currency,
          payPeriod: payPeriod || undefined,
          paidAt,
          recipients: params.recipients.map((r) => ({
            instructorId: r.instructorId,
            instructorName: r.instructorName,
            instructorEmail: r.instructorEmail,
            roleTitle: r.roleTitle,
            subaccount_code: r.subaccountCode,
            bankName: r.bankName,
            accountNumber: r.accountNumber,
            amount: r.amount,
            breakdown: r.breakdown,
          })),
        });
        payslips = issued?.payslips || [];
      } catch {
        // Fallback if offline
      }
    }

    const disbursement: PayrollDisbursement = {
      id: generateId("pay"),
      orgId,
      reference: params.reference,
      paymentType: params.paymentType,
      paymentChannel: "checkout",
      splitGroupId: params.splitGroupId,
      splitCode: params.splitCode,
      splitGroupName: params.splitGroupName,
      payerEmail: payerEmail.trim(),
      currency: params.currency,
      netSalariesTotal: params.netSalariesTotal,
      feePerStaff,
      totalAmount: params.grandTotal,
      platformCut: params.platformFee,
      webhookConfirmed,
      settlementStatus: "confirmed_settling",
      payslips,
      recipients: params.recipients,
      status: verifiedStatus,
      note: paymentNote || undefined,
      payPeriod: payPeriod || undefined,
      paidAt,
      createdAt: new Date().toISOString(),
      initiatedBy: currentUser.name,
    };

    await recordPayrollDisbursement(disbursement);
    return disbursement;
  };

  // Individual Direct Salary Payment
  const handlePayIndividual = async (inst: UnifiedPayrollInstructor) => {
    if (!inst.subaccountCode) {
      setStatusBanner({
        type: "error",
        title: "Instructor Payout Account Pending",
        message: `${inst.name} has not connected their own payout bank account yet. Ask them to set up their payout account in Settings before paying.`,
      });
      return;
    }
    const breakdown = getInstructorBreakdown(inst);
    const netSalary = breakdown.netSalary;
    const roleTitle = roleTitles[inst.id] || "Instructor";

    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message:
          "Enter your organization payor receipt email address before starting checkout.",
      });
      return;
    }
    if (!netSalary || netSalary <= 0) {
      setStatusBanner({
        type: "error",
        title: "Enter Salary Amount",
        message: `Enter a positive ${currency} salary amount for ${inst.name} (or set their breakdown) before paying.`,
      });
      return;
    }

    const platformFee = Math.round(feePerStaff * 100) / 100;
    const grandTotal = Math.round((netSalary + platformFee) * 100) / 100;

    setStatusBanner(null);

    const recipientsPayload = [
      {
        instructorId: inst.id,
        instructorName: inst.name,
        instructorEmail: inst.email,
        roleTitle,
        subaccountCode: inst.subaccountCode,
        bankName: inst.bankName,
        accountNumber: inst.accountNumber,
        amount: netSalary,
        breakdown,
      },
    ];

    if (paymentChannel === "bank_transfer") {
      setProcessingKey(`ind_${inst.id}`);
      try {
        const init = await initializePayrollTransaction({
          paymentType: "individual",
          paymentChannel: "bank_transfer",
          email: payerEmail.trim(),
          organizationName: myOrg?.name || currentUser.name,
          orgId,
          payPeriod,
          amount: netSalary,
          currency,
          subaccount_code: inst.subaccountCode,
          feePerStaff,
          recipients: recipientsPayload.map((r) => ({
            ...r,
            subaccount_code: r.subaccountCode,
          })),
          metadata: {
            org_id: orgId,
            org_name: myOrg?.name || currentUser.name,
            instructor_id: inst.id,
            instructor_name: inst.name,
            pay_period: payPeriod,
            note: paymentNote || `Salary payment for ${inst.name}`,
          },
        });

        if (init.paymentChannel === "bank_transfer" && init.dedicatedAccount) {
          const pendingDisbursement: PayrollDisbursement = {
            id: generateId("pay"),
            orgId,
            reference: init.reference,
            paymentType: "individual",
            paymentChannel: "bank_transfer",
            splitCode: init.split_code,
            payerEmail: payerEmail.trim(),
            currency,
            netSalariesTotal: netSalary,
            feePerStaff,
            totalAmount: init.grandTotal ?? grandTotal,
            platformCut: init.platformFee ?? platformFee,
            dedicatedAccount: init.dedicatedAccount,
            settlementStatus: "awaiting_transfer",
            recipients: recipientsPayload,
            status: "initialized",
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          };
          await recordPayrollDisbursement(pendingDisbursement);
          setProcessingKey(null);
          setTransferModalDisbursement(pendingDisbursement);
          return;
        }
        setProcessingKey(null);
        setStatusBanner({
          type: "error",
          title: "Bank Transfer Account Unavailable",
          message:
            "Could not generate a dedicated bank transfer account right now. Switch to Online Checkout or try again.",
        });
      } catch (err) {
        setProcessingKey(null);
        setStatusBanner({
          type: "error",
          title: "Transfer Setup Failed",
          message:
            err instanceof Error
              ? err.message
              : "Could not set up corporate bank transfer.",
        });
      }
      return;
    }

    // Online Checkout: Open Tuition-style Review Modal and pay via Public Key directly
    setIsPayrollDisclosureAcknowledged(false);
    setPayrollCheckoutDraft({
      reference: generateReferenceNumber("PAY"),
      paymentType: "individual",
      title: `${inst.name}${payPeriod ? ` (${payPeriod})` : ""}`,
      currency,
      netSalariesTotal: netSalary,
      platformFee,
      grandTotal,
      subaccountCode: inst.subaccountCode,
      recipients: recipientsPayload,
    });
  };

  // Multi-Instructor Single Payroll Batch Payment / Bank Transfer
  const handlePayBatchInOneTransaction = async () => {
    if (selectedLinkedInstructors.length === 0) return;
    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message:
          "Enter a valid organization payor email address before paying payroll.",
      });
      return;
    }

    const zeroSalary = selectedLinkedInstructors.find(
      (i) => getSalaryAmount(i) <= 0,
    );
    if (zeroSalary) {
      setStatusBanner({
        type: "error",
        title: "Missing Salary Amount",
        message: `Enter a positive ${currency} salary amount for ${zeroSalary.name} or uncheck them from this payroll run.`,
      });
      return;
    }

    if (
      saveBatchAsGroup &&
      selectedLinkedInstructors.length >= 2 &&
      !batchGroupName.trim()
    ) {
      setStatusBanner({
        type: "error",
        title: "Pay Group Name Required",
        message:
          "Provide a name for this saved pay group or uncheck 'Save this team as a Reusable Pay Group'.",
      });
      return;
    }

    if (selectedLinkedInstructors.length === 1) {
      await handlePayIndividual(selectedLinkedInstructors[0]);
      return;
    }

    const platformFee = batchProcessingFee;
    const grandTotal = batchGrandTotal;

    setProcessingKey("batch");
    setStatusBanner(null);

    try {
      const recipientsPayload = selectedLinkedInstructors.map((inst) => {
        const bd = getInstructorBreakdown(inst);
        return {
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          roleTitle: roleTitles[inst.id] || "Instructor",
          subaccountCode: inst.subaccountCode!,
          bankName: inst.bankName,
          accountNumber: inst.accountNumber,
          amount: bd.netSalary,
          breakdown: bd,
        };
      });

      // Group selected instructors by payout subaccount and create a flat Transaction Split via Secret Key
      const batchSplitSummary = buildPayrollDynamicSplit(
        recipientsPayload,
        feePerStaff,
      );

      const splitGroupDisplayName = saveBatchAsGroup
        ? batchGroupName.trim()
        : `Payroll Batch ${payPeriod || new Date().toISOString().slice(0, 10)}`;

      const groupRes = await createPayrollSplitGroup({
        name: splitGroupDisplayName,
        type: "flat",
        currency,
        bearer_type: "all-proportional",
        subaccounts: batchSplitSummary.instructorSplits,
      });

      const createdSplitCode = groupRes.split_code;
      let createdGroupRecord: PayrollSplitGroup | undefined;

      if (saveBatchAsGroup) {
        createdGroupRecord = {
          id: generateId("spl"),
          orgId,
          name: batchGroupName.trim(),
          splitCode: createdSplitCode,
          paystackSplitId: groupRes.id,
          type: "flat",
          currency,
          bearerType: "all-proportional",
          members: recipientsPayload.map((r) => ({
            instructorId: r.instructorId,
            instructorName: r.instructorName,
            instructorEmail: r.instructorEmail,
            roleTitle: r.roleTitle,
            subaccountCode: r.subaccountCode,
            bankName: r.bankName,
            accountNumber: r.accountNumber,
            amount: r.amount,
            breakdown: r.breakdown,
          })),
          totalAmount: batchTotalAmount,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await savePayrollSplitGroup(createdGroupRecord);
      }

      if (paymentChannel === "bank_transfer") {
        const init = await initializePayrollTransaction({
          paymentType: "group",
          paymentChannel: "bank_transfer",
          email: payerEmail.trim(),
          organizationName: myOrg?.name || currentUser.name,
          orgId,
          payPeriod,
          amount: batchSplitSummary.netTotal,
          currency,
          split_code: createdSplitCode,
          feePerStaff,
          bearer_type: "all-proportional",
          recipients: recipientsPayload.map((r) => ({
            ...r,
            subaccount_code: r.subaccountCode,
            share: Math.round(r.amount * 100),
          })),
          metadata: {
            org_id: orgId,
            org_name: myOrg?.name || currentUser.name,
            pay_period: payPeriod,
            recipient_count: recipientsPayload.length,
            instructor_count: batchSplitSummary.instructorSplits.length,
            note:
              paymentNote ||
              `Multi-instructor payroll (${recipientsPayload.length} instructors)`,
          },
        });

        if (init.paymentChannel === "bank_transfer" && init.dedicatedAccount) {
          const pendingDisbursement: PayrollDisbursement = {
            id: generateId("pay"),
            orgId,
            reference: init.reference,
            paymentType: saveBatchAsGroup ? "split_group" : "batch_split",
            paymentChannel: "bank_transfer",
            splitGroupId: createdGroupRecord?.id,
            splitCode: init.split_code || createdSplitCode,
            splitGroupName: createdGroupRecord?.name,
            payerEmail: payerEmail.trim(),
            currency,
            netSalariesTotal: batchTotalAmount,
            feePerStaff,
            totalAmount: init.grandTotal ?? grandTotal,
            platformCut: init.platformFee ?? platformFee,
            dedicatedAccount: init.dedicatedAccount,
            settlementStatus: "awaiting_transfer",
            recipients: recipientsPayload,
            status: "initialized",
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          };
          await recordPayrollDisbursement(pendingDisbursement);
          setProcessingKey(null);
          setSelectedIds([]);
          setSaveBatchAsGroup(false);
          setBatchGroupName("");
          setTransferModalDisbursement(pendingDisbursement);
          return;
        }
        setProcessingKey(null);
        setStatusBanner({
          type: "error",
          title: "Bank Transfer Account Unavailable",
          message:
            "Could not generate a dedicated bank transfer account right now. Switch to Online Checkout or try again.",
        });
        return;
      }

      // Online Checkout: Open Tuition-style Review Modal with prepared split_code, pay via Public Key
      setProcessingKey(null);
      setIsPayrollDisclosureAcknowledged(false);
      setPayrollCheckoutDraft({
        reference: generateReferenceNumber("PAY"),
        paymentType: saveBatchAsGroup ? "split_group" : "batch_split",
        title: `${recipientsPayload.length} Instructors${payPeriod ? ` (${payPeriod})` : ""}`,
        currency,
        netSalariesTotal: batchTotalAmount,
        platformFee,
        grandTotal,
        splitCode: createdSplitCode,
        splitGroupId: createdGroupRecord?.id,
        splitGroupName: createdGroupRecord?.name,
        recipients: recipientsPayload,
        clearSelectionOnSuccess: true,
      });
    } catch (err) {
      setProcessingKey(null);
      setStatusBanner({
        type: "error",
        title: "Payment Setup Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to prepare multi-instructor payroll.",
      });
    }
  };

  // Load Saved Group into Run Payroll (so school can adjust allowances/deductions before paying)
  const handleLoadGroupIntoRun = (group: PayrollSplitGroup) => {
    const readyIds = new Set(linkedInstructors.map((i) => i.id));
    const nextSalaries: Record<string, string> = { ...salaryInputs };
    const nextBreakdowns: Record<string, PayrollSalaryBreakdown> = {
      ...salaryBreakdowns,
    };
    const nextRoles: Record<string, string> = { ...roleTitles };
    const loadedIds: string[] = [];

    group.members.forEach((m) => {
      if (!readyIds.has(m.instructorId)) return;
      loadedIds.push(m.instructorId);
      if (m.roleTitle) nextRoles[m.instructorId] = m.roleTitle;
      if (group.type === "flat" && m.amount > 0) {
        nextSalaries[m.instructorId] = String(m.amount);
        if (m.breakdown) {
          nextBreakdowns[m.instructorId] = m.breakdown;
        }
      }
    });

    if (loadedIds.length === 0) {
      setStatusBanner({
        type: "error",
        title: "No Active Payout Accounts Found",
        message:
          "None of the instructors in this saved group currently have active payout accounts.",
      });
      return;
    }

    if (SUPPORTED_PAYROLL_CURRENCIES.includes(group.currency)) {
      setCurrency(group.currency);
    }
    setSalaryInputs(nextSalaries);
    setSalaryBreakdowns(nextBreakdowns);
    setRoleTitles(nextRoles);
    setSelectedIds(loadedIds);
    setActiveTab("run");
    setStatusBanner({
      type: "info",
      title: `Loaded "${group.name}" into Run Payroll`,
      message:
        group.type === "flat"
          ? `${loadedIds.length} instructors and their salary amounts are loaded into this payroll run. Adjust any breakdown or click Pay when ready.`
          : `${loadedIds.length} instructors loaded. Enter this month's salary amounts or use "Pay Now" on the Saved Pay Group for percentage pool split.`,
    });
  };

  // Create Reusable Saved Pay Group Modal Handler
  const openCreateGroupModal = () => {
    const initialMap: Record<string, { included: boolean; value: string }> =
      {};
    linkedInstructors.forEach((inst) => {
      const isSelected = selectedIds.includes(inst.id);
      const sal = getSalaryAmount(inst);
      initialMap[inst.id] = {
        included: isSelected,
        value: sal > 0 ? String(sal) : "",
      };
    });
    setGroupMemberShares(initialMap);
    setNewGroupName("");
    setNewGroupType("flat");
    setGroupFormError("");
    setCreateGroupModalOpen(true);
  };

  const handleCreateSplitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setGroupFormError("Enter a name for this Pay Group.");
      return;
    }

    const chosen = linkedInstructors.filter(
      (inst) => groupMemberShares[inst.id]?.included,
    );
    if (chosen.length < 2) {
      setGroupFormError(
        "Select at least 2 instructors with active payout accounts.",
      );
      return;
    }

    const members: PayrollSplitMember[] = [];
    let totalFlat = 0;
    let totalPct = 0;

    for (const inst of chosen) {
      const val = Number(groupMemberShares[inst.id]?.value || 0);
      if (!Number.isFinite(val) || val <= 0) {
        setGroupFormError(
          `Enter a valid positive ${newGroupType === "flat" ? "salary amount" : "percentage"} for ${inst.name}.`,
        );
        return;
      }
      if (newGroupType === "flat") {
        totalFlat += val;
        const existingBd = salaryBreakdowns[inst.id];
        members.push({
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          roleTitle: roleTitles[inst.id] || "Instructor",
          subaccountCode: inst.subaccountCode!,
          bankName: inst.bankName,
          accountNumber: inst.accountNumber,
          amount: val,
          breakdown:
            existingBd && existingBd.netSalary === val
              ? existingBd
              : computeBreakdownTotals(val, [], []),
        });
      } else {
        totalPct += val;
        members.push({
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          roleTitle: roleTitles[inst.id] || "Instructor",
          subaccountCode: inst.subaccountCode!,
          bankName: inst.bankName,
          accountNumber: inst.accountNumber,
          amount: 0,
          sharePercentage: val,
        });
      }
    }

    if (newGroupType === "percentage" && Math.abs(totalPct - 100) > 0.01) {
      setGroupFormError(
        `Percentage shares must add up to 100% (currently ${totalPct}%).`,
      );
      return;
    }

    setCreatingGroup(true);
    setGroupFormError("");

    try {
      const subaccountsPayload = members.map((m) => ({
        subaccount: m.subaccountCode,
        share:
          newGroupType === "flat"
            ? Math.round(m.amount * 100)
            : Math.round(m.sharePercentage || 0),
      }));

      const res = await createPayrollSplitGroup({
        name: newGroupName.trim(),
        type: newGroupType,
        currency,
        bearer_type: "all-proportional",
        subaccounts: subaccountsPayload,
      });

      const savedGroup: PayrollSplitGroup = {
        id: generateId("spl"),
        orgId,
        name: newGroupName.trim(),
        splitCode: res.split_code,
        paystackSplitId: res.id,
        type: newGroupType,
        currency,
        bearerType: "all-proportional",
        members,
        totalAmount: newGroupType === "flat" ? totalFlat : undefined,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await savePayrollSplitGroup(savedGroup);
      setCreateGroupModalOpen(false);
      setActiveTab("templates");
      setStatusBanner({
        type: "success",
        title: "Pay Group Saved",
        message: `"${savedGroup.name}" is saved—you can pay the whole group in 1 click or load it into Run Payroll anytime.`,
      });
    } catch (err) {
      setGroupFormError(
        err instanceof Error ? err.message : "Failed to save pay group.",
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  // Pay a Saved Split Group (Flat or Percentage)
  const executePaySplitGroup = async (
    group: PayrollSplitGroup,
    netTotalAmount: number,
  ) => {
    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message:
          "Enter your organization payor email before paying a saved group.",
      });
      return;
    }

    const activeCurrency = group.currency || currency;
    const computedRecipients = group.members.map((m) => {
      const amt =
        group.type === "flat"
          ? m.amount
          : Math.round(((netTotalAmount * (m.sharePercentage || 0)) / 100) * 100) /
            100;
      const bd =
        m.breakdown && m.breakdown.netSalary === amt
          ? m.breakdown
          : salaryBreakdowns[m.instructorId] &&
              salaryBreakdowns[m.instructorId].netSalary === amt
            ? salaryBreakdowns[m.instructorId]
            : computeBreakdownTotals(amt, [], []);
      return {
        instructorId: m.instructorId,
        instructorName: m.instructorName,
        instructorEmail: m.instructorEmail,
        roleTitle: m.roleTitle || roleTitles[m.instructorId] || "Instructor",
        subaccountCode: m.subaccountCode,
        bankName: m.bankName,
        accountNumber: m.accountNumber,
        amount: amt,
        breakdown: bd,
      };
    });

    const platformFee =
      Math.round(feePerStaff * computedRecipients.length * 100) / 100;
    const grandTotal = Math.round((netTotalAmount + platformFee) * 100) / 100;

    setProcessingKey(`grp_${group.id}`);
    setPayingGroupModal(null);
    setStatusBanner(null);

    try {
      const groupSplitSummary = buildPayrollDynamicSplit(
        computedRecipients,
        feePerStaff,
      );

      if (paymentChannel === "bank_transfer") {
        const init = await initializePayrollTransaction({
          paymentType: "group",
          paymentChannel: "bank_transfer",
          email: payerEmail.trim(),
          organizationName: myOrg?.name || currentUser.name,
          orgId,
          payPeriod,
          amount: netTotalAmount,
          currency: activeCurrency,
          split_code: feePerStaff > 0 ? undefined : group.splitCode,
          feePerStaff,
          bearer_type: "all-proportional",
          recipients: computedRecipients.map((r) => ({
            ...r,
            subaccount_code: r.subaccountCode,
            share: Math.round(r.amount * 100),
          })),
          metadata: {
            org_id: orgId,
            split_group_id: group.id,
            split_group_name: group.name,
            split_code: group.splitCode,
            pay_period: payPeriod,
          },
        });

        if (init.paymentChannel === "bank_transfer" && init.dedicatedAccount) {
          const pendingDisbursement: PayrollDisbursement = {
            id: generateId("pay"),
            orgId,
            reference: init.reference,
            paymentType: "split_group",
            paymentChannel: "bank_transfer",
            splitGroupId: group.id,
            splitCode: init.split_code || group.splitCode,
            splitGroupName: group.name,
            payerEmail: payerEmail.trim(),
            currency: activeCurrency,
            netSalariesTotal: netTotalAmount,
            feePerStaff,
            totalAmount: init.grandTotal ?? grandTotal,
            platformCut: init.platformFee ?? platformFee,
            dedicatedAccount: init.dedicatedAccount,
            settlementStatus: "awaiting_transfer",
            recipients: computedRecipients,
            status: "initialized",
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          };
          await recordPayrollDisbursement(pendingDisbursement);
          setProcessingKey(null);
          setTransferModalDisbursement(pendingDisbursement);
          return;
        }
        setProcessingKey(null);
        setStatusBanner({
          type: "error",
          title: "Bank Transfer Account Unavailable",
          message:
            "Could not generate a dedicated bank transfer account right now. Switch to Online Checkout or try again.",
        });
        return;
      }

      // Online Checkout: reuse flat split_code or create exact flat split_code via Secret Key for percentage/modified runs
      let activeSplitCode =
        group.type === "flat" && group.splitCode ? group.splitCode : undefined;

      if (!activeSplitCode) {
        const splitRes = await createPayrollSplitGroup({
          name: `${group.name} (${payPeriod || new Date().toISOString().slice(0, 10)})`,
          type: "flat",
          currency: activeCurrency,
          bearer_type: "all-proportional",
          subaccounts: groupSplitSummary.instructorSplits,
        });
        activeSplitCode = splitRes.split_code;
      }

      setProcessingKey(null);
      setIsPayrollDisclosureAcknowledged(false);
      setPayrollCheckoutDraft({
        reference: generateReferenceNumber("PAY"),
        paymentType: "split_group",
        title: `${group.name} (${computedRecipients.length} instructors)`,
        currency: activeCurrency,
        netSalariesTotal: netTotalAmount,
        platformFee,
        grandTotal,
        splitCode: activeSplitCode,
        splitGroupId: group.id,
        splitGroupName: group.name,
        recipients: computedRecipients,
      });
    } catch (err) {
      setProcessingKey(null);
      setStatusBanner({
        type: "error",
        title: "Payment Setup Error",
        message:
          err instanceof Error
            ? err.message
            : "Unable to prepare group payroll checkout.",
      });
    }
  };

  // Trigger Public-Key Checkout directly on button click from the Tuition-Style Review Modal
  const handleConfirmPayrollCheckout = () => {
    if (!payrollCheckoutDraft) return;
    const draft = payrollCheckoutDraft;
    setIsCheckoutPopupActive(true);
    setStatusBanner(null);

    triggerPayrollPaystackCheckout({
      email: payerEmail.trim(),
      amount: draft.grandTotal,
      baseAmount: draft.netSalariesTotal,
      transactionCharge: draft.platformFee,
      currency: draft.currency,
      subaccountCode: draft.splitCode ? undefined : draft.subaccountCode,
      splitCode: draft.splitCode,
      reference: draft.reference,
      organizationName: myOrg?.name || currentUser.name,
      payPeriod,
      recipientCount: draft.recipients.length,
      metadata: {
        org_id: orgId,
        org_name: myOrg?.name || currentUser.name,
        pay_period: payPeriod,
        split_group_id: draft.splitGroupId,
        split_group_name: draft.splitGroupName,
        recipient_count: draft.recipients.length,
        note: paymentNote || undefined,
      },
      onSuccess: async (txRes) => {
        const finalRef = txRes.reference || draft.reference;
        const saved = await finalizeCheckoutDisbursement({
          reference: finalRef,
          paymentType: draft.paymentType,
          splitGroupId: draft.splitGroupId,
          splitCode: draft.splitCode,
          splitGroupName: draft.splitGroupName,
          netSalariesTotal: draft.netSalariesTotal,
          platformFee: draft.platformFee,
          grandTotal: draft.grandTotal,
          currency: draft.currency,
          recipients: draft.recipients,
        });

        setIsCheckoutPopupActive(false);
        setPayrollCheckoutDraft(null);
        if (draft.clearSelectionOnSuccess) {
          setSelectedIds([]);
          setSaveBatchAsGroup(false);
          setBatchGroupName("");
        }

        const isSingle = draft.recipients.length === 1;
        setStatusBanner({
          type: "success",
          title: isSingle
            ? "Salary Paid & Digital Payslip Issued"
            : "Payroll Paid & Itemized Payslips Issued",
          message: isSingle
            ? `${draft.currency} ${draft.netSalariesTotal.toLocaleString()} will settle directly into ${draft.recipients[0].instructorName}'s bank account on the next business day. Digital payslip issued (Ref: ${saved.reference}).`
            : `${draft.currency} ${draft.netSalariesTotal.toLocaleString()} in net salaries is scheduled for direct settlement across ${draft.recipients.length} instructor accounts on the next business day, and ${draft.recipients.length} itemized digital payslips are ready (Ref: ${saved.reference}).`,
        });
      },
      onCancel: () => {
        setIsCheckoutPopupActive(false);
        setStatusBanner({
          type: "info",
          title: "Payment Cancelled",
          message: "Payroll checkout was closed before completing payment.",
        });
      },
      onError: (err) => {
        setIsCheckoutPopupActive(false);
        setStatusBanner({
          type: "error",
          title: "Payment Could Not Complete",
          message:
            err?.message ||
            "Payment checkout could not be completed. Please ensure recipient accounts match the active currency and try again.",
        });
      },
    });
  };

  const handleTriggerGroupPay = (group: PayrollSplitGroup) => {
    const activeSubCodes = new Set(
      linkedInstructors
        .map((i) => i.subaccountCode)
        .filter((c): c is string => Boolean(c)),
    );
    const removedMember = group.members.find(
      (m) => !m.subaccountCode || !activeSubCodes.has(m.subaccountCode),
    );
    if (removedMember) {
      setStatusBanner({
        type: "error",
        title: "Outdated Pay Group Member",
        message: `${removedMember.instructorName} disconnected their payout bank account. Remove them or load this group into Run Payroll to rebuild the split.`,
      });
      return;
    }
    if (group.type === "flat") {
      const exactTotal = group.members.reduce(
        (sum, m) => sum + (m.amount || 0),
        0,
      );
      if (exactTotal <= 0) {
        setStatusBanner({
          type: "error",
          title: "Invalid Group Total",
          message:
            "Please add salary amounts for instructors in this group first.",
        });
        return;
      }
      executePaySplitGroup(group, exactTotal);
    } else {
      setGroupTotalPayInput("");
      setPayingGroupModal(group);
    }
  };

  const exportHistoryCsv = () => {
    const rows = [
      [
        "Reference",
        "Date",
        "Mode",
        "Channel",
        "Pay Group",
        "Pay Period",
        "Currency",
        "Net Salaries",
        "Processing Fee",
        "Total Invoice",
        "Recipients",
        "Status",
      ],
      ...orgDisbursements.map((d) => [
        d.reference,
        d.paidAt,
        d.paymentType === "individual" ? "Individual" : "Group Multi-Split",
        d.paymentChannel === "bank_transfer"
          ? "Corporate Bank Transfer"
          : "Online Checkout",
        d.splitGroupName || "",
        d.payPeriod || "",
        d.currency,
        String(
          d.netSalariesTotal ??
            d.recipients.reduce((s, r) => s + r.amount, 0),
        ),
        String(d.platformCut ?? 0),
        String(d.totalAmount),
        d.recipients
          .map(
            (r) =>
              `${r.instructorName} (${r.bankName || "Bank"}: ${r.amount})`,
          )
          .join(" | "),
        d.status,
      ]),
    ];
    const csvContent = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `instructor-payroll-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalDisbursed = orgDisbursements
    .filter((d) => d.status === "success")
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const filteredHistory = orgDisbursements.filter((d) => {
    if (historyFilter === "individual") return d.paymentType === "individual";
    if (historyFilter === "group")
      return d.paymentType === "split_group" || d.paymentType === "batch_split";
    return true;
  });

  const toggleSelectAllLinked = () => {
    if (
      selectedLinkedInstructors.length === linkedInstructors.length &&
      linkedInstructors.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(linkedInstructors.map((i) => i.id));
    }
  };

  const draftComputed = computeBreakdownTotals(
    Number(draftBasicSalary || 0),
    draftAllowances,
    draftDeductions,
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#0078d4]/10 dark:bg-[#04a4ec]/15 text-[#0078d4] dark:text-[#04a4ec]">
              <Banknote className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-heading">
              Instructor Payroll
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set each instructor&apos;s salary &amp; payslip breakdown, select instructors for this run, and settle everyone in one payment.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shrink-0 tabular-nums">
          <span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              {linkedInstructors.length}
            </strong>{" "}
            / {unifiedInstructors.length} Ready
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            <strong className="text-slate-900 dark:text-white">
              {currency} {totalDisbursed.toLocaleString()}
            </strong>{" "}
            Paid Out
          </span>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          className={`rounded-2xl border px-4 py-3.5 flex items-start justify-between gap-3 ${
            statusBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              : statusBanner.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
                : "bg-[#0078d4]/10 border-[#0078d4]/30 text-slate-800 dark:text-slate-200"
          }`}
        >
          <div className="flex items-start space-x-2.5 text-xs">
            {statusBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold">{statusBanner.title}</p>
              <p className="opacity-90 mt-0.5 leading-relaxed">
                {statusBanner.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean 3-Tab Navigation with Clear Purpose Labels */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("run")}
              className={`px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-2 cursor-pointer ${
                activeTab === "run"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>1. Run Payroll</span>
              {selectedLinkedInstructors.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#0078d4] text-white text-[10px] font-bold tabular-nums">
                  {selectedLinkedInstructors.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-2 cursor-pointer ${
                activeTab === "templates"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. Saved Pay Groups ({orgSplitGroups.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={`px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-2 cursor-pointer ${
                activeTab === "records"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>3. History &amp; Payslips ({orgPayslips.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 pb-2 sm:pb-0 hidden md:inline">
            {activeTab === "run"
              ? "Set salaries & breakdowns, select instructors, and settle everyone in 1 transaction"
              : activeTab === "templates"
                ? "Reuse saved salary teams every month with 1 click"
                : "Track completed payroll payments & download itemized PDF payslips"}
          </span>
        </div>

        {/* ============================================================
            TAB 1: RUN PAYROLL (2-Column Instructor Roster + Payroll Batch Summary)
           ============================================================ */}
        {activeTab === "run" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Run Settings Bar */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Pay Period
                </label>
                <input
                  type="text"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="e.g. November 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setCustomFeePerStaff(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 cursor-pointer"
                >
                  {SUPPORTED_PAYROLL_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Receipt Email
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmailOverride(e.target.value)}
                  placeholder="finance@school.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentChannel}
                  onChange={(e) =>
                    setPaymentChannel(
                      e.target.value as "checkout" | "bank_transfer",
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 cursor-pointer"
                >
                  <option value="checkout">Online Checkout (Card / Transfer)</option>
                  <option value="bank_transfer">
                    Corporate Bank Transfer Account
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Processing Fee / Instructor ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={
                    customFeePerStaff !== null
                      ? customFeePerStaff
                      : String(feePerStaff)
                  }
                  onChange={(e) => setCustomFeePerStaff(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 tabular-nums"
                />
              </div>
            </div>

            {/* 2-Column Workspace: Left Instructor Roster | Right Sticky Payroll Batch Summary */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* LEFT: INSTRUCTORS */}
              <div className="xl:col-span-8 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search instructor by name or email..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={toggleSelectAllLinked}
                      disabled={linkedInstructors.length === 0}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      {selectedLinkedInstructors.length > 0 &&
                      selectedLinkedInstructors.length ===
                        linkedInstructors.length
                        ? "Unselect All"
                        : `Select All Ready (${linkedInstructors.length})`}
                    </button>
                  </div>
                </div>

                {filteredInstructors.length === 0 ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No Organization Instructors Found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Invite or assign instructors to your school&apos;s courses.
                      Once each instructor sets up their payout account in
                      their Settings, you can set their salary breakdown and
                      pay them here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-3 w-10">
                            <button
                              type="button"
                              onClick={toggleSelectAllLinked}
                              className="p-1 text-slate-500 hover:text-[#0078d4] cursor-pointer"
                              title="Toggle all ready instructors"
                            >
                              {selectedLinkedInstructors.length > 0 &&
                              selectedLinkedInstructors.length ===
                                linkedInstructors.length ? (
                                <CheckSquare className="w-4 h-4 text-[#0078d4]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-3 px-3">Instructor</th>
                          <th className="py-3 px-3">Payout Readiness</th>
                          <th className="py-3 px-3">
                            Salary &amp; Payslip Breakdown ({currency})
                          </th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-xs">
                        {filteredInstructors.map((inst) => {
                          const isLinked = Boolean(inst.subaccountCode);
                          const isChecked = selectedIds.includes(inst.id);
                          const bd = getInstructorBreakdown(inst);
                          const hasCustomBreakdown = Boolean(
                            salaryBreakdowns[inst.id] &&
                              (salaryBreakdowns[inst.id].allowances.length >
                                0 ||
                                salaryBreakdowns[inst.id].deductions.length >
                                  0),
                          );
                          const isPayingThis =
                            processingKey === `ind_${inst.id}`;

                          return (
                            <tr
                              key={inst.id}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors ${
                                isChecked
                                  ? "bg-[#f0f7fd]/60 dark:bg-[#132838]/50"
                                  : ""
                              }`}
                            >
                              <td className="py-3.5 px-3 align-middle">
                                <input
                                  type="checkbox"
                                  disabled={!isLinked}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIds((prev) => [
                                        ...prev,
                                        inst.id,
                                      ]);
                                    } else {
                                      setSelectedIds((prev) =>
                                        prev.filter((id) => id !== inst.id),
                                      );
                                    }
                                  }}
                                  className="rounded border-slate-300 text-[#0078d4] disabled:opacity-40 cursor-pointer"
                                />
                              </td>

                              <td className="py-3.5 px-3 align-middle">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {inst.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {roleTitles[inst.id] || "Instructor"}
                                  {inst.email ? ` • ${inst.email}` : ""}
                                </div>
                              </td>

                              <td className="py-3.5 px-3 align-middle">
                                {isLinked ? (
                                  <div>
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Ready for Payout</span>
                                    </span>
                                    {(inst.bankName || inst.accountNumber) && (
                                      <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                                        {inst.bankName || "Bank"}
                                        {inst.accountNumber
                                          ? ` • ****${inst.accountNumber.slice(-4)}`
                                          : ""}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>Setup Required</span>
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Instructor adds bank in Settings
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-3 align-middle">
                                <div className="flex items-center space-x-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    disabled={!isLinked || hasCustomBreakdown}
                                    value={
                                      hasCustomBreakdown
                                        ? String(bd.netSalary)
                                        : salaryInputs[inst.id] ?? ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setSalaryInputs((prev) => ({
                                        ...prev,
                                        [inst.id]: val,
                                      }));
                                      if (salaryBreakdowns[inst.id]) {
                                        setSalaryBreakdowns((prev) => {
                                          const copy = { ...prev };
                                          delete copy[inst.id];
                                          return copy;
                                        });
                                      }
                                    }}
                                    placeholder={
                                      isLinked ? "0.00" : "Pending"
                                    }
                                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-60 text-xs font-mono font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                                  />
                                  {isLinked && (
                                    <button
                                      type="button"
                                      onClick={() => openBreakdownModal(inst)}
                                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center space-x-1 cursor-pointer transition ${
                                        hasCustomBreakdown
                                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      }`}
                                      title="Set Basic Salary, Allowances & Deductions for Payslip"
                                    >
                                      <SlidersHorizontal className="w-3 h-3" />
                                      <span>Breakdown</span>
                                    </button>
                                  )}
                                </div>
                                {hasCustomBreakdown && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                                    Base {bd.basicSalary.toLocaleString()}
                                    {bd.totalAllowances > 0
                                      ? ` + Allow ${bd.totalAllowances.toLocaleString()}`
                                      : ""}
                                    {bd.totalDeductions > 0
                                      ? ` - Ded ${bd.totalDeductions.toLocaleString()}`
                                      : ""}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-3 align-middle text-right">
                                {isLinked ? (
                                  <div className="inline-flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isChecked) {
                                          setSelectedIds((prev) =>
                                            prev.filter((id) => id !== inst.id),
                                          );
                                        } else {
                                          setSelectedIds((prev) => [
                                            ...prev,
                                            inst.id,
                                          ]);
                                        }
                                      }}
                                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                        isChecked
                                          ? "border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec]"
                                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      {isChecked ? "Selected ✓" : "+ Select"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={processingKey !== null}
                                      onClick={() => handlePayIndividual(inst)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 text-white text-[11px] font-semibold transition inline-flex items-center space-x-1 cursor-pointer"
                                      title="Pay just this instructor now"
                                    >
                                      {isPayingThis ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <ArrowRight className="w-3 h-3" />
                                      )}
                                      <span>Pay</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Waiting on setup
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* RIGHT: STICKY PAYROLL BATCH SUMMARY */}
              <div className="xl:col-span-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 xl:sticky xl:top-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                      Payroll Batch Summary
                    </h2>
                  </div>
                  {selectedLinkedInstructors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {selectedLinkedInstructors.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Banknote className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No instructors selected yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Enter salaries or click <strong>Breakdown</strong> on the
                      left, then select 1 or more instructors to pay them
                      together in a single salary payment.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedLinkedInstructors.map((inst) => {
                        const bd = getInstructorBreakdown(inst);
                        const hasCustom =
                          bd.allowances.length > 0 || bd.deductions.length > 0;
                        return (
                          <div
                            key={inst.id}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {inst.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {hasCustom
                                  ? `Base ${bd.basicSalary.toLocaleString()} + ${bd.totalAllowances.toLocaleString()} allow - ${bd.totalDeductions.toLocaleString()} ded`
                                  : roleTitles[inst.id] || "Instructor"}
                              </p>
                              <button
                                type="button"
                                onClick={() => openBreakdownModal(inst)}
                                className="text-[10px] font-semibold text-[#0078d4] dark:text-[#04a4ec] hover:underline mt-0.5 cursor-pointer"
                              >
                                Edit payslip breakdown
                              </button>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  bd.netSalary > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600"
                                }`}
                              >
                                {currency} {bd.netSalary.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedIds((prev) =>
                                    prev.filter((id) => id !== inst.id),
                                  )
                                }
                                className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Remove from payroll batch"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Optional memo for this payroll run..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    {selectedLinkedInstructors.length >= 2 && (
                      <div className="space-y-2 pt-1">
                        <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveBatchAsGroup}
                            onChange={(e) =>
                              setSaveBatchAsGroup(e.target.checked)
                            }
                            className="rounded border-slate-300 text-[#0078d4]"
                          />
                          <span>Save this team as a Reusable Pay Group</span>
                        </label>
                        {saveBatchAsGroup && (
                          <input
                            type="text"
                            value={batchGroupName}
                            onChange={(e) => setBatchGroupName(e.target.value)}
                            placeholder="Group name (e.g. Science Faculty)"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          />
                        )}
                      </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>
                          Instructor Net Salaries (
                          {selectedLinkedInstructors.length})
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {currency} {batchTotalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>
                          Processing Fee ({selectedLinkedInstructors.length} ×{" "}
                          {currency} {feePerStaff.toLocaleString()})
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {currency} {batchProcessingFee.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
                        <span>Total Payroll Payment</span>
                        <span className="font-mono text-[#0078d4] dark:text-[#04a4ec] tabular-nums">
                          {currency} {batchGrandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        processingKey !== null || batchTotalAmount <= 0
                      }
                      onClick={handlePayBatchInOneTransaction}
                      className="w-full py-3 px-4 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                    >
                      {processingKey === "batch" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : paymentChannel === "bank_transfer" ? (
                        <Landmark className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span>
                        {paymentChannel === "bank_transfer"
                          ? `Get Bank Transfer Account (${currency} ${batchGrandTotal.toLocaleString()})`
                          : `Pay ${selectedLinkedInstructors.length} Instructor${selectedLinkedInstructors.length > 1 ? "s" : ""} (${currency} ${batchGrandTotal.toLocaleString()})`}
                      </span>
                    </button>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                      One lump-sum payment automatically splits each
                      instructor&apos;s exact salary to their bank account and
                      issues itemized PDF payslips.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: SAVED PAY GROUPS
           ============================================================ */}
        {activeTab === "templates" && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Saved Pay Groups
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Save recurring instructor teams so you can pay the whole team
                  in 1 click, or load them into Run Payroll to tweak monthly
                  bonuses and deductions.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateGroupModal}
                disabled={linkedInstructors.length < 2}
                className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition inline-flex items-center space-x-1.5 cursor-pointer self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Create Pay Group</span>
              </button>
            </div>

            {orgSplitGroups.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Saved Pay Groups Yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Group 2 or more ready instructors (like a department) to
                    pay everyone together every month without re-selecting
                    them.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={linkedInstructors.length < 2}
                  onClick={openCreateGroupModal}
                  className="inline-flex items-center px-4 py-2 bg-[#0078d4] disabled:opacity-50 text-white rounded-xl text-xs font-bold space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Pay Group</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgSplitGroups.map((group) => {
                  const flatTotal =
                    group.type === "flat"
                      ? group.members.reduce(
                          (sum, m) => sum + (m.amount || 0),
                          0,
                        )
                      : undefined;
                  const isPaying = processingKey === `grp_${group.id}`;

                  return (
                    <div
                      key={group.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {group.name}
                            </h3>
                            <p className="text-[11px] text-[#0078d4] dark:text-[#04a4ec] font-semibold mt-0.5 tabular-nums">
                              {group.type === "flat"
                                ? "Fixed Salaries"
                                : "Percentage Pool Split"}{" "}
                              • {group.currency} • {group.members.length}{" "}
                              Instructors
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteGroup({
                                id: group.id,
                                label: group.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                            title="Delete Pay Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70 border-y border-slate-200/70 dark:border-slate-700/70">
                          {group.members.map((m) => (
                            <div
                              key={m.instructorId + m.subaccountCode}
                              className="py-2 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                                  {m.instructorName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {m.roleTitle || "Instructor"}
                                  {m.bankName ? ` • ${m.bankName}` : ""}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                                {group.type === "flat"
                                  ? `${group.currency} ${m.amount.toLocaleString()}`
                                  : `${m.sharePercentage}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleLoadGroupIntoRun(group)}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                        >
                          Load &amp; Adjust
                        </button>
                        <button
                          type="button"
                          disabled={processingKey !== null}
                          onClick={() => handleTriggerGroupPay(group)}
                          className="py-2.5 px-3 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                        >
                          {isPaying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate">
                            {group.type === "flat" && flatTotal !== undefined
                              ? `Pay (${group.currency} ${flatTotal.toLocaleString()})`
                              : "Pay Pool Now"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: HISTORY & DIGITAL PAYSLIPS
           ============================================================ */}
        {activeTab === "records" && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Sub-View Switch: Payroll Payments | Itemized Payslips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start">
                <button
                  type="button"
                  onClick={() => setRecordsView("payments")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    recordsView === "payments"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Payroll Payments ({orgDisbursements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecordsView("payslips")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    recordsView === "payslips"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Itemized Payslips ({orgPayslips.length})
                </button>
              </div>

              {recordsView === "payments" && orgDisbursements.length > 0 && (
                <button
                  type="button"
                  onClick={exportHistoryCsv}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center space-x-1.5 cursor-pointer self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {recordsView === "payments" ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {(["all", "individual", "group"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        historyFilter === f
                          ? "bg-[#0078d4] text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {f === "all"
                        ? "All Payments"
                        : f === "individual"
                          ? "Single Instructor"
                          : "Multi-Instructor Splits"}
                    </button>
                  ))}
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    No salary payments recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-3">Date &amp; Ref</th>
                          <th className="py-3 px-3">Method &amp; Status</th>
                          <th className="py-3 px-3">Recipients</th>
                          <th className="py-3 px-3">Processing Fee</th>
                          <th className="py-3 px-3 text-right">Total Paid</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-xs">
                        {filteredHistory.map((d) => (
                          <tr
                            key={d.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                          >
                            <td className="py-3 px-3 align-middle">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {new Date(
                                  d.paidAt || d.createdAt,
                                ).toLocaleDateString()}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {d.reference}
                              </div>
                              {d.payPeriod && (
                                <div className="text-[11px] text-slate-500">
                                  {d.payPeriod}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 align-middle space-y-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                  d.paymentType === "individual"
                                    ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                    : "bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec]"
                                }`}
                              >
                                {d.paymentChannel === "bank_transfer"
                                  ? "Bank Transfer"
                                  : d.paymentType === "individual"
                                    ? "Single Payment"
                                    : d.splitGroupName
                                      ? d.splitGroupName
                                      : "Batch Salary Split"}
                              </span>
                              <div>
                                {d.status === "success" ? (
                                  <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Confirmed</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Awaiting Transfer</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-middle">
                              <div className="space-y-0.5">
                                {d.recipients.map((r, idx) => (
                                  <div
                                    key={r.instructorId + idx}
                                    className="text-slate-700 dark:text-slate-200"
                                  >
                                    <strong>{r.instructorName}</strong>:{" "}
                                    {d.currency} {r.amount.toLocaleString()}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 align-middle font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                              {d.currency} {(d.platformCut || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 align-middle text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                              {d.currency} {d.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 align-middle text-right">
                              {d.status !== "success" && d.dedicatedAccount ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTransferModalDisbursement(d)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-bold cursor-pointer"
                                >
                                  Transfer Info / Verify
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayslipSearch(d.reference);
                                    setRecordsView("payslips");
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                                >
                                  Payslips ({d.recipients.length})
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ITEMIZED DIGITAL PAYSLIPS ARCHIVE */
              (() => {
                const q = payslipSearch.trim().toLowerCase();
                const visibleSlips = orgPayslips.filter(
                  (p) =>
                    !q ||
                    p.instructorName.toLowerCase().includes(q) ||
                    p.payslipNumber.toLowerCase().includes(q) ||
                    p.reference.toLowerCase().includes(q) ||
                    (p.payPeriod || "").toLowerCase().includes(q),
                );
                return (
                  <div className="space-y-4">
                    <div className="relative max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={payslipSearch}
                        onChange={(e) => setPayslipSearch(e.target.value)}
                        placeholder="Search by instructor, pay period, or ref..."
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                      />
                    </div>

                    {visibleSlips.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                        Digital payslips appear here automatically once a salary
                        payment is confirmed.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <th className="py-3 px-3">Payslip No</th>
                              <th className="py-3 px-3">Instructor &amp; Role</th>
                              <th className="py-3 px-3">Pay Period</th>
                              <th className="py-3 px-3">Earnings / Deductions</th>
                              <th className="py-3 px-3 text-right">Net Paid</th>
                              <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-xs">
                            {visibleSlips.map((slip) => {
                              const bd =
                                slip.breakdown ||
                                computeBreakdownTotals(slip.netSalary, [], []);
                              return (
                                <tr
                                  key={slip.id}
                                  className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                                >
                                  <td className="py-3 px-3 align-middle font-mono font-semibold text-[#0078d4] dark:text-[#04a4ec]">
                                    <div>{slip.payslipNumber}</div>
                                    <div className="text-[10px] text-slate-400 font-sans">
                                      {new Date(
                                        slip.paidAt,
                                      ).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 align-middle">
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {slip.instructorName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {slip.roleTitle || "Instructor"}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 align-middle text-slate-700 dark:text-slate-300">
                                    {slip.payPeriod || "Salary Run"}
                                  </td>
                                  <td className="py-3 px-3 align-middle text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                                    <div>
                                      Gross: {slip.currency}{" "}
                                      {bd.grossSalary.toLocaleString()}
                                    </div>
                                    {bd.totalDeductions > 0 && (
                                      <div className="text-rose-600 dark:text-rose-400">
                                        Ded: -{slip.currency}{" "}
                                        {bd.totalDeductions.toLocaleString()}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 align-middle text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {slip.currency}{" "}
                                    {slip.netSalary.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 align-middle text-right">
                                    <div className="inline-flex items-center space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewPayslip(slip)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadPayslipPdf(slip)}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#0078d4] hover:bg-[#006cbd] text-white font-semibold inline-flex items-center space-x-1 cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>PDF</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL 1: SALARY & PAYSLIP BREAKDOWN EDITOR
         ============================================================ */}
      {breakdownModalInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Salary &amp; Payslip Breakdown — {breakdownModalInst.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set base salary, allowances, and deductions. The net pay is
                  sent straight to the instructor&apos;s bank account and shown
                  on their digital payslip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBreakdownModalInst(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {breakdownError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {breakdownError}
              </div>
            )}

            <form onSubmit={handleSaveBreakdown} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Title on Payslip
                  </label>
                  <input
                    type="text"
                    value={draftRoleTitle}
                    onChange={(e) => setDraftRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Mathematics Instructor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Basic Salary ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={draftBasicSalary}
                    onChange={(e) => setDraftBasicSalary(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Earnings / Allowances */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Allowances &amp; Bonuses
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftAllowances((prev) => [
                        ...prev,
                        { id: generateId("alw"), label: "", amount: 0 },
                      ])
                    }
                    className="text-[11px] font-semibold text-[#0078d4] dark:text-[#04a4ec] hover:underline inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Allowance</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALLOWANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setDraftAllowances((prev) => [
                          ...prev,
                          { id: generateId("alw"), label: preset, amount: 0 },
                        ])
                      }
                      className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {draftAllowances.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        setDraftAllowances((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, label: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Allowance label"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.amount || ""}
                      onChange={(e) =>
                        setDraftAllowances((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, amount: Number(e.target.value || 0) }
                              : row,
                          ),
                        )
                      }
                      placeholder="Amount"
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-slate-900 dark:text-white tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAllowances((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Deductions (Tax, Pension, etc.)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftDeductions((prev) => [
                        ...prev,
                        { id: generateId("ded"), label: "", amount: 0 },
                      ])
                    }
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Deduction</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {DEDUCTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setDraftDeductions((prev) => [
                          ...prev,
                          { id: generateId("ded"), label: preset, amount: 0 },
                        ])
                      }
                      className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {draftDeductions.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        setDraftDeductions((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, label: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Deduction label"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.amount || ""}
                      onChange={(e) =>
                        setDraftDeductions((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, amount: Number(e.target.value || 0) }
                              : row,
                          ),
                        )
                      }
                      placeholder="Amount"
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-slate-900 dark:text-white tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftDeductions((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live Calculated Summary */}
              <div className="bg-[#f0f7fd] dark:bg-[#132838] border border-[#b8daf4] dark:border-[#254b68] rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>Gross Earnings (Basic + Allowances)</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {currency} {draftComputed.grossSalary.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-rose-600 dark:text-rose-400">
                  <span>Total Deductions</span>
                  <span className="font-mono font-semibold tabular-nums">
                    -{currency} {draftComputed.totalDeductions.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#b8daf4]/70 dark:border-[#254b68] text-sm font-bold text-slate-900 dark:text-white">
                  <span>Net Take-Home Salary (Sent to Bank)</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {currency} {draftComputed.netSalary.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBreakdownModalInst(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer"
                >
                  Save Breakdown &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: CREATE SAVED PAY GROUP
         ============================================================ */}
      {createGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Create Saved Pay Group
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Save a recurring team of instructors so you can pay everyone
                  together in a single transaction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateGroupModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {groupFormError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {groupFormError}
              </div>
            )}

            <form
              onSubmit={handleCreateSplitGroup}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Monthly STEM Faculty"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Salary Type
                  </label>
                  <select
                    value={newGroupType}
                    onChange={(e) =>
                      setNewGroupType(e.target.value as "flat" | "percentage")
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="flat">Fixed Salaries ({currency})</option>
                    <option value="percentage">
                      Percentage Pool (Adds up to 100%)
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Select Instructors &amp;{" "}
                  {newGroupType === "flat"
                    ? `Salary (${currency})`
                    : "Share (%)"}
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 max-h-56 overflow-y-auto">
                  {linkedInstructors.map((inst) => {
                    const entry = groupMemberShares[inst.id] || {
                      included: false,
                      value: "",
                    };
                    return (
                      <div
                        key={inst.id}
                        className="px-3 py-2.5 flex items-center justify-between gap-3"
                      >
                        <label className="flex items-center space-x-2.5 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.included}
                            onChange={(e) =>
                              setGroupMemberShares((prev) => ({
                                ...prev,
                                [inst.id]: {
                                  included: e.target.checked,
                                  value: prev[inst.id]?.value || "",
                                },
                              }))
                            }
                            className="rounded border-slate-300 text-[#0078d4]"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {inst.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {inst.bankName || "Ready Payout Account"}
                            </span>
                          </div>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={!entry.included}
                          value={entry.value}
                          onChange={(e) =>
                            setGroupMemberShares((prev) => ({
                              ...prev,
                              [inst.id]: {
                                included: true,
                                value: e.target.value,
                              },
                            }))
                          }
                          placeholder={newGroupType === "flat" ? "Amount" : "%"}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-slate-900 dark:text-white disabled:opacity-40"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCreateGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  {creatingGroup && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Save Pay Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: ENTER POOL AMOUNT FOR PERCENTAGE PAY GROUP
         ============================================================ */}
      {payingGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Pay Group: {payingGroupModal.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the total {payingGroupModal.currency} salary pool to divide
              automatically across {payingGroupModal.members.length} instructors.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Salary Pool ({payingGroupModal.currency})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={groupTotalPayInput}
                onChange={(e) => setGroupTotalPayInput(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingGroupModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Number(groupTotalPayInput) <= 0}
                onClick={() =>
                  executePaySplitGroup(
                    payingGroupModal,
                    Number(groupTotalPayInput),
                  )
                }
                className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: CONFIRM DELETE SAVED GROUP
         ============================================================ */}
      {confirmDeleteGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Remove Saved Pay Group
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Remove <strong>{confirmDeleteGroup.label}</strong> from saved pay
              groups?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteGroup(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deletePayrollSplitGroup(confirmDeleteGroup.id);
                  setConfirmDeleteGroup(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 5: CORPORATE BANK TRANSFER INVOICE (DEDICATED ACCOUNT)
         ============================================================ */}
      {transferModalDisbursement?.dedicatedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec]">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                    Corporate Bank Transfer
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transfer the exact payroll total from your school banking
                    app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalDisbursement(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#f0f7fd] dark:bg-[#132838] border border-[#b8daf4] dark:border-[#254b68] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">
                  Bank Name
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {transferModalDisbursement.dedicatedAccount.bankName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">
                  Account Number
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-[#0078d4] dark:text-[#04a4ec] tabular-nums">
                    {transferModalDisbursement.dedicatedAccount.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        transferModalDisbursement.dedicatedAccount!
                          .accountNumber,
                      );
                      setCopiedField("acct");
                      window.setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="Copy account number"
                  >
                    {copiedField === "acct" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-300">
                  Account Name
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {transferModalDisbursement.dedicatedAccount.accountName}
                </span>
              </div>
              <div className="pt-2 border-t border-[#b8daf4]/70 dark:border-[#254b68] space-y-1">
                {transferModalDisbursement.netSalariesTotal !== undefined && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-300">
                      Instructor Net Salaries (
                      {transferModalDisbursement.recipients.length})
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {transferModalDisbursement.currency}{" "}
                      {transferModalDisbursement.netSalariesTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                {transferModalDisbursement.platformCut > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-300">
                      Payroll Processing Fee
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {transferModalDisbursement.currency}{" "}
                      {transferModalDisbursement.platformCut.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Exact Amount to Transfer
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {transferModalDisbursement.currency}{" "}
                      {transferModalDisbursement.totalAmount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          String(transferModalDisbursement.totalAmount),
                        );
                        setCopiedField("amt");
                        window.setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Copy exact amount"
                    >
                      {copiedField === "amt" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Once your bank transfer is received, salaries settle directly into
              each instructor&apos;s bank account on the next business day and
              itemized digital payslips are generated automatically.
            </p>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTransferModalDisbursement(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Check Later
              </button>
              <button
                type="button"
                disabled={verifyingTransfer}
                onClick={() =>
                  verifyPendingTransferDisbursement(
                    transferModalDisbursement,
                    false,
                  )
                }
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {verifyingTransfer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>
                  {verifyingTransfer
                    ? "Checking Transfer..."
                    : "I've Sent the Transfer — Verify"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ITEMIZED DIGITAL PAYSLIP PREVIEW & PDF DOWNLOAD */}
      {previewPayslip && (
        <PayslipPreviewModal
          slip={previewPayslip}
          onClose={() => setPreviewPayslip(null)}
          onDownload={() => downloadPayslipPdf(previewPayslip)}
        />
      )}

      {/* MODAL 7: TUITION-STYLE PAYROLL CHECKOUT REVIEW MODAL */}
      {payrollCheckoutDraft && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl max-h-[92vh]">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                    Complete Payroll Payment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {payrollCheckoutDraft.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCheckoutPopupActive}
                onClick={() => setPayrollCheckoutDraft(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 text-sm overflow-y-auto">
              {/* Automated Split Breakdown Card (mirrors CoursePaymentModal) */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold block">
                      Total Due Now
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                      {payrollCheckoutDraft.currency}{" "}
                      {formatPriceWithDecimals(payrollCheckoutDraft.grandTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold flex items-center justify-end">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Secure Split
                      Gateway
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Powered by Secure Gateway
                    </span>
                  </div>
                </div>

                {/* Split Allocation Breakdown */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span className="flex items-center text-[11px]">
                      <Banknote className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      Direct to {payrollCheckoutDraft.recipients.length}{" "}
                      Instructor
                      {payrollCheckoutDraft.recipients.length === 1 ? "" : "s"}{" "}
                      (100% Net Salary):
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {payrollCheckoutDraft.currency}{" "}
                      {formatPriceWithDecimals(
                        payrollCheckoutDraft.netSalariesTotal,
                      )}
                    </span>
                  </div>

                  {payrollCheckoutDraft.platformFee > 0 && (
                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span>Platform Payroll Processing Fee:</span>
                      <span className="tabular-nums">
                        {payrollCheckoutDraft.currency}{" "}
                        {formatPriceWithDecimals(
                          payrollCheckoutDraft.platformFee,
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10.5px] text-slate-500 dark:text-slate-400">
                    <span>Settlement Routing:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Direct Bank Split (Zero Platform Custody)
                    </span>
                  </div>

                  {/* Recipient list */}
                  <div className="pt-2 space-y-1 max-h-32 overflow-y-auto">
                    {payrollCheckoutDraft.recipients.map((r) => (
                      <div
                        key={r.instructorId}
                        className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-900/70 rounded-lg px-2.5 py-1.5 border border-slate-200/70 dark:border-slate-700/70"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {r.instructorName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.bankName || "Connected Bank"} •{" "}
                            {r.accountNumber || "Verified"}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                          {payrollCheckoutDraft.currency}{" "}
                          {formatPriceWithDecimals(r.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Consumer Protection & Cost Transparency Disclosure */}
              <CheckoutDisclosure
                amount={payrollCheckoutDraft.grandTotal}
                currency={payrollCheckoutDraft.currency}
                itemTitle={payrollCheckoutDraft.title}
                baseAmount={payrollCheckoutDraft.netSalariesTotal}
                feeAmount={payrollCheckoutDraft.platformFee}
                feeLabel="Payroll Processing Addition"
                providerName={myOrg?.name || currentUser.name}
                transactionType="payroll"
                isAcknowledged={isPayrollDisclosureAcknowledged}
                onAcknowledgeChange={setIsPayrollDisclosureAcknowledged}
              />
            </div>

            <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2 shrink-0">
              {!isPayrollDisclosureAcknowledged && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium">
                  Please review and check the disclosure box above to proceed
                  with payment.
                </p>
              )}
              <button
                type="button"
                disabled={
                  isCheckoutPopupActive || !isPayrollDisclosureAcknowledged
                }
                onClick={handleConfirmPayrollCheckout}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCheckoutPopupActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                <span>
                  {isCheckoutPopupActive
                    ? "Completing Payment..."
                    : `Pay ${payrollCheckoutDraft.currency} ${formatPriceWithDecimals(payrollCheckoutDraft.grandTotal)} Now`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Itemized Digital Payslip Modal (Organization & Instructor)
const PayslipPreviewModal: React.FC<{
  slip: PayrollPayslip;
  onClose: () => void;
  onDownload: () => void;
}> = ({ slip, onClose, onDownload }) => {
  const bd =
    slip.breakdown || computeBreakdownTotals(slip.netSalary, [], []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <p className="text-[11px] font-mono font-bold text-[#0078d4] dark:text-[#04a4ec]">
              {slip.payslipNumber}
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              {slip.organizationName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-500">Instructor</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {slip.instructorName}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-500">Role / Title</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {slip.roleTitle || "Instructor"}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-500">Pay Period</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {slip.payPeriod || "Salary Run"}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-500">Destination Bank</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {slip.bankName || "Connected Bank"}{" "}
              {slip.accountNumberMasked || ""}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Payment Reference</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">
              {slip.reference}
            </span>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-1.5 text-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Earnings
          </p>
          <div className="flex justify-between text-slate-700 dark:text-slate-200">
            <span>Basic Salary</span>
            <span className="font-mono font-semibold tabular-nums">
              {slip.currency} {bd.basicSalary.toLocaleString()}
            </span>
          </div>
          {bd.allowances.map((a) => (
            <div
              key={a.id}
              className="flex justify-between text-emerald-700 dark:text-emerald-300"
            >
              <span>{a.label}</span>
              <span className="font-mono font-semibold tabular-nums">
                +{slip.currency} {a.amount.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            <span>Gross Earnings</span>
            <span className="font-mono tabular-nums">
              {slip.currency} {bd.grossSalary.toLocaleString()}
            </span>
          </div>

          {/* Deductions */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2">
            Deductions
          </p>
          {bd.deductions.length === 0 ? (
            <div className="flex justify-between text-slate-400">
              <span>No deductions</span>
              <span className="font-mono">{slip.currency} 0</span>
            </div>
          ) : (
            bd.deductions.map((d) => (
              <div
                key={d.id}
                className="flex justify-between text-rose-600 dark:text-rose-400"
              >
                <span>{d.label}</span>
                <span className="font-mono font-semibold tabular-nums">
                  -{slip.currency} {d.amount.toLocaleString()}
                </span>
              </div>
            ))
          )}
          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            <span>Total Deductions</span>
            <span className="font-mono tabular-nums">
              -{slip.currency} {bd.totalDeductions.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-[#f0f7fd] dark:bg-[#132838] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] block">
              Net Salary Settled
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {slip.settlementSchedule}
            </span>
          </div>
          <span className="text-lg font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            {slip.currency} {slip.netSalary.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="w-full py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Itemized PDF Payslip</span>
        </button>
      </div>
    </div>
  );
};

export default PayrollPage;
