import React, { useState } from 'react';
import { Course, OrgMember } from '../../types';
import { X, CheckCircle, CreditCard, Sparkles, AlertCircle, Paperclip, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useAppContext } from '../../store/AppContext';
import { FileUpload } from './FileUpload';
import { PaystackButtonWrapper } from './PaystackButtonWrapper';
import { CheckoutDisclosure } from './CheckoutDisclosure';
import { generateId } from '../../lib/id';
import { getEffectivePrice, formatPriceWithDecimals } from '../../lib/price';

interface CourseJoinModalProps {
    course: Course;
    invite: OrgMember;
    onClose: () => void;
    onJoinSuccess: () => void;
}

export const CourseJoinModal: React.FC<CourseJoinModalProps> = ({
    course,
    invite,
    onClose,
    onJoinSuccess,
}) => {
    const { currentUser } = useAuth();
    const { updateOrgMember, addEnrollmentRequest, updateEnrollmentRequest, enrollmentRequests, organizations } = useAppContext();

    const providerOrg = organizations.find(o => o.id === course.orgId || o.ownerId === course.orgId);
    const subaccount = providerOrg?.paystackSubaccount || currentUser?.paystackSubaccount;

    // Check requirement flags
    const feeRequired = invite.requiresPayment !== false && course.price > 0;
    const docsRequired = invite.requiresDocuments !== false && (
        (invite.requiredDocNames && invite.requiredDocNames.length > 0) ||
        (course.requiredDocuments && course.requiredDocuments.length > 0)
    );

    const docList = invite.requiredDocNames && invite.requiredDocNames.length > 0
        ? invite.requiredDocNames
        : (course.requiredDocuments && course.requiredDocuments.length > 0 ? course.requiredDocuments : []);

    const [paymentMethod, setPaymentMethod] = useState<'one-time' | 'installment'>(
        course.paymentTermsAllowed === 'installment' ? 'installment' : 'one-time'
    );
    const [documents, setDocuments] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(!feeRequired);
    const [isDisclosureAcknowledged, setIsDisclosureAcknowledged] = useState(false);

    if (!currentUser) return null;

    const effectiveCoursePrice = getEffectivePrice(course.price);
    const installmentPrice = course.price > 0 ? Math.round((effectiveCoursePrice / 3) * 100) / 100 : 0;
    const paymentAmount = paymentMethod === 'one-time' ? effectiveCoursePrice : installmentPrice;
    const baseTuitionAmount = paymentMethod === 'one-time' ? course.price : Math.round((course.price / 3) * 100) / 100;
    const platform15Addition = Math.round((paymentAmount - baseTuitionAmount) * 100) / 100;

    const missingDocs = docsRequired && docList.some(doc => !documents[doc]);

    const handleCompleteJoin = async () => {
        setLoading(true);
        try {
            // 1. Update Org Member status to active
            await updateOrgMember(invite.id, {
                status: 'active',
                userId: currentUser.id,
                joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            });

            // 2. Check if an existing request exists or create an approved enrollment
            const existingReq = enrollmentRequests.find(r => r.userId === currentUser.id && r.courseId === course.id);
            if (existingReq) {
                await updateEnrollmentRequest(existingReq.id, 'approved', feeRequired ? 'paid' : 'paid', documents);
            } else {
                await addEnrollmentRequest({
                    id: generateId('req'),
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    orgId: course.orgId,
                    courseId: course.id,
                    courseTitle: course.title,
                    status: 'approved',
                    paymentStatus: feeRequired ? 'paid' : 'paid',
                    paymentMethod,
                    documents,
                    appliedAt: new Date().toISOString()
                });
            }

            onJoinSuccess();
        } catch (err) {
            console.error("Error joining course:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center">
                                <Mail className="w-3 h-3 mr-1" /> Course Invite
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Join {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {providerOrg?.name || 'Your organization'} has invited you to join this course.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Invite Banner */}
                    <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
                        <div className="flex items-center space-x-2 font-bold text-sm">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Direct Invitation Granted</span>
                        </div>
                        <p className="leading-relaxed">
                            You have a direct invitation to join this course. You do not need to submit an application or await review.
                        </p>
                        {invite.inviteNote && (
                            <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-indigo-100 dark:border-indigo-900 font-medium text-slate-800 dark:text-slate-200">
                                <span className="font-bold block text-[11px] text-indigo-600 dark:text-indigo-400">Note from Institution:</span>
                                "{invite.inviteNote}"
                            </div>
                        )}
                    </div>

                    {/* Requirements Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-3 ${
                            feeRequired ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                        }`}>
                            <CreditCard className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold block">Tuition Fee</span>
                                {feeRequired ? `${course.currency} ${course.price.toLocaleString()} Required` : 'Tuition Waived / Free'}
                            </div>
                        </div>

                        <div className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-3 ${
                            docsRequired ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                        }`}>
                            <Paperclip className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold block">Required Documents</span>
                                {docsRequired ? `${docList.length} Document(s) Needed` : 'No Documents Needed'}
                            </div>
                        </div>
                    </div>

                    {/* Document Upload Section (If Required) */}
                    {docsRequired && (
                        <div className="space-y-4 pt-2">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Submit Required Documents
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    The inviting institution requested the following document(s):
                                </p>
                            </div>

                            {docList.map(docName => {
                                const isAttached = !!documents[docName];
                                return (
                                    <div key={docName} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                                                <span>{docName}</span>
                                                <span className="text-red-500 ml-1 text-xs">*</span>
                                            </label>
                                            {isAttached ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Attached
                                                </span>
                                            ) : (
                                                <span className="text-amber-500 text-[10px] font-semibold">Required</span>
                                            )}
                                        </div>

                                        <FileUpload
                                            label={`Upload ${docName}`}
                                            onUpload={(url) => setDocuments(prev => ({ ...prev, [docName]: url }))}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tuition Payment Section (If Required) */}
                    {feeRequired && (
                        <div className="space-y-4 pt-2">
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Pay Course Tuition
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Select your preferred tuition plan to complete your course registration.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(course.paymentTermsAllowed === 'one-time' || course.paymentTermsAllowed === 'both' || !course.paymentTermsAllowed) && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('one-time')}
                                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                                            paymentMethod === 'one-time'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">Pay in Full</div>
                                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                                            {course.currency} {formatPriceWithDecimals(effectiveCoursePrice)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">Full upfront payment</div>
                                    </button>
                                )}

                                {(course.paymentTermsAllowed === 'installment' || course.paymentTermsAllowed === 'both' || !course.paymentTermsAllowed) && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('installment')}
                                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                                            paymentMethod === 'installment'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">3-Split Installment</div>
                                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                                            {course.currency} {formatPriceWithDecimals(installmentPrice)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">Initial installment</div>
                                    </button>
                                )}
                            </div>

                            {/* Clear Checkout Disclosure & Consumer Protection */}
                            {!paymentSuccess && (
                                <CheckoutDisclosure
                                    amount={paymentAmount}
                                    currency={course.currency}
                                    itemTitle={`${course.title} (${paymentMethod === 'one-time' ? 'Full Upfront Tuition' : 'First Installment'})`}
                                    baseAmount={baseTuitionAmount}
                                    feeAmount={platform15Addition}
                                    feeLabel="Platform Addition (+15%)"
                                    providerName={providerOrg?.name || "Course Provider"}
                                    transactionType="tuition"
                                    isAcknowledged={isDisclosureAcknowledged}
                                    onAcknowledgeChange={setIsDisclosureAcknowledged}
                                />
                            )}

                            {/* Paystack Payment Button */}
                            {!paymentSuccess && (
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
                                        <span>Total Amount Due Now:</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">{course.currency} {formatPriceWithDecimals(paymentAmount)}</span>
                                    </div>

                                    {!isDisclosureAcknowledged && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium">
                                            Please review and acknowledge the checkout disclosures above to complete payment.
                                        </p>
                                    )}

                                    <PaystackButtonWrapper
                                        email={currentUser.email}
                                        amount={paymentAmount}
                                        currency={course.currency}
                                        subaccountCode={subaccount?.subaccount_code}
                                        courseId={course.id}
                                        courseTitle={course.title}
                                        studentName={currentUser.name}
                                        onSuccess={() => setPaymentSuccess(true)}
                                        onClose={() => {}}
                                        disabled={!isDisclosureAcknowledged}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        <span>Pay Tuition ({course.currency} {formatPriceWithDecimals(paymentAmount)})</span>
                                    </PaystackButtonWrapper>
                                </div>
                            )}

                            {paymentSuccess && (
                                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 font-bold">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Tuition Payment Verified! Click below to enter the classroom.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {missingDocs && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Please attach all required documents before joining.</span>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-3 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-xs transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCompleteJoin}
                        disabled={loading || missingDocs || (feeRequired && !paymentSuccess)}
                        className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 text-xs sm:text-sm"
                    >
                        {loading ? (
                            <span>Joining Course...</span>
                        ) : (
                            <>
                                <span>Accept & Join Classroom</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
