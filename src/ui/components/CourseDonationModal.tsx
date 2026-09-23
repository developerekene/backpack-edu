import React, { useState } from "react";
import { Course, CourseDonation } from "../../types";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { generateId } from "../../lib/id";
import { formatPriceWithDecimals } from "../../lib/price";
import { triggerPaystackPayment, generateReferenceNumber } from "../../lib/paystack";
import {
  X,
  HeartHandshake,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";
import { CheckoutDisclosure } from "./CheckoutDisclosure";

interface CourseDonationModalProps {
  course: Course;
  onClose: () => void;
  onDonationSuccess?: (donation: CourseDonation) => void;
}

export const CourseDonationModal: React.FC<CourseDonationModalProps> = ({
  course,
  onClose,
  onDonationSuccess,
}) => {
  const { organizations, addCourseDonation, getCourseAdmissionGate } =
    useAppContext();
  const { currentUser } = useAuth();

  const org = organizations.find(
    (o) => o.id === course.orgId || o.ownerId === course.orgId,
  );
  const gate = getCourseAdmissionGate(course.id);

  const [donationType, setDonationType] = useState<"general" | "sponsorship">(
    "general",
  );
  const [sponsorSpecificStudents, setSponsorSpecificStudents] = useState(false);
  const [donorName, setDonorName] = useState(currentUser?.name || "");
  const [donorEmail, setDonorEmail] = useState(currentUser?.email || "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorNote, setDonorNote] = useState("");
  const [isDisclosureAcknowledged, setIsDisclosureAcknowledged] = useState(false);

  const rawTuition = gate.tuitionCostPerStudent || course.price || 50000;
  const currency = gate.currency || course.currency || "NGN";

  // Donation Amount starts blank
  const [customAmount, setCustomAmount] = useState<string>("");
  const [studentCount, setStudentCount] = useState<number>(1);
  const [specificStudents, setSpecificStudents] = useState<
    { name: string; email: string }[]
  >([{ name: "", email: "" }]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedDonation, setCompletedDonation] =
    useState<CourseDonation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleStudentChange = (
    index: number,
    field: "name" | "email",
    val: string
  ) => {
    setSpecificStudents((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleStudentCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setStudentCount(validCount);
    setSpecificStudents((prev) => {
      const copy = [...prev];
      while (copy.length < validCount) copy.push({ name: "", email: "" });
      return copy.slice(0, validCount);
    });
  };

  // General donation amounts with all decimals
  const baseDonationInput = Number(customAmount) || 0;
  const generalDonation15Fee = Math.round(baseDonationInput * 0.15 * 100) / 100;
  const generalTotalPayable = Math.round((baseDonationInput + generalDonation15Fee) * 100) / 100;

  // Sponsorship amounts with all decimals
  const totalBaseSponsorship = Math.round(studentCount * rawTuition * 100) / 100;
  const totalSponsorship15Fee = Math.round(totalBaseSponsorship * 0.15 * 100) / 100;
  const totalSponsorshipPayable = Math.round((totalBaseSponsorship + totalSponsorship15Fee) * 100) / 100;

  const computedAmount =
    donationType === "sponsorship"
      ? totalSponsorshipPayable
      : generalTotalPayable;

  const handleCopyLink = () => {
    const url = window.location.origin + `/course/${course.id}?donate=true`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (donationType === "general" && baseDonationInput <= 0) {
      alert("Please provide a valid contribution amount.");
      return;
    }
    const payerEmail = isAnonymous ? donorEmail.trim() || currentUser?.email || "sponsor@backpack.edu" : donorEmail.trim();
    if (!payerEmail) {
      alert("Please provide an email address for receipt generation.");
      return;
    }

    setIsProcessing(true);

    const generatedRef = generateReferenceNumber();

    const validStudents =
      donationType === "sponsorship" && sponsorSpecificStudents
        ? specificStudents
            .map((s) => ({
              name: s.name.trim(),
              email: s.email.trim(),
            }))
            .filter((s) => s.email.length > 0 || s.name.length > 0)
        : [];

    const validEmails = validStudents
      .map((s) => s.email)
      .filter((email) => email.length > 0);

    triggerPaystackPayment({
      email: payerEmail,
      amount: computedAmount,
      currency,
      reference: generatedRef,
      studentDetails: {
        firstName: isAnonymous ? "Generous" : (donorName.trim().split(" ")[0] || "Generous"),
        lastName: isAnonymous ? "Sponsor" : (donorName.trim().split(" ").slice(1).join(" ") || "Sponsor"),
        email: payerEmail,
        courseTitle: `${course.title} (${donationType === "sponsorship" ? "Tuition Sponsorship" : "Course Donation"})`,
        notes: donorNote.trim() || undefined,
      },
      metadata: {
        courseId: course.id,
        courseTitle: course.title,
        donationType,
        numberOfStudents: donationType === "sponsorship" ? studentCount : undefined,
      },
      onSuccess: async (res) => {
        const finalRef = res?.reference || generatedRef;
        const donation: CourseDonation = {
          id: generateId("don"),
          courseId: course.id,
          courseTitle: course.title,
          orgId: course.orgId,
          donorName: isAnonymous ? "Anonymous Sponsor" : donorName.trim() || "Generous Sponsor",
          donorEmail: payerEmail,
          amount: computedAmount,
          currency,
          donationType,
          isAnonymous,
          numberOfStudents: donationType === "sponsorship" ? studentCount : undefined,
          sponsoredStudentEmails: validEmails.length > 0 ? validEmails : undefined,
          sponsoredStudents: validStudents.length > 0 ? validStudents : undefined,
          donorNote: donorNote.trim() || undefined,
          createdAt: new Date().toISOString(),
          transactionRef: finalRef,
          status: "completed",
        };

        try {
          await addCourseDonation(donation);
          setCompletedDonation(donation);
          if (onDonationSuccess) {
            onDonationSuccess(donation);
          }
        } catch (err) {
          console.error("Donation record failed:", err);
          alert("Failed to save sponsorship record. Please contact support with reference: " + finalRef);
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => {
        console.log("Payment cancelled");
        setIsProcessing(false);
      },
      onError: (err) => {
        console.log("Payment error:", err);
        setIsProcessing(false);
        alert(`⚠️ Payment error: ${err?.message || "Payment could not be processed."}`);
      },
    });
  };

  const availableSeats = Math.max(
    0,
    gate.maxAdmissibleStudents - gate.currentlyAdmittedCount,
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {completedDonation ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Thank You for Your Support!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {completedDonation.donationType === "sponsorship"
                  ? `You have sponsored ${completedDonation.numberOfStudents || 1} student(s) for "${course.title}".`
                  : `You contributed to student tuition support for "${course.title}".`}
              </p>
            </div>

            {completedDonation.donationType === "sponsorship" && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-left text-xs border border-indigo-200 dark:border-indigo-800 space-y-2">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block">
                  {completedDonation.sponsoredStudents && completedDonation.sponsoredStudents.length > 0
                    ? "Private Student Sponsorship Registered:"
                    : "Waitlist Student Sponsorship Registered:"}
                </span>
                <p className="text-slate-700 dark:text-slate-200 font-medium">
                  {completedDonation.sponsoredStudents && completedDonation.sponsoredStudents.length > 0
                    ? completedDonation.sponsoredStudents
                        .map((s) => (s.name && s.email ? `${s.name} (${s.email})` : s.name || s.email))
                        .join(", ")
                    : completedDonation.sponsoredStudentEmails && completedDonation.sponsoredStudentEmails.length > 0
                    ? completedDonation.sponsoredStudentEmails.join(", ")
                    : `${completedDonation.numberOfStudents || 1} student seat(s) funded from the course applicant waitlist.`}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {completedDonation.sponsoredStudentEmails && completedDonation.sponsoredStudentEmails.length > 0
                    ? "Registered students are notified in-app with instant course admission, and the school has been notified to process non-registered students."
                    : "Waitlisted applicants are prioritized for admission with full tuition coverage."}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold flex items-center"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Link Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Course Link
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Sponsor or Donate to Course
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {course.title} • {org?.name || "Vocational School"}
                </p>
              </div>
            </div>

            {/* Admission Gate Status - Exposes only number of students funded and admitted */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Funded Seats
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  {gate.maxAdmissibleStudents}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Admitted
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                  {gate.currentlyAdmittedCount}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Open Seats
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-base">
                  {availableSeats}
                </span>
              </div>
            </div>

            {/* Choice - General Donation before Sponsor Student(s) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDonationType("general")}
                className={`p-3 rounded-xl border text-left text-xs transition ${
                  donationType === "general"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="font-bold block">General Donation</span>
                <span className="text-[10px] opacity-75">Support course tuition fund</span>
              </button>
              <button
                type="button"
                onClick={() => setDonationType("sponsorship")}
                className={`p-3 rounded-xl border text-left text-xs transition ${
                  donationType === "sponsorship"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="font-bold block">Sponsor Student(s)</span>
                <span className="text-[10px] opacity-75">Fund waitlist or specific students</span>
              </button>
            </div>

            {donationType === "general" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Base Donation Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Enter base donation amount..."
                  />
                  <p className="text-[10px] text-slate-400">
                    Your contribution opens up sponsored tuition seats for deserving vocational students.
                  </p>
                </div>

                {baseDonationInput > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Base Contribution:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {currency} {formatPriceWithDecimals(baseDonationInput)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>15% Platform Addition:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        + {currency} {formatPriceWithDecimals(generalDonation15Fee)}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Amount Payable (+15%):</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                        {currency} {formatPriceWithDecimals(generalTotalPayable)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Number of Students ({studentCount} student{studentCount > 1 ? "s" : ""})
                  </label>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 5, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleStudentCountChange(n)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                          studentCount === n
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Student Sponsorship Checkbox & Info */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="modal-specific-students"
                      checked={sponsorSpecificStudents}
                      onChange={(e) => setSponsorSpecificStudents(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="modal-specific-students"
                      className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      Sponsor specific student(s)
                    </label>
                  </div>

                  {sponsorSpecificStudents ? (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {specificStudents.map((st, idx) => (
                        <div key={idx} className="space-y-1">
                          {studentCount > 1 && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Student #{idx + 1}
                            </span>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={st.name}
                              onChange={(e) =>
                                handleStudentChange(idx, "name", e.target.value)
                              }
                              placeholder={studentCount > 1 ? `Student #${idx + 1} Name` : "Student Name"}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                            />
                            <input
                              type="email"
                              value={st.email}
                              onChange={(e) =>
                                handleStudentChange(idx, "email", e.target.value)
                              }
                              placeholder={studentCount > 1 ? `Student #${idx + 1} Email` : "Student Email"}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-[11px] text-slate-400">
                        Tuition is sponsored directly for these student(s). Leave blank to fund waitlisted applicants.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Random sponsorship: Tuition will be allocated automatically to {studentCount} waitlisted applicant{studentCount > 1 ? "s" : ""}.
                    </p>
                  )}
                </div>

                {/* Sponsorship Amount Breakdown Card */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Base Tuition ({studentCount} student{studentCount > 1 ? "s" : ""}):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currency} {formatPriceWithDecimals(totalBaseSponsorship)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>15% Platform Addition:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      + {currency} {formatPriceWithDecimals(totalSponsorship15Fee)}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Total Amount Payable (+15%):</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                      {currency} {formatPriceWithDecimals(totalSponsorshipPayable)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Donor info */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="modal-anon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="modal-anon"
                  className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Sponsor anonymously
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required={!isAnonymous}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="email"
                    required={!isAnonymous}
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="Your Email"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={donorNote}
                  onChange={(e) => setDonorNote(e.target.value)}
                  placeholder="Optional note or encouragement for the student(s)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Clear Checkout Disclosures & Consumer Protection */}
            <div className="pt-1">
              <CheckoutDisclosure
                amount={donationType === "sponsorship" ? totalSponsorshipPayable : generalTotalPayable}
                currency={currency}
                itemTitle={course.title}
                baseAmount={donationType === "sponsorship" ? totalBaseSponsorship : baseDonationInput}
                feeAmount={donationType === "sponsorship" ? totalSponsorship15Fee : generalDonation15Fee}
                feeLabel="Platform Addition (+15%)"
                providerName={org?.name || "Vocational School"}
                transactionType={donationType === "sponsorship" ? "sponsorship" : "donation"}
                isAcknowledged={isDisclosureAcknowledged}
                onAcknowledgeChange={setIsDisclosureAcknowledged}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div>
                {donationType === "sponsorship" ? (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Sponsorship (+15%)
                    </span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {currency} {formatPriceWithDecimals(totalSponsorshipPayable)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Total Donation (+15%)
                    </span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {currency} {formatPriceWithDecimals(generalTotalPayable)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    !isDisclosureAcknowledged ||
                    (donationType === "general" && baseDonationInput <= 0)
                  }
                  title={
                    !isDisclosureAcknowledged
                      ? "Please review and acknowledge the checkout disclosures above to proceed"
                      : undefined
                  }
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center shadow-md shadow-indigo-600/20"
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  {isProcessing
                    ? "Processing..."
                    : donationType === "sponsorship"
                    ? `Confirm Sponsorship (${currency} ${formatPriceWithDecimals(totalSponsorshipPayable)})`
                    : baseDonationInput > 0
                    ? `Complete Donation (${currency} ${formatPriceWithDecimals(generalTotalPayable)})`
                    : "Complete Donation"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
