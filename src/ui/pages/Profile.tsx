import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { Link } from 'react-router-dom';
import { 
    FileText, 
    Award, 
    ShieldCheck, 
    Briefcase, 
    GraduationCap, 
    ExternalLink, 
    Settings as SettingsIcon, 
    Building, 
    PlusCircle,
    CheckCircle2,
    Calendar,
    Mail,
    Eye,
    Accessibility
} from 'lucide-react';
import { getNotificationPermission } from '../../lib/pushNotifications';
import { useAccessibility } from '../../store/AccessibilityContext';

export const Profile = () => {
    const { currentUser } = useAuth();
    const { openAccessibilityModal, examTimeMultiplier, dyslexicFont, colorFilter, ttsEnabled } = useAccessibility();
    const pushPermission = getNotificationPermission();

    if (!currentUser) return null;

    const isOrg = currentUser.role === 'organization';
    const isInstructor = currentUser.role === 'instructor';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
            {/* Header Banner */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-90"></div>
                
                <div className="relative pt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                    <div className="flex items-end space-x-5">
                        <div className="w-24 h-24 rounded-2xl bg-slate-900 border-4 border-white dark:border-slate-800 text-white flex items-center justify-center text-3xl font-black shadow-xl">
                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h1>
                                {currentUser.kycVerified && (
                                    <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" title="Identity Verified">
                                        <ShieldCheck className="w-5 h-5" />
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center">
                                <Mail className="w-3.5 h-3.5 mr-1.5" /> {currentUser.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center ${
                                    isOrg 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                        : isInstructor 
                                        ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                }`}>
                                    {isOrg ? <Building className="w-3.5 h-3.5 mr-1" /> : isInstructor ? <Briefcase className="w-3.5 h-3.5 mr-1" /> : <GraduationCap className="w-3.5 h-3.5 mr-1" />}
                                    {currentUser.role} Account
                                </span>

                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    pushPermission === 'granted'
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                }`}>
                                    Push: {pushPermission}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full sm:w-auto flex flex-wrap items-center gap-3">
                        {isOrg && (
                            <Link
                                to={`/org/${currentUser.id}`}
                                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
                            >
                                <Eye className="w-4 h-4" />
                                <span>View Public Webpage Profile</span>
                            </Link>
                        )}
                        {isOrg ? (
                            <Link
                                to="/onboard"
                                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
                            >
                                <Building className="w-4 h-4" />
                                <span>Manage Organization Settings</span>
                            </Link>
                        ) : (
                            <Link
                                to="/settings"
                                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
                            >
                                <SettingsIcon className="w-4 h-4" />
                                <span>Edit Profile & Documents</span>
                            </Link>
                        )}
                    </div>
                </div>

                {(currentUser.headline || currentUser.bio) && (
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        {currentUser.headline && (
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">{currentUser.headline}</p>
                        )}
                        {currentUser.bio && (
                            <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{currentUser.bio}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Organization Specific View */}
            {isOrg && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Building className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organization Account</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Personal settings are hidden for organization profiles.</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        To manage your institutional profile, location, base currency, registration ID, and institutional KYC document, access Organization Settings or preview your live public webpage profile.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to={`/org/${currentUser.id}`}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Public Webpage Profile
                        </Link>
                        <Link
                            to="/onboard"
                            className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                            Go to Organization Settings <ExternalLink className="w-3.5 h-3.5 ml-2" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Students & Instructors Profile Credentials & Documents */}
            {!isOrg && (
                <div className="space-y-6">
                    {/* Master CV / Resume */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Curriculum Vitae (CV) / Resume</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Primary CV attached for course onboarding and instructor applications.</p>
                                </div>
                            </div>
                            <Link to="/settings" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                                Manage <SettingsIcon className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </div>

                        {currentUser.cvUrl ? (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">Primary Resume Document</p>
                                        <p className="text-xs text-emerald-500 font-medium flex items-center">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ready for course applications
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={currentUser.cvUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
                                >
                                    <span>View Document</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        ) : (
                            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No CV uploaded yet to your profile.</p>
                                <Link
                                    to="/settings"
                                    className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Upload CV in Settings
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Accessibility & Special Needs Accommodations Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                                    <Accessibility className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Accessibility & Health Accommodations</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Universal reading ruler, dyslexia font, color filters, and exam multipliers.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => openAccessibilityModal()}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                            >
                                <Accessibility className="w-3.5 h-3.5" />
                                <span>Adjust Suite</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Dyslexia Font</span>
                                <span className={`font-bold ${dyslexicFont ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {dyslexicFont ? 'Active' : 'Default'}
                                </span>
                            </div>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Filter</span>
                                <span className={`font-bold capitalize ${colorFilter !== 'none' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {colorFilter === 'none' ? 'None' : colorFilter.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">TTS Voice</span>
                                <span className={`font-bold ${ttsEnabled ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {ttsEnabled ? 'Active' : 'Off'}
                                </span>
                            </div>
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">Exam Time</span>
                                <span className={`font-bold ${examTimeMultiplier > 1.0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {examTimeMultiplier}x Speed
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Uploaded Certificates & Qualifications */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Certificates & Qualifications</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Pre-uploaded diplomas, certificates, and academic transcripts.</p>
                                </div>
                            </div>
                            <Link to="/settings" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                                Add Certificate <PlusCircle className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </div>

                        {currentUser.userDocuments && currentUser.userDocuments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentUser.userDocuments.map((doc) => (
                                    <div key={doc.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Award className="w-4 h-4 text-amber-500" />
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[180px]">{doc.title}</h3>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                                                {doc.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600/50 text-xs">
                                            <span className="text-slate-400 text-[10px] flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" /> {doc.uploadedAt}
                                            </span>
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center text-xs"
                                            >
                                                View <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No certificates or qualifications added to your profile yet.</p>
                                <Link
                                    to="/settings"
                                    className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Certificates in Settings
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
