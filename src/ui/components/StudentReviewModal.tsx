import React, { useState } from 'react';
import { EnrollmentRequest, Course } from '../../types';
import { X, CheckCircle, XCircle, FileText, User, CreditCard, ShieldCheck, DollarSign, MessageSquare, Paperclip, ExternalLink, Ban, History, Calendar, AlertCircle, HeartHandshake, Sparkles } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { AccommodationPlanBadge } from './accessibility/AccommodationPlanBadge';

interface StudentReviewModalProps {
    request: EnrollmentRequest | null;
    course: Course | undefined;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason?: string) => void;
}

export const StudentReviewModal: React.FC<StudentReviewModalProps> = ({
    request,
    course,
    onClose,
    onApprove,
    onReject,
}) => {
    const { organizations, getCourseAdmissionGate } = useAppContext();
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    if (!request) return null;

    const courseOrg = organizations.find(o => o.id === course?.orgId || o.ownerId === course?.orgId);
    const isVocationalDonationFunded = courseOrg?.orgType === 'vocational' && course?.fundingModel === 'donations_sponsorships';
    const gate = (isVocationalDonationFunded && course) ? getCourseAdmissionGate(course.id) : null;

    const handleConfirmReject = () => {
        onReject(request.id, rejectionReason.trim() || undefined);
        setIsRejecting(false);
        onClose();
    };

    const handleConfirmApprove = () => {
        if (gate && !gate.canAdmitMore) {
            alert(`Admission Gate Reached: Donations received (${gate.currency} ${gate.totalDonations.toLocaleString()}) only cover up to ${gate.maxAdmissibleStudents} students. An additional ${gate.currency} ${gate.nextSeatNeededAmount.toLocaleString()} in donations is required to unlock another student admission seat.`);
            return;
        }
        onApprove(request.id);
        onClose();
    };

    const reapplicationCount = (request.reapplicationHistory && request.reapplicationHistory.length) || 0;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3.5 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold text-xl border border-indigo-500/20">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Student Application</h2>
                            {reapplicationCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center">
                                    <History className="w-3 h-3 mr-1" /> Attempt #{reapplicationCount + 1}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Examine submitted documents, statement, and payment option before deciding admission.
                        </p>
                    </div>
                </div>

                <div className="space-y-6 text-sm">
                    {/* Student Info */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Applicant Name</span>
                            <span className="font-bold text-slate-900 dark:text-white text-base">{request.userName || 'Student'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Application Status</span>
                            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                                request.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                request.status === 'cancelled' ? 'bg-slate-500/20 text-slate-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {request.status.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Applied Course</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{request.courseTitle || course?.title}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Admission Intake Session</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center mt-0.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                {request.sessionName || course?.activeSessionName || 'General Session'}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Selected Tuition Plan</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 capitalize flex items-center mt-0.5">
                                <CreditCard className="w-4 h-4 mr-1.5 text-indigo-400" />
                                {request.paymentMethod === 'installment' ? 'Installments (3-Split)' : 'Full Payment'}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Date Submitted</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                {request.appliedAt ? new Date(request.appliedAt).toLocaleDateString() : 'Recent'}
                            </span>
                        </div>
                    </div>

                    {/* Special Needs & Health Accommodation Plan (Reviewer Visibility) */}
                    {request.accommodations && (
                        <AccommodationPlanBadge accommodations={request.accommodations} />
                    )}

                    {/* Vocational Admission Gate & Sponsorship Info */}
                    {isVocationalDonationFunded && gate && (
                        <div className="p-4 bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                                    <HeartHandshake className="w-4 h-4 text-indigo-500" />
                                    <span>Vocational Admission Gate Review</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    gate.canAdmitMore
                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-red-500/20 text-red-700 dark:text-red-300'
                                }`}>
                                    {gate.canAdmitMore ? `${gate.remainingSpots} Funded Spot(s) Open` : 'Gate Capacity Reached'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Donations</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {gate.currency} {gate.totalDonations.toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Cost / Student</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {gate.currency} {gate.tuitionCostPerStudent.toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Gate Capacity</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {gate.maxAdmissibleStudents} Students
                                    </span>
                                </div>
                                <div className="p-2 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Admitted So Far</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {gate.currentlyAdmittedCount}
                                    </span>
                                </div>
                            </div>

                            {request.isSponsored && (
                                <div className="p-3 bg-emerald-100/70 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                                    <div className="font-bold flex items-center">
                                        <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                        <span>Directly Sponsored Student</span>
                                    </div>
                                    <p className="text-[11px]">
                                        Sponsored by <strong>{request.sponsorName || 'Private Donor'}</strong> ({request.sponsorEmail || 'email on file'}). The school is notified to ensure their admission and enrollment.
                                    </p>
                                </div>
                            )}

                            {!gate.canAdmitMore && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Admission gate closed for this course:</strong> All {gate.maxAdmissibleStudents} seats covered by current donations are taken. At least <strong>{gate.currency} {gate.nextSeatNeededAmount.toLocaleString()}</strong> more in donations must be received before admitting another student.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Previous Reapplication History If Present */}
                    {request.reapplicationHistory && request.reapplicationHistory.length > 0 && (
                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                            <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center">
                                <History className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                                Previous Application Attempts ({request.reapplicationHistory.length})
                            </h4>
                            <div className="space-y-1.5">
                                {request.reapplicationHistory.map((past, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {past.sessionName || 'Past Session'}:
                                            </span>{' '}
                                            <span className="text-red-500 dark:text-red-400 font-medium">Declined</span>
                                            {past.rejectionReason && (
                                                <span className="text-slate-500 dark:text-slate-400 italic block text-[11px] mt-0.5">
                                                    Reason: "{past.rejectionReason}"
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {past.appliedAt ? new Date(past.appliedAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Course Pricing Details */}
                    {course && (
                        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <DollarSign className="w-5 h-5 text-indigo-500" />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">Course Tuition Fee</span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                        {course.currency || 'NGN'} {course.price.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold block">Terms Offered</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">
                                    {course.paymentTermsAllowed === 'both' ? 'Full & Installments' : (course.paymentTermsAllowed || 'Full Payment')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Student Statement of Purpose */}
                    {request.studentNotes && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center">
                                <MessageSquare className="w-4 h-4 mr-1.5 text-indigo-500" />
                                Applicant's Statement / Notes
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                "{request.studentNotes}"
                            </p>
                        </div>
                    )}

                    {/* Submitted Required Documents */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center">
                            <FileText className="w-4 h-4 mr-1.5" /> Required Documents Submitted
                        </h3>

                        {request.documents && Object.keys(request.documents).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(request.documents).map(([docName, url]) => (
                                    <div key={docName} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="truncate mr-2">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">{docName}</p>
                                            <span className="text-[10px] text-emerald-500 font-semibold flex items-center mt-0.5">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Verified Upload
                                            </span>
                                        </div>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-lg transition shrink-0 flex items-center space-x-1 shadow-sm"
                                        >
                                            <span>View</span>
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs italic">
                                No required document attachments were uploaded for this application.
                            </div>
                        )}
                    </div>

                    {/* Additional Supporting Documents */}
                    {request.additionalDocuments && request.additionalDocuments.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center">
                                <Paperclip className="w-4 h-4 mr-1.5" /> Additional Supporting Documents
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {request.additionalDocuments.map(doc => (
                                    <div key={doc.id} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="truncate mr-2">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">{doc.name}</p>
                                            <span className="text-[10px] text-slate-400">Custom Attachment</span>
                                        </div>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center space-x-1"
                                        >
                                            <span>View</span>
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admission Requirements Reference */}
                    {course?.requirements && (
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center text-xs">
                                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" /> Organization Admission Criteria Reference
                            </h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                {course.requirements}
                            </div>
                        </div>
                    )}

                    {/* Inline Rejection Reason Form */}
                    {isRejecting && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl space-y-3 animate-in fade-in">
                            <h4 className="font-bold text-xs text-red-700 dark:text-red-300 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1.5 text-red-500" />
                                Constructive Feedback / Rejection Reason (Optional)
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                This feedback will guide the student when they reapply in the next admission session.
                            </p>
                            <textarea
                                rows={2}
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="e.g. Please provide updated academic transcripts or prerequisite certificates; you are encouraged to reapply in the next session."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRejecting(false)}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmReject}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                >
                                    Confirm Decline
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition"
                    >
                        Close
                    </button>
                    {request.status === 'pending' && !isRejecting && (
                        <>
                            <button
                                onClick={() => setIsRejecting(true)}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-semibold text-xs transition flex items-center"
                            >
                                <XCircle className="w-4 h-4 mr-1.5" /> Decline Application
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                disabled={gate ? !gate.canAdmitMore : false}
                                className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition flex items-center shadow-md ${
                                    gate && !gate.canAdmitMore
                                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                }`}
                                title={gate && !gate.canAdmitMore ? 'Gate capacity reached. More donations required.' : 'Approve admission'}
                            >
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Accept & Approve Admission
                            </button>
                        </>
                    )}
                    {request.status === 'cancelled' && (
                        <span className="text-xs text-slate-500 flex items-center">
                            <Ban className="w-4 h-4 mr-1 text-slate-400" /> Cancelled by student
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
