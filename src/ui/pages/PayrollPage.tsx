import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  Building2,
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
  Edit3,
  X,
  ArrowRight,
  Receipt,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";
import {
  InstructorPayrollRecipient,
  PayrollDisbursement,
  PayrollSplitGroup,
  PayrollSplitMember,
} from "../../types";
import {
  createPayrollSplitGroup,
  createSubaccount,
  initializePayrollTransaction,
  resolveBankAccount,
  verifyTransaction,
} from "../../lib/paystackGateway";
import { triggerPayrollPaystackCheckout } from "../../lib/paystack";
import {
  fetchAllWorldwideBanks,
  getCountryAccountSpec,
  PAYSTACK_SUPPORTED_COUNTRIES,
  PaystackBankRecord,
  WORLDWIDE_BANKS_CACHE,
} from "../../lib/paystackBanks";
import { generateId } from "../../lib/id";

interface UnifiedPayrollInstructor {
  id: string;
  recipientRecordId?: string;
  name: string;
  email: string;
  roleTitle: string;
  source: "online" | "offline";
  courseTitles: string[];
  subaccountCode?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  defaultSalary?: number;
  currency: string;
}

const SUPPORTED_PAYROLL_CURRENCIES = ["NGN", "GHS", "KES", "ZAR", "USD"];

export const PayrollPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    organizations,
    courses,
    orgMembers,
    schoolOfflineMembers,
    allUsers,
    payrollRecipients,
    payrollSplitGroups,
    payrollDisbursements,
    savePayrollRecipient,
    removePayrollRecipient,
    savePayrollSplitGroup,
    deletePayrollSplitGroup,
    recordPayrollDisbursement,
  } = useAppContext();

  const isAuthorized =
    currentUser?.role === "organization" ||
    currentUser?.role === "org_admin" ||
    currentUser?.role === "super_admin" ||
    currentUser?.email?.toLowerCase() === "ekenehq@gmail.com";

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

  const orgId = myOrg?.id || myOrg?.ownerId || currentUser?.orgId || currentUser?.id || "";

  // Workspace Tabs & Controls
  const [activeTab, setActiveTab] = useState<"roster" | "splits" | "history">("roster");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "individual" | "group">("all");
  const [currency, setCurrency] = useState<string>(() => {
    const base = myOrg?.baseCurrency?.toUpperCase() || "NGN";
    return SUPPORTED_PAYROLL_CURRENCIES.includes(base) ? base : "NGN";
  });
  const [payerEmailOverride, setPayerEmailOverride] = useState<string | null>(null);
  const payerEmail = payerEmailOverride ?? currentUser?.email ?? "";
  const [payPeriod, setPayPeriod] = useState<string>(() =>
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  );
  const [paymentNote, setPaymentNote] = useState<string>("");

  // Per-row salary edits and batch selection
  const [salaryInputs, setSalaryInputs] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveBatchAsGroup, setSaveBatchAsGroup] = useState<boolean>(false);
  const [batchGroupName, setBatchGroupName] = useState<string>("");

  // Feedback alerts
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  // Add/Connect Instructor Subaccount Modal
  const [subaccountModalOpen, setSubaccountModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<UnifiedPayrollInstructor | null>(null);
  const [formInstructorName, setFormInstructorName] = useState("");
  const [formInstructorEmail, setFormInstructorEmail] = useState("");
  const [formRoleTitle, setFormRoleTitle] = useState("Instructor");
  const [formDefaultSalary, setFormDefaultSalary] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [banks, setBanks] = useState<PaystackBankRecord[]>(WORLDWIDE_BANKS_CACHE);
  const [bankSearch, setBankSearch] = useState("");
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [selectedBankName, setSelectedBankName] = useState("");
  const [selectedBankCountry, setSelectedBankCountry] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvingBank, setResolvingBank] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState("");
  const [bankFormError, setBankFormError] = useState("");
  const [savingSubaccount, setSavingSubaccount] = useState(false);

  // Create Split Group Modal
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<"flat" | "percentage">("flat");
  const [newGroupBearer, setNewGroupBearer] = useState<"all-proportional" | "all" | "subaccount">(
    "all-proportional",
  );
  const [newGroupBearerSubaccount, setNewGroupBearerSubaccount] = useState("");
  const [groupMemberShares, setGroupMemberShares] = useState<Record<string, { included: boolean; value: string }>>({});
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupFormError, setGroupFormError] = useState("");

  // Percentage Split Group Pay Modal
  const [payingGroupModal, setPayingGroupModal] = useState<PayrollSplitGroup | null>(null);
  const [groupTotalPayInput, setGroupTotalPayInput] = useState("");

  // Confirmation modal (avoid window.confirm)
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "recipient" | "group";
    id: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAllWorldwideBanks("all")
      .then((list) => {
        if (mounted && list.length > 0) setBanks(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Build unified list of organization instructors & saved payroll recipients
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
      (c) => orgIdVariants.has(c.orgId) || (currentUser.role === "organization" && c.createdBy === currentUser.id),
    );

    const map = new Map<string, UnifiedPayrollInstructor>();

    const orgSavedRecipients = payrollRecipients.filter(
      (r) => !r.orgId || orgIdVariants.has(r.orgId),
    );

    const findUserMatch = (id?: string, email?: string, name?: string) =>
      allUsers.find(
        (u) =>
          u.role !== "super_admin" &&
          u.email?.toLowerCase() !== "ekenehq@gmail.com" &&
          ((id && u.id === id) ||
            (email && u.email?.toLowerCase() === email.toLowerCase()) ||
            (name && u.name?.toLowerCase().trim() === name.toLowerCase().trim())),
      );

    const findSavedRecipient = (id?: string, email?: string, name?: string) =>
      orgSavedRecipients.find(
        (r) =>
          (id && (r.instructorId === id || r.id === id)) ||
          (email && r.instructorEmail?.toLowerCase() === email.toLowerCase()) ||
          (name && r.instructorName.toLowerCase().trim() === name.toLowerCase().trim()),
      );

    const upsertInstructor = (params: {
      id: string;
      name: string;
      email?: string;
      roleTitle?: string;
      source: "online" | "offline";
      courseTitle?: string;
    }) => {
      const normEmail = (params.email || "").trim().toLowerCase();
      if (normEmail === "ekenehq@gmail.com") return;
      const existingKey =
        Array.from(map.keys()).find((k) => {
          const entry = map.get(k);
          if (!entry) return false;
          return (
            entry.id === params.id ||
            (normEmail && entry.email.toLowerCase() === normEmail)
          );
        }) || params.id;

      const existing = map.get(existingKey);
      const userMatch = findUserMatch(params.id, params.email, params.name);
      const savedMatch = findSavedRecipient(params.id, params.email, params.name);

      const effectiveId = savedMatch?.instructorId || userMatch?.id || existing?.id || params.id;
      const effectiveSubaccount =
        savedMatch?.subaccountCode ||
        userMatch?.paystackSubaccount?.subaccount_code ||
        existing?.subaccountCode;

      const courseTitles = new Set(existing?.courseTitles || []);
      if (params.courseTitle) courseTitles.add(params.courseTitle);

      map.set(existingKey, {
        id: effectiveId,
        recipientRecordId: savedMatch?.id || existing?.recipientRecordId,
        name: savedMatch?.instructorName || params.name || userMatch?.name || "Instructor",
        email: savedMatch?.instructorEmail || params.email || userMatch?.email || existing?.email || "",
        roleTitle: savedMatch?.roleTitle || params.roleTitle || existing?.roleTitle || "Instructor",
        source: existing?.source || params.source,
        courseTitles: Array.from(courseTitles),
        subaccountCode: effectiveSubaccount,
        bankCode: savedMatch?.bankCode || userMatch?.paystackSubaccount?.bank_code || existing?.bankCode,
        bankName: savedMatch?.bankName || userMatch?.paystackSubaccount?.bank_name || existing?.bankName,
        accountNumber:
          savedMatch?.accountNumber || userMatch?.paystackSubaccount?.account_number || existing?.accountNumber,
        accountName:
          savedMatch?.accountName || userMatch?.paystackSubaccount?.account_name || existing?.accountName,
        defaultSalary: savedMatch?.defaultSalary ?? existing?.defaultSalary,
        currency: savedMatch?.currency || userMatch?.paystackSubaccount?.currency || currency,
      });
    };

    // 1. Saved organization payroll recipients
    orgSavedRecipients.forEach((rec) => {
      upsertInstructor({
        id: rec.instructorId || rec.id,
        name: rec.instructorName,
        email: rec.instructorEmail,
        roleTitle: rec.roleTitle || "Salaried Instructor",
        source: rec.source || "online",
      });
    });

    // 2. Organization members with instructor role
    orgMembers
      .filter((m) => orgIdVariants.has(m.orgId) && m.role === "instructor")
      .forEach((m) => {
        upsertInstructor({
          id: m.userId || m.id,
          name: m.name,
          email: m.email,
          roleTitle: "Org Instructor",
          source: "online",
        });
      });

    // 3. Instructors assigned directly to org courses
    orgCourses.forEach((course) => {
      if (course.instructorId) {
        const u = findUserMatch(course.instructorId, undefined, course.instructorName);
        upsertInstructor({
          id: u?.id || course.instructorId,
          name: u?.name || course.instructorName || "Course Instructor",
          email: u?.email || "",
          roleTitle: "Course Instructor",
          source: "online",
          courseTitle: course.title,
        });
      }
      if (Array.isArray(course.instructors)) {
        course.instructors.forEach((instId) => {
          const u = findUserMatch(instId);
          const m = orgMembers.find((om) => om.userId === instId || om.id === instId);
          upsertInstructor({
            id: u?.id || m?.userId || instId,
            name: u?.name || m?.name || "Assigned Instructor",
            email: u?.email || m?.email || "",
            roleTitle: "Course Instructor",
            source: "online",
            courseTitle: course.title,
          });
        });
      }
    });

    // 4. Offline school teachers added/imported in School Attendance
    schoolOfflineMembers
      .filter((m) => orgIdVariants.has(m.orgId) && m.role === "teacher")
      .forEach((t) => {
        upsertInstructor({
          id: t.id,
          name: t.name,
          email: t.email,
          roleTitle: t.department || "Campus Teacher",
          source: "offline",
        });
      });

    return Array.from(map.values()).sort((a, b) => {
      if (Boolean(a.subaccountCode) !== Boolean(b.subaccountCode)) {
        return a.subaccountCode ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    currentUser,
    orgId,
    myOrg,
    courses,
    orgMembers,
    schoolOfflineMembers,
    allUsers,
    payrollRecipients,
    currency,
  ]);

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
    return payrollSplitGroups.filter((g) => !g.orgId || orgIdVariants.has(g.orgId));
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
    return payrollDisbursements.filter((d) => !d.orgId || orgIdVariants.has(d.orgId));
  }, [payrollDisbursements, orgId, myOrg, currentUser]);

  if (!currentUser || !isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
          Organization Payroll Access Required
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Only organizations and authorized school administrators can manage instructor salary payouts and payroll groups.
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

  const getSalaryAmount = (inst: UnifiedPayrollInstructor): number => {
    const raw = salaryInputs[inst.id];
    if (raw !== undefined) {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return inst.defaultSalary && inst.defaultSalary > 0 ? inst.defaultSalary : 0;
  };

  const filteredInstructors = unifiedInstructors.filter((inst) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      inst.name.toLowerCase().includes(q) ||
      inst.email.toLowerCase().includes(q) ||
      (inst.subaccountCode || "").toLowerCase().includes(q) ||
      (inst.bankName || "").toLowerCase().includes(q)
    );
  });

  const linkedInstructors = unifiedInstructors.filter((i) => Boolean(i.subaccountCode));
  const selectedLinkedInstructors = linkedInstructors.filter((i) => selectedIds.includes(i.id));
  const batchTotalAmount = selectedLinkedInstructors.reduce(
    (sum, inst) => sum + getSalaryAmount(inst),
    0,
  );

  const filteredBanks = banks.filter((b) => {
    const countryMatch =
      selectedCountry === "all" ||
      b.country_id?.toLowerCase() === selectedCountry.toLowerCase() ||
      b.country?.toLowerCase() === selectedCountry.toLowerCase();
    const searchMatch =
      !bankSearch.trim() ||
      b.name.toLowerCase().includes(bankSearch.trim().toLowerCase()) ||
      b.code.toLowerCase().includes(bankSearch.trim().toLowerCase());
    return countryMatch && searchMatch;
  });

  const openSubaccountModal = (inst?: UnifiedPayrollInstructor) => {
    setEditingInstructor(inst || null);
    setFormInstructorName(inst?.name || "");
    setFormInstructorEmail(inst?.email || "");
    setFormRoleTitle(inst?.roleTitle || "Instructor");
    setFormDefaultSalary(inst?.defaultSalary ? String(inst.defaultSalary) : "");
    setSelectedBankCode(inst?.bankCode || "");
    setSelectedBankName(inst?.bankName || "");
    setSelectedBankCountry("");
    setAccountNumber(inst?.accountNumber || "");
    setResolvedAccountName(inst?.accountName || "");
    setBankSearch(inst?.bankName || "");
    setIsBankDropdownOpen(false);
    setBankFormError("");
    setSubaccountModalOpen(true);
  };

  const handleResolveInstructorBank = async () => {
    const curBank = banks.find((b) => b.code === selectedBankCode);
    const activeCountry =
      selectedCountry !== "all"
        ? selectedCountry
        : selectedBankCountry || curBank?.country || curBank?.country_id || "";
    const spec =
      !activeCountry || (selectedCountry === "all" && !selectedBankCode)
        ? { minLen: 6, maxLen: 30, description: "account number" }
        : getCountryAccountSpec(activeCountry);

    if (!accountNumber.trim() || accountNumber.trim().length < spec.minLen) {
      setBankFormError(`Enter a valid account number (${spec.description}).`);
      return;
    }
    if (!selectedBankCode) {
      setBankFormError("Select the instructor's settlement bank.");
      return;
    }

    setResolvingBank(true);
    setBankFormError("");
    try {
      const accountName = await resolveBankAccount(
        accountNumber.trim(),
        selectedBankCode.trim(),
        activeCountry || "nigeria",
        currency,
      );
      setResolvedAccountName(accountName);
    } catch (err) {
      setResolvedAccountName("");
      setBankFormError(
        err instanceof Error ? err.message : "Unable to verify bank account details.",
      );
    } finally {
      setResolvingBank(false);
    }
  };

  const handleSaveInstructorSubaccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInstructorName.trim()) {
      setBankFormError("Instructor full name is required.");
      return;
    }
    if (!selectedBankCode || !accountNumber.trim()) {
      setBankFormError("Settlement bank and account number are required.");
      return;
    }

    setSavingSubaccount(true);
    setBankFormError("");

    try {
      const businessTitle = `${formInstructorName.trim()} (${myOrg?.name || "Faculty Payroll"})`.slice(
        0,
        80,
      );
      // Create 0% platform fee subaccount on Paystack so 100% settles to instructor
      const subData = await createSubaccount({
        business_name: resolvedAccountName.trim() || businessTitle,
        settlement_bank: selectedBankCode.trim(),
        account_number: accountNumber.trim(),
        percentage_charge: 0,
        mode: "live",
      });

      const subaccountCode = subData.subaccount_code;
      if (!subaccountCode) {
        throw new Error("Could not connect bank payout account. Please verify the bank details and try again.");
      }

      const instId = editingInstructor?.id || generateId("inst_pay");
      const parsedDefault = Number(formDefaultSalary);

      const record: InstructorPayrollRecipient = {
        id: editingInstructor?.recipientRecordId || `rec_${instId}`,
        orgId,
        instructorId: instId,
        instructorName: formInstructorName.trim(),
        instructorEmail: formInstructorEmail.trim() || undefined,
        subaccountCode,
        bankCode: selectedBankCode.trim(),
        bankName:
          selectedBankName ||
          banks.find((b) => b.code === selectedBankCode)?.name ||
          subData.settlement_bank ||
          selectedBankCode,
        accountNumber: accountNumber.trim(),
        accountName: resolvedAccountName.trim() || subData.account_name || formInstructorName.trim(),
        currency,
        defaultSalary:
          Number.isFinite(parsedDefault) && parsedDefault > 0 ? parsedDefault : undefined,
        roleTitle: formRoleTitle.trim() || "Instructor",
        source: editingInstructor?.source || "offline",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePayrollRecipient(record);

      if (record.defaultSalary) {
        setSalaryInputs((prev) => ({
          ...prev,
          [instId]: String(record.defaultSalary),
        }));
      }

      setSubaccountModalOpen(false);
      setStatusBanner({
        type: "success",
        title: "Instructor Bank Account Connected",
        message: `${record.instructorName}'s bank account (${record.bankName} •••• ${(record.accountNumber || "").slice(-4)}) is ready to receive direct salary payments with zero platform fees.`,
      });
    } catch (err) {
      setBankFormError(
        err instanceof Error ? err.message : "Failed to connect instructor bank account.",
      );
    } finally {
      setSavingSubaccount(false);
    }
  };

  // Individual Zero-Platform-Touch Salary Payment
  const handlePayIndividual = async (inst: UnifiedPayrollInstructor) => {
    if (!inst.subaccountCode) {
      openSubaccountModal(inst);
      return;
    }
    const amount = getSalaryAmount(inst);
    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message: "Enter your organization payor email address in the payroll header before initiating checkout.",
      });
      return;
    }
    if (!amount || amount <= 0) {
      setStatusBanner({
        type: "error",
        title: "Enter Salary Amount",
        message: `Enter a positive ${currency} salary amount for ${inst.name} before clicking Pay.`,
      });
      return;
    }

    setProcessingKey(`ind_${inst.id}`);
    setStatusBanner(null);

    try {
      const init = await initializePayrollTransaction({
        paymentType: "individual",
        email: payerEmail.trim(),
        amount,
        currency,
        subaccount_code: inst.subaccountCode,
        metadata: {
          org_id: orgId,
          org_name: myOrg?.name || currentUser.name,
          instructor_id: inst.id,
          instructor_name: inst.name,
          pay_period: payPeriod,
          note: paymentNote || `Salary payment for ${inst.name}`,
        },
      });

      triggerPayrollPaystackCheckout({
        accessCode: init.access_code,
        email: payerEmail.trim(),
        amount,
        currency,
        subaccountCode: inst.subaccountCode,
        reference: init.reference,
        onSuccess: async (txRes) => {
          const finalRef = txRes.reference || init.reference;
          let verifiedStatus: "success" | "initialized" = "success";
          try {
            const verify = await verifyTransaction(finalRef);
            if (verify?.status && verify.status !== "success") {
              verifiedStatus = "initialized";
            }
          } catch {
            // Keep confirmed popup reference if verification endpoint takes a moment
          }

          const disbursement: PayrollDisbursement = {
            id: generateId("pay"),
            orgId,
            reference: finalRef,
            paymentType: "individual",
            payerEmail: payerEmail.trim(),
            currency,
            totalAmount: amount,
            platformCut: 0,
            recipients: [
              {
                instructorId: inst.id,
                instructorName: inst.name,
                instructorEmail: inst.email,
                subaccountCode: inst.subaccountCode!,
                bankName: inst.bankName,
                accountNumber: inst.accountNumber,
                amount,
              },
            ],
            status: verifiedStatus,
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          };

          await recordPayrollDisbursement(disbursement);
          setProcessingKey(null);
          setStatusBanner({
            type: "success",
            title: "Direct Salary Payment Complete",
            message: `${currency} ${amount.toLocaleString()} has been sent directly to ${inst.name}'s bank account (${inst.bankName || "Bank"} •••• ${(inst.accountNumber || "").slice(-4)}) • Ref: ${finalRef}.`,
          });
        },
        onCancel: () => {
          setProcessingKey(null);
          setStatusBanner({
            type: "info",
            title: "Payment Cancelled",
            message: `Salary payment for ${inst.name} was cancelled.`,
          });
        },
        onError: (err) => {
          setProcessingKey(null);
          setStatusBanner({
            type: "error",
            title: "Payment Could Not Complete",
            message:
              err?.message || "Payment checkout could not be completed. Please verify the instructor's bank details.",
          });
        },
      });
    } catch (err) {
      setProcessingKey(null);
      setStatusBanner({
        type: "error",
        title: "Initialization Failed",
        message: err instanceof Error ? err.message : "Could not initialize salary checkout.",
      });
    }
  };

  // Multi-Instructor Single Transaction Checkout (with optional Split Group persistence)
  const handlePayBatchInOneTransaction = async () => {
    if (selectedLinkedInstructors.length === 0) return;
    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message: "Enter a valid organization payor email address before running batch checkout.",
      });
      return;
    }

    const zeroSalary = selectedLinkedInstructors.find((i) => getSalaryAmount(i) <= 0);
    if (zeroSalary) {
      setStatusBanner({
        type: "error",
        title: "Missing Salary Amount",
        message: `Enter a positive ${currency} salary amount for ${zeroSalary.name} or uncheck them before paying.`,
      });
      return;
    }

    if (saveBatchAsGroup && selectedLinkedInstructors.length >= 2 && !batchGroupName.trim()) {
      setStatusBanner({
        type: "error",
        title: "Payroll Group Name Required",
        message: "Provide a name for this new payroll group or uncheck 'Save as reusable Payroll Group'.",
      });
      return;
    }

    // If only 1 selected, use individual path cleanly
    if (selectedLinkedInstructors.length === 1) {
      await handlePayIndividual(selectedLinkedInstructors[0]);
      return;
    }

    setProcessingKey("batch");
    setStatusBanner(null);

    try {
      const recipientsPayload = selectedLinkedInstructors.map((inst) => ({
        instructorId: inst.id,
        instructorName: inst.name,
        instructorEmail: inst.email,
        subaccountCode: inst.subaccountCode!,
        bankName: inst.bankName,
        accountNumber: inst.accountNumber,
        amount: getSalaryAmount(inst),
      }));

      let createdSplitCode: string | undefined;
      let createdGroupRecord: PayrollSplitGroup | undefined;

      if (saveBatchAsGroup) {
        const groupRes = await createPayrollSplitGroup({
          name: batchGroupName.trim(),
          type: "flat",
          currency,
          bearer_type: "all-proportional",
          subaccounts: recipientsPayload.map((r) => ({
            subaccount: r.subaccountCode,
            share: Math.round(r.amount * 100),
          })),
        });
        createdSplitCode = groupRes.split_code;
        createdGroupRecord = {
          id: generateId("spl"),
          orgId,
          name: batchGroupName.trim(),
          splitCode: groupRes.split_code,
          paystackSplitId: groupRes.id,
          type: "flat",
          currency,
          bearerType: "all-proportional",
          members: recipientsPayload.map((r) => ({
            instructorId: r.instructorId,
            instructorName: r.instructorName,
            instructorEmail: r.instructorEmail,
            subaccountCode: r.subaccountCode,
            bankName: r.bankName,
            accountNumber: r.accountNumber,
            amount: r.amount,
          })),
          totalAmount: batchTotalAmount,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await savePayrollSplitGroup(createdGroupRecord);
      }

      const init = await initializePayrollTransaction({
        paymentType: "group",
        email: payerEmail.trim(),
        amount: batchTotalAmount,
        currency,
        split_code: createdSplitCode,
        bearer_type: "all-proportional",
        recipients: createdSplitCode
          ? undefined
          : recipientsPayload.map((r) => ({
              subaccount_code: r.subaccountCode,
              amount: r.amount,
              share: Math.round(r.amount * 100),
            })),
        metadata: {
          org_id: orgId,
          org_name: myOrg?.name || currentUser.name,
          pay_period: payPeriod,
          recipient_count: recipientsPayload.length,
          note: paymentNote || `Multi-instructor salary split (${recipientsPayload.length} instructors)`,
        },
      });

      triggerPayrollPaystackCheckout({
        accessCode: init.access_code,
        email: payerEmail.trim(),
        amount: batchTotalAmount,
        currency,
        splitCode: createdSplitCode,
        reference: init.reference,
        onSuccess: async (txRes) => {
          const finalRef = txRes.reference || init.reference;
          try {
            await verifyTransaction(finalRef);
          } catch {
            // Proceed using signed reference
          }

          await recordPayrollDisbursement({
            id: generateId("pay"),
            orgId,
            reference: finalRef,
            paymentType: createdSplitCode ? "split_group" : "batch_split",
            splitGroupId: createdGroupRecord?.id,
            splitCode: createdSplitCode,
            splitGroupName: createdGroupRecord?.name,
            payerEmail: payerEmail.trim(),
            currency,
            totalAmount: batchTotalAmount,
            platformCut: 0,
            recipients: recipientsPayload.map((r) => ({
              instructorId: r.instructorId,
              instructorName: r.instructorName,
              instructorEmail: r.instructorEmail,
              subaccountCode: r.subaccountCode,
              bankName: r.bankName,
              accountNumber: r.accountNumber,
              amount: r.amount,
            })),
            status: "success",
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          });

          setProcessingKey(null);
          setSelectedIds([]);
          setSaveBatchAsGroup(false);
          setBatchGroupName("");
          setStatusBanner({
            type: "success",
            title: "Faculty Payroll Paid in One Checkout",
            message: `${currency} ${batchTotalAmount.toLocaleString()} has been sent directly to ${recipientsPayload.length} instructor bank accounts in a single payment (Ref: ${finalRef}).`,
          });
        },
        onCancel: () => {
          setProcessingKey(null);
          setStatusBanner({
            type: "info",
            title: "Payment Cancelled",
            message: "Multi-instructor salary payment checkout was cancelled.",
          });
        },
        onError: (err) => {
          setProcessingKey(null);
          setStatusBanner({
            type: "error",
            title: "Batch Payment Failed",
            message:
              err?.message ||
              "Could not complete multi-instructor payment. Please verify all selected instructors use the same currency and valid bank accounts.",
          });
        },
      });
    } catch (err) {
      setProcessingKey(null);
      setStatusBanner({
        type: "error",
        title: "Payment Setup Error",
        message: err instanceof Error ? err.message : "Failed to prepare multi-instructor payment.",
      });
    }
  };

  // Create Reusable Split Group Modal Handler
  const openCreateGroupModal = () => {
    const initialMap: Record<string, { included: boolean; value: string }> = {};
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
    setNewGroupBearer("all-proportional");
    setNewGroupBearerSubaccount(linkedInstructors[0]?.subaccountCode || "");
    setGroupFormError("");
    setCreateGroupModalOpen(true);
  };

  const handleCreateSplitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setGroupFormError("Enter a name for this Payroll Group.");
      return;
    }

    const chosen = linkedInstructors.filter((inst) => groupMemberShares[inst.id]?.included);
    if (chosen.length < 2) {
      setGroupFormError("Select at least 2 instructors with connected bank accounts.");
      return;
    }

    const members: PayrollSplitMember[] = [];
    let totalFlat = 0;
    let totalPct = 0;

    for (const inst of chosen) {
      const val = Number(groupMemberShares[inst.id]?.value || 0);
      if (!Number.isFinite(val) || val <= 0) {
        setGroupFormError(`Enter a valid positive ${newGroupType === "flat" ? "salary amount" : "percentage"} for ${inst.name}.`);
        return;
      }
      if (newGroupType === "flat") {
        totalFlat += val;
        members.push({
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          subaccountCode: inst.subaccountCode!,
          bankName: inst.bankName,
          accountNumber: inst.accountNumber,
          amount: val,
        });
      } else {
        totalPct += val;
        members.push({
          instructorId: inst.id,
          instructorName: inst.name,
          instructorEmail: inst.email,
          subaccountCode: inst.subaccountCode!,
          bankName: inst.bankName,
          accountNumber: inst.accountNumber,
          amount: 0,
          sharePercentage: val,
        });
      }
    }

    if (newGroupType === "percentage" && Math.abs(totalPct - 100) > 0.01) {
      setGroupFormError(`Percentage shares must add up to 100% so all funds go directly to instructors (currently ${totalPct}%).`);
      return;
    }

    setCreatingGroup(true);
    setGroupFormError("");

    try {
      const subaccountsPayload = members.map((m) => ({
        subaccount: m.subaccountCode,
        share: newGroupType === "flat" ? Math.round(m.amount * 100) : Math.round(m.sharePercentage || 0),
      }));

      const res = await createPayrollSplitGroup({
        name: newGroupName.trim(),
        type: newGroupType,
        currency,
        bearer_type: newGroupBearer,
        bearer_subaccount:
          newGroupBearer === "subaccount" ? newGroupBearerSubaccount : undefined,
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
        bearerType: newGroupBearer,
        bearerSubaccount:
          newGroupBearer === "subaccount" ? newGroupBearerSubaccount : undefined,
        members,
        totalAmount: newGroupType === "flat" ? totalFlat : undefined,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await savePayrollSplitGroup(savedGroup);
      setCreateGroupModalOpen(false);
      setActiveTab("splits");
      setStatusBanner({
        type: "success",
        title: "Payroll Group Saved",
        message: `Payroll group "${savedGroup.name}" is ready—you can now pay all members in a single checkout.`,
      });
    } catch (err) {
      setGroupFormError(
        err instanceof Error ? err.message : "Failed to save payroll group.",
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  // Pay a Saved Split Group (Flat or Percentage)
  const executePaySplitGroup = async (group: PayrollSplitGroup, totalAmount: number) => {
    if (!payerEmail.trim() || !payerEmail.includes("@")) {
      setStatusBanner({
        type: "error",
        title: "Valid Payor Email Required",
        message: "Enter your organization payor email before paying a split group.",
      });
      return;
    }

    setProcessingKey(`grp_${group.id}`);
    setPayingGroupModal(null);
    setStatusBanner(null);

    try {
      const init = await initializePayrollTransaction({
        paymentType: "group",
        email: payerEmail.trim(),
        amount: totalAmount,
        currency: group.currency || currency,
        split_code: group.splitCode,
        metadata: {
          org_id: orgId,
          split_group_id: group.id,
          split_group_name: group.name,
          split_code: group.splitCode,
          pay_period: payPeriod,
        },
      });

      const computedRecipients = group.members.map((m) => ({
        instructorId: m.instructorId,
        instructorName: m.instructorName,
        instructorEmail: m.instructorEmail,
        subaccountCode: m.subaccountCode,
        bankName: m.bankName,
        accountNumber: m.accountNumber,
        amount:
          group.type === "flat"
            ? m.amount
            : Math.round(((totalAmount * (m.sharePercentage || 0)) / 100) * 100) / 100,
      }));

      triggerPayrollPaystackCheckout({
        accessCode: init.access_code,
        email: payerEmail.trim(),
        amount: totalAmount,
        currency: group.currency || currency,
        splitCode: group.splitCode,
        reference: init.reference,
        onSuccess: async (txRes) => {
          const finalRef = txRes.reference || init.reference;
          try {
            await verifyTransaction(finalRef);
          } catch {
            // Proceed using signed reference
          }

          await recordPayrollDisbursement({
            id: generateId("pay"),
            orgId,
            reference: finalRef,
            paymentType: "split_group",
            splitGroupId: group.id,
            splitCode: group.splitCode,
            splitGroupName: group.name,
            payerEmail: payerEmail.trim(),
            currency: group.currency || currency,
            totalAmount,
            platformCut: 0,
            recipients: computedRecipients,
            status: "success",
            note: paymentNote || undefined,
            payPeriod: payPeriod || undefined,
            paidAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            initiatedBy: currentUser.name,
          });

          setProcessingKey(null);
          setStatusBanner({
            type: "success",
            title: "Payroll Group Paid",
            message: `${group.currency} ${totalAmount.toLocaleString()} was paid directly to ${group.members.length} instructors in one checkout (Ref: ${finalRef}).`,
          });
        },
        onCancel: () => {
          setProcessingKey(null);
          setStatusBanner({
            type: "info",
            title: "Payment Cancelled",
            message: `Checkout for "${group.name}" was cancelled.`,
          });
        },
        onError: (err) => {
          setProcessingKey(null);
          setStatusBanner({
            type: "error",
            title: "Group Payment Failed",
            message:
              err?.message ||
              "Could not complete payment for this payroll group.",
          });
        },
      });
    } catch (err) {
      setProcessingKey(null);
      setStatusBanner({
        type: "error",
        title: "Payment Setup Error",
        message: err instanceof Error ? err.message : "Unable to start payroll group checkout.",
      });
    }
  };

  const handleTriggerGroupPay = (group: PayrollSplitGroup) => {
    if (group.type === "flat") {
      const exactTotal = group.members.reduce((sum, m) => sum + (m.amount || 0), 0);
      if (exactTotal <= 0) {
        setStatusBanner({
          type: "error",
          title: "Invalid Group Total",
          message: "Please add salary amounts for instructors in this group first.",
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
      ["Reference", "Date", "Mode", "Payroll Group", "Pay Period", "Currency", "Total Amount", "Platform Fee", "Recipients", "Status"],
      ...orgDisbursements.map((d) => [
        d.reference,
        d.paidAt,
        d.paymentType === "individual" ? "Individual" : "Group Batch",
        d.splitGroupName || "",
        d.payPeriod || "",
        d.currency,
        String(d.totalAmount),
        "0",
        d.recipients.map((r) => `${r.instructorName} (${r.bankName || "Bank"}: ${r.amount})`).join(" | "),
        d.status,
      ]),
    ];
    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
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
    if (historyFilter === "group") return d.paymentType === "split_group" || d.paymentType === "batch_split";
    return true;
  });

  const toggleSelectAllLinked = () => {
    if (selectedLinkedInstructors.length === linkedInstructors.length && linkedInstructors.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(linkedInstructors.map((i) => i.id));
    }
  };

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
              Instructor Payroll &amp; Direct Payouts
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pay instructors one by one or pay a whole group together in one checkout—sent straight to their bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreateGroupModal}
            disabled={linkedInstructors.length < 2}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            title={
              linkedInstructors.length < 2
                ? "Connect at least 2 instructor bank accounts first"
                : "Create reusable Payroll Group"
            }
          >
            <Layers className="w-4 h-4 text-[#0078d4] dark:text-[#04a4ec]" />
            <span>New Payroll Group</span>
          </button>

          <button
            type="button"
            onClick={() => openSubaccountModal()}
            className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Instructor Bank</span>
          </button>
        </div>
      </div>

      {/* Direct Payout Info Bar */}
      <div className="bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Direct Bank Salary Payouts (0% Platform Fee):</strong> Salaries go straight into each instructor&apos;s connected bank account—nothing is held by the platform.
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 tabular-nums">
          DIRECT PAYOUT • 0% FEE
        </span>
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
              <p className="opacity-90 mt-0.5 leading-relaxed">{statusBanner.message}</p>
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

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Org Instructors
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {unifiedInstructors.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Bank Accounts Ready
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {linkedInstructors.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Payroll Groups
          </p>
          <p className="text-2xl font-bold text-[#0078d4] dark:text-[#04a4ec] mt-1 tabular-nums">
            {orgSplitGroups.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Paid Out
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {currency} {totalDisbursed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Payroll Surface */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {/* Tabs Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              className={`px-3.5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "roster"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Instructors &amp; Pay ({unifiedInstructors.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("splits")}
              className={`px-3.5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "splits"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Payroll Groups ({orgSplitGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "history"
                  ? "border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] dark:border-[#04a4ec]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Payment History ({orgDisbursements.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: INSTRUCTORS ROSTER & INDIVIDUAL / BATCH CHECKOUT */}
        {activeTab === "roster" && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Payroll Settings & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Search Instructor / Bank
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, or bank..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Payor Receipt Email
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => setPayerEmailOverride(e.target.value)}
                  placeholder="finance@school.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
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
                  Pay Period / Memo
                </label>
                <input
                  type="text"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="e.g. November 2025 Salary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                />
              </div>
            </div>

            {/* Batch Single-Transaction Bar */}
            {selectedLinkedInstructors.length > 0 && (
              <div className="bg-[#f0f7fd] dark:bg-[#132838] border border-[#b8daf4] dark:border-[#254b68] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span>
                      {selectedLinkedInstructors.length} Instructor
                      {selectedLinkedInstructors.length > 1 ? "s" : ""} Selected for Single Payment
                    </span>
                    <span className="text-[#0078d4] dark:text-[#04a4ec] font-mono tabular-nums">
                      • Total: {currency} {batchTotalAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Each selected instructor receives their exact salary directly in their bank account from one payment checkout.
                  </p>

                  {selectedLinkedInstructors.length >= 2 && (
                    <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                      <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveBatchAsGroup}
                          onChange={(e) => setSaveBatchAsGroup(e.target.checked)}
                          className="rounded border-slate-300 text-[#0078d4]"
                        />
                        <span>Save as reusable Payroll Group</span>
                      </label>
                      {saveBatchAsGroup && (
                        <input
                          type="text"
                          value={batchGroupName}
                          onChange={(e) => setBatchGroupName(e.target.value)}
                          placeholder="Group name (e.g. Science Dept)"
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={processingKey !== null || batchTotalAmount <= 0}
                    onClick={handlePayBatchInOneTransaction}
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    {processingKey === "batch" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>
                      {selectedLinkedInstructors.length === 1
                        ? `Pay 1 Instructor (${currency} ${batchTotalAmount.toLocaleString()})`
                        : `Pay All ${selectedLinkedInstructors.length} in 1 Transaction`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Instructors Table */}
            {filteredInstructors.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Instructors Found for Payroll
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Add an instructor bank payout account directly or assign instructors to your organization&apos;s courses so they appear here automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSubaccountModal()}
                  className="inline-flex items-center px-3.5 py-2 bg-[#0078d4] text-white rounded-xl text-xs font-bold space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Instructor Account</span>
                </button>
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
                          title="Select all instructors with connected bank accounts"
                        >
                          {selectedLinkedInstructors.length > 0 &&
                          selectedLinkedInstructors.length === linkedInstructors.length ? (
                            <CheckSquare className="w-4 h-4 text-[#0078d4]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">Instructor</th>
                      <th className="py-3 px-3">Payout Bank Account</th>
                      <th className="py-3 px-3 w-44">Salary ({currency})</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-xs">
                    {filteredInstructors.map((inst) => {
                      const isLinked = Boolean(inst.subaccountCode);
                      const isChecked = selectedIds.includes(inst.id);
                      const salaryVal =
                        salaryInputs[inst.id] ??
                        (inst.defaultSalary ? String(inst.defaultSalary) : "");
                      const isPayingThis = processingKey === `ind_${inst.id}`;

                      return (
                        <tr
                          key={inst.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors ${
                            isChecked ? "bg-[#f0f7fd]/60 dark:bg-[#132838]/50" : ""
                          }`}
                        >
                          <td className="py-3 px-3 align-middle">
                            <input
                              type="checkbox"
                              disabled={!isLinked}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, inst.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== inst.id));
                                }
                              }}
                              title={
                                isLinked
                                  ? "Select to pay together with other instructors"
                                  : "Add bank account first"
                              }
                              className="rounded border-slate-300 text-[#0078d4] disabled:opacity-40 cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {inst.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {inst.email || inst.roleTitle}
                              {inst.courseTitles.length > 0 && (
                                <span className="ml-1.5 text-slate-400">
                                  • {inst.courseTitles.slice(0, 2).join(", ")}
                                  {inst.courseTitles.length > 2
                                    ? ` +${inst.courseTitles.length - 2}`
                                    : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-middle">
                            {isLinked ? (
                              <div>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                  {inst.bankName || "Connected Bank"}
                                </span>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                  {inst.accountName ? `${inst.accountName} • ` : ""}
                                  {inst.accountNumber
                                    ? `****${inst.accountNumber.slice(-4)}`
                                    : "Ready"}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openSubaccountModal(inst)}
                                className="inline-flex items-center space-x-1 text-[#0078d4] dark:text-[#04a4ec] font-semibold hover:underline cursor-pointer"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Connect Bank Account</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={salaryVal}
                              onChange={(e) =>
                                setSalaryInputs((prev) => ({
                                  ...prev,
                                  [inst.id]: e.target.value,
                                }))
                              }
                              placeholder="0.00"
                              className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                            />
                          </td>

                          <td className="py-3 px-3 align-middle text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              {isLinked ? (
                                <button
                                  type="button"
                                  disabled={processingKey !== null}
                                  onClick={() => handlePayIndividual(inst)}
                                  className="px-3 py-1.5 rounded-lg bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white font-semibold transition inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  {isPayingThis ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  )}
                                  <span>Pay Individual</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openSubaccountModal(inst)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
                                >
                                  Setup Bank
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openSubaccountModal(inst)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                title="Edit instructor payout details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {inst.recipientRecordId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDelete({
                                      kind: "recipient",
                                      id: inst.recipientRecordId!,
                                      label: inst.name,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                                  title="Remove saved payout recipient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Optional Note Field */}
            {filteredInstructors.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Optional payment note or memo for your records..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40"
                  />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tip: Check multiple instructors to pay them all together in one checkout.
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REUSABLE PAYROLL SPLIT GROUPS */}
        {activeTab === "splits" && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Saved Payroll Groups
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Save instructor teams so you can pay everyone&apos;s salary together in a single checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateGroupModal}
                disabled={linkedInstructors.length < 2}
                className="px-3.5 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition inline-flex items-center space-x-1.5 cursor-pointer self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Create Payroll Group</span>
              </button>
            </div>

            {orgSplitGroups.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Payroll Groups Created Yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Group 2 or more instructors with connected bank accounts to pay their salaries together in a single checkout.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={linkedInstructors.length < 2}
                  onClick={openCreateGroupModal}
                  className="inline-flex items-center px-3.5 py-2 bg-[#0078d4] disabled:opacity-50 text-white rounded-xl text-xs font-bold space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Payroll Group</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgSplitGroups.map((group) => {
                  const flatTotal =
                    group.type === "flat"
                      ? group.members.reduce((sum, m) => sum + (m.amount || 0), 0)
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
                              {group.type === "flat" ? "Fixed Salaries" : "Percentage Split"} •{" "}
                              {group.currency} • {group.members.length} Instructors
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                kind: "group",
                                id: group.id,
                                label: group.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                            title="Delete Payroll Group"
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
                                  {m.bankName || "Connected Bank"}
                                  {m.accountNumber ? ` • ****${m.accountNumber.slice(-4)}` : ""}
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

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            Processing fee:{" "}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {group.bearerType === "all-proportional"
                                ? "Shared fairly"
                                : group.bearerType === "all"
                                  ? "Shared equally"
                                  : "Single recipient"}
                            </strong>
                          </span>
                          {flatTotal !== undefined && (
                            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                              Total: {group.currency} {flatTotal.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={processingKey !== null}
                        onClick={() => handleTriggerGroupPay(group)}
                        className="w-full py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        {isPaying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        <span>
                          {group.type === "flat" && flatTotal !== undefined
                            ? `Pay Group (${group.currency} ${flatTotal.toLocaleString()})`
                            : "Enter Total & Pay Group"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISBURSEMENT LEDGER */}
        {activeTab === "history" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      ? "All Payouts"
                      : f === "individual"
                        ? "Individual"
                        : "Multi-Instructor Splits"}
                  </button>
                ))}
              </div>

              {orgDisbursements.length > 0 && (
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

            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                No instructor salary disbursements recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-3">Date & Ref</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3">Recipients (Direct to Bank)</th>
                      <th className="py-3 px-3">Platform Fee</th>
                      <th className="py-3 px-3 text-right">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70 text-xs">
                    {filteredHistory.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {d.reference}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(d.paidAt).toLocaleString()}
                            {d.payPeriod ? ` • ${d.payPeriod}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {d.paymentType === "individual"
                              ? "Individual Payment"
                              : "Single-Checkout Group"}
                          </div>
                          {d.splitGroupName && (
                            <div className="text-[11px] text-[#0078d4] dark:text-[#04a4ec]">
                              {d.splitGroupName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            {d.recipients.map((r, idx) => (
                              <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-semibold">{r.instructorName}</span>
                                {r.bankName ? (
                                  <span className="text-slate-400"> ({r.bankName})</span>
                                ) : null}
                                :{" "}
                                <span className="font-mono font-semibold tabular-nums">
                                  {d.currency} {r.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top font-mono text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                          {d.currency} 0.00
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {d.currency} {d.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / CONNECT INSTRUCTOR BANK ACCOUNT */}
      {subaccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  {editingInstructor
                    ? `Connect Bank Account: ${editingInstructor.name}`
                    : "Add Instructor Bank Account"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect an instructor&apos;s bank account so salaries go straight to them with 0% platform fee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubaccountModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankFormError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
                {bankFormError}
              </div>
            )}

            <form onSubmit={handleSaveInstructorSubaccount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instructor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formInstructorName}
                    onChange={(e) => setFormInstructorName(e.target.value)}
                    placeholder="e.g. Dr. Jane Doe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formInstructorEmail}
                    onChange={(e) => setFormInstructorEmail(e.target.value)}
                    placeholder="jane@school.edu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Department
                  </label>
                  <input
                    type="text"
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    placeholder="e.g. Mathematics Teacher"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Monthly Salary ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formDefaultSalary}
                    onChange={(e) => setFormDefaultSalary(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Country Filter
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {PAYSTACK_SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Searchable Bank Dropdown */}
              <div className="relative">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Bank *
                </label>
                <button
                  type="button"
                  onClick={() => setIsBankDropdownOpen((o) => !o)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-left flex items-center justify-between text-slate-900 dark:text-white cursor-pointer"
                >
                  <span className="truncate">
                    {selectedBankName || "Select settlement bank..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {isBankDropdownOpen && (
                  <div className="mt-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-y-auto p-1.5 space-y-1">
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Type bank name..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    {filteredBanks.slice(0, 60).map((b) => (
                      <button
                        key={`${b.country_id}-${b.code}-${b.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedBankCode(b.code);
                          setSelectedBankName(b.name);
                          setSelectedBankCountry(b.country_id || b.country || "");
                          setIsBankDropdownOpen(false);
                          setResolvedAccountName("");
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f7fd] dark:hover:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <span className="truncate">{b.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 ml-2">
                          {b.currency} • {b.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      setResolvedAccountName("");
                    }}
                    placeholder="Enter bank account number"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={resolvingBank}
                    onClick={handleResolveInstructorBank}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-slate-800 dark:text-white cursor-pointer shrink-0"
                  >
                    {resolvingBank ? "Verifying..." : "Verify Name"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verified Account Holder Name
                </label>
                <input
                  type="text"
                  value={resolvedAccountName}
                  onChange={(e) => setResolvedAccountName(e.target.value)}
                  placeholder="Click Verify Name or enter exact bank account holder name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSubaccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubaccount}
                  className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  {savingSubaccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save &amp; Connect Bank Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PAYROLL GROUP */}
      {createGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Create Payroll Group
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Group selected instructors so you can pay everyone&apos;s salary in a single checkout.
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

            <form onSubmit={handleCreateSplitGroup} className="space-y-4 text-xs">
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
                    placeholder="e.g. Monthly STEM Faculty Payroll"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    How Salaries Are Shared
                  </label>
                  <select
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value as "flat" | "percentage")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="flat">Fixed Salary Amounts ({currency})</option>
                    <option value="percentage">Percentage Shares (Must add up to 100%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Who Covers Transaction Fees
                </label>
                <select
                  value={newGroupBearer}
                  onChange={(e) =>
                    setNewGroupBearer(
                      e.target.value as "all-proportional" | "all" | "subaccount",
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="all-proportional">
                    Shared fairly across instructors (Recommended)
                  </option>
                  <option value="all">Shared equally across all accounts</option>
                  <option value="subaccount">Covered by one chosen instructor</option>
                </select>
                {newGroupBearer === "subaccount" && (
                  <select
                    value={newGroupBearerSubaccount}
                    onChange={(e) => setNewGroupBearerSubaccount(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {linkedInstructors.map((i) => (
                      <option key={i.subaccountCode} value={i.subaccountCode}>
                        {i.name} ({i.bankName || "Bank"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Select Instructors &amp; {newGroupType === "flat" ? `Salary (${currency})` : "Share (%)"}
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 max-h-56 overflow-y-auto">
                  {linkedInstructors.map((inst) => {
                    const entry = groupMemberShares[inst.id] || { included: false, value: "" };
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
                              {inst.bankName || "Connected Bank"}
                              {inst.accountNumber ? ` • ****${inst.accountNumber.slice(-4)}` : ""}
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
                  {creatingGroup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Payroll Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTER TOTAL AMOUNT FOR PERCENTAGE PAYROLL GROUP */}
      {payingGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Pay Payroll Group: {payingGroupModal.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the total {payingGroupModal.currency} salary pool to divide automatically across {payingGroupModal.members.length} instructors.
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
                onClick={() => executePaySplitGroup(payingGroupModal, Number(groupTotalPayInput))}
                className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Confirm Removal
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Remove <strong>{confirmDelete.label}</strong> from{" "}
              {confirmDelete.kind === "group" ? "saved payroll groups" : "saved instructor bank accounts"}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmDelete.kind === "group") {
                    await deletePayrollSplitGroup(confirmDelete.id);
                  } else {
                    await removePayrollRecipient(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
