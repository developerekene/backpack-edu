import React, { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useAppContext } from '../../store/AppContext';
import { 
    ShieldCheck, 
    User as UserIcon, 
    Send, 
    AlertTriangle, 
    Bell, 
    CheckCircle2, 
    Volume2, 
    FileText, 
    Award, 
    Trash2, 
    Plus, 
    Building, 
    ExternalLink,
    Save,
    Accessibility
} from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { getNotificationPermission, requestPushPermission, sendPushNotification } from '../../lib/pushNotifications';
import { UserDocument } from '../../types';
import { Link } from 'react-router-dom';
import { PaystackSubaccountOnboarding } from '../components/PaystackSubaccountOnboarding';
import { useAccessibility } from '../../store/AccessibilityContext';

export const Settings = () => {
    const { currentUser, updateCurrentUser } = useAuth();
    const { addNotification, organizations, updateOrganization } = useAppContext();
    const { openAccessibilityModal, examTimeMultiplier, dyslexicFont, colorFilter, ttsEnabled } = useAccessibility();
    const existingOrg = organizations.find(o => o.ownerId === currentUser?.id || o.id === currentUser?.id);
    const [loading, setLoading] = useState(false);
    
    // Organization state
    const [orgName, setOrgName] = useState(() => existingOrg?.name || currentUser?.name || '');
    const [orgType, setOrgType] = useState(() => ((existingOrg?.orgType || currentUser?.orgType || 'basic') as 'basic' | 'higher' | 'vocational'));
    const [orgDesc, setOrgDesc] = useState(() => existingOrg?.description || currentUser?.description || '');
    const [orgLocation, setOrgLocation] = useState(() => existingOrg?.location || currentUser?.location || '');
    const [orgCurrency, setOrgCurrency] = useState(() => existingOrg?.baseCurrency || currentUser?.baseCurrency || 'NGN');
    const [orgAddress, setOrgAddress] = useState(() => existingOrg?.address || currentUser?.address || '');
    const [orgRegId, setOrgRegId] = useState(() => existingOrg?.registrationId || currentUser?.registrationId || '');
    const [orgKycDoc, setOrgKycDoc] = useState(() => existingOrg?.kycDocumentUrl || currentUser?.kycDocumentUrl || '');
    const [isRegistered, setIsRegistered] = useState(() => !!(existingOrg?.registrationId || currentUser?.registrationId || existingOrg?.kycDocumentUrl || currentUser?.kycDocumentUrl));
    const [isAccredited, setIsAccredited] = useState(() => existingOrg?.isAccredited ?? currentUser?.isAccredited ?? false);
    const [accreditingBody, setAccreditingBody] = useState(() => existingOrg?.accreditingBody || currentUser?.accreditingBody || '');
    const [accreditationStatus, setAccreditationStatus] = useState(() => existingOrg?.accreditationStatus || currentUser?.accreditationStatus || 'accredited');
    const [accreditationDocUrl, setAccreditationDocUrl] = useState(() => existingOrg?.accreditationDocUrl || currentUser?.accreditationDocUrl || '');
    const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);

    // Profile info state initialized from currentUser
    const [name, setName] = useState(() => currentUser?.name || '');
    const [headline, setHeadline] = useState(() => currentUser?.headline || '');
    const [bio, setBio] = useState(() => currentUser?.bio || '');
    const [cvUrl, setCvUrl] = useState(() => currentUser?.cvUrl || '');
    const [userKycDoc, setUserKycDoc] = useState(() => currentUser?.kycDocumentUrl || '');

    // Certificate state
    const [userDocs, setUserDocs] = useState<UserDocument[]>(() => currentUser?.userDocuments || []);
    const [newCertTitle, setNewCertTitle] = useState('');
    const [newCertCategory, setNewCertCategory] = useState<'certificate' | 'cv' | 'transcript' | 'id_proof' | 'other'>('certificate');
    const [newCertUrl, setNewCertUrl] = useState('');
    const [certAddedStatus, setCertAddedStatus] = useState(false);

    // Push state
    const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => getNotificationPermission());
    const [testAlertSent, setTestAlertSent] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    if (!currentUser) return null;

    const handleOrgSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const orgPayload = {
                name: orgName.trim(),
                description: orgDesc.trim(),
                baseCurrency: orgCurrency,
                location: orgLocation.trim(),
                orgType: orgType,
                address: orgAddress.trim(),
                registrationId: orgRegId.trim(),
                kycDocumentUrl: orgKycDoc,
                isAccredited: isAccredited,
                accreditingBody: accreditingBody.trim(),
                accreditationStatus: accreditationStatus as 'accredited' | 'pending' | 'unaccredited',
                accreditationDocUrl: accreditationDocUrl,
                kycVerified: true
            };

            if (existingOrg) {
                await updateOrganization(existingOrg.id, orgPayload);
            }
            await updateCurrentUser({
                role: 'organization',
                ...orgPayload
            });

            setOrgSaveSuccess(true);
            setTimeout(() => setOrgSaveSuccess(false), 4000);
        } catch (err) {
            console.error("Failed to update organization settings:", err);
        } finally {
            setLoading(false);
        }
    };

    // IF USER IS AN ORGANIZATION: Render Organization Settings Panel
    if (currentUser.role === 'organization') {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-16">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                Institutional Account
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Organization Settings</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage your institution profile, KYC documents, and payout subaccounts.</p>
                    </div>

                    <Link
                        to="/onboard"
                        className="inline-flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto space-x-1.5"
                    >
                        <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Organization Setup</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1 text-slate-400" />
                    </Link>
                </div>

                {orgSaveSuccess && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between text-sm animate-in fade-in">
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="font-semibold">Institutional profile and KYC documents updated successfully!</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleOrgSave} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 space-y-8 shadow-sm">
                    {/* Basic Info */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Building className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Institution Profile
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Institution Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Institution Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={orgType}
                                    onChange={(e) => setOrgType(e.target.value as 'basic' | 'higher' | 'vocational')}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="basic">Basic Education (Primary & Secondary)</option>
                                    <option value="higher">Higher Education (Colleges & Universities)</option>
                                    <option value="vocational">Vocational Education (NGOs & Institutes)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Mission & Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={orgDesc}
                                    onChange={(e) => setOrgDesc(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                                    placeholder="Describe your academic programs and goals..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Headquarters Location / Country <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orgLocation}
                                    onChange={(e) => setOrgLocation(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Settlement Currency <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={orgCurrency}
                                    onChange={(e) => setOrgCurrency(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="NGN">NGN - Nigerian Naira (₦)</option>
                                    <option value="KES">KES - Kenyan Shilling (KSh)</option>
                                    <option value="ZAR">ZAR - South African Rand (R)</option>
                                    <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                                    <option value="USD">USD - US Dollar ($)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Legal & KYC */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Legal Registration & Educational KYC
                        </h2>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                Official Physical Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={orgAddress}
                                onChange={(e) => setOrgAddress(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. 14 Victoria Island, Lagos, Nigeria"
                            />
                        </div>

                        {/* Registration Section */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRegistered}
                                    onChange={(e) => setIsRegistered(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    Registered Corporate / Educational Entity
                                </span>
                            </label>

                            {isRegistered && (
                                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Registration / Tax ID (RC Number / EIN / BN)
                                        </label>
                                        <input
                                            type="text"
                                            value={orgRegId}
                                            onChange={(e) => setOrgRegId(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g. RC 1892834"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Upload Certificate of Incorporation / Registration Proof (PDF or Image)
                                        </label>
                                        <FileUpload
                                            label="Upload Registration Document"
                                            onUpload={(url) => setOrgKycDoc(url)}
                                        />
                                        {orgKycDoc && (
                                            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Certificate attached
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Accreditation Section */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAccredited}
                                    onChange={(e) => setIsAccredited(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    Institution is Accredited by Official Educational Bodies
                                </span>
                            </label>

                            {isAccredited && (
                                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Accrediting Body Name
                                            </label>
                                            <input
                                                type="text"
                                                value={accreditingBody}
                                                onChange={(e) => setAccreditingBody(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g. Ministry of Education, TVET, NUC"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Accreditation Status
                                            </label>
                                            <select
                                                value={accreditationStatus}
                                                onChange={(e) => setAccreditationStatus(e.target.value as 'accredited' | 'pending' | 'unaccredited')}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="accredited">Fully Accredited</option>
                                                <option value="pending">Accreditation Pending Review</option>
                                                <option value="unaccredited">Provisional / Unaccredited</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Upload Accreditation Certificate / License (PDF or Image)
                                        </label>
                                        <FileUpload
                                            label="Upload Accreditation Document"
                                            onUpload={(url) => setAccreditationDocUrl(url)}
                                        />
                                        {accreditationDocUrl && (
                                            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accreditation proof attached
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !orgName.trim()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center transition shadow-md text-sm cursor-pointer"
                        >
                            {loading ? 'Saving...' : 'Save Organization Settings'}
                            <Save className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </form>

                {/* Paystack Split Payouts Section */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
                    <PaystackSubaccountOnboarding />
                </div>
            </div>
        );
    }

    // Push Handlers
    const handleEnablePush = async () => {
        const perm = await requestPushPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
            sendPushNotification("Push Notifications Active! 🔔", {
                body: "You will receive real-time desktop alerts for live classes, course updates, and grades."
            });
        }
    };

    const handleTestPush = () => {
        sendPushNotification("Backpack LMS Push Test 🚀", {
            body: "Desktop push notifications are active for your profile!",
            linkUrl: "/profile"
        });
        addNotification({
            title: "Settings Test Notification 🔔",
            message: "Push notifications are set up successfully.",
            type: "info"
        });
        setTestAlertSent(true);
        setTimeout(() => setTestAlertSent(false), 3000);
    };

    // Save Profile & CV / Resume Details
    const handleSaveProfile = async () => {
        setLoading(true);
        await updateCurrentUser({
            name,
            headline,
            bio,
            cvUrl,
            kycDocumentUrl: userKycDoc,
            userDocuments: userDocs
        });
        setLoading(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    // Add Certificate / Document
    const handleAddCertificate = async () => {
        if (!newCertTitle.trim() || !newCertUrl) {
            alert("Please enter a title and upload the document file.");
            return;
        }

        const newDoc: UserDocument = {
            id: `doc_${Math.random().toString(36).substring(2, 15)}`,
            title: newCertTitle.trim(),
            url: newCertUrl,
            category: newCertCategory,
            uploadedAt: new Date().toISOString().split('T')[0]
        };

        const updatedDocs = [...userDocs, newDoc];
        setUserDocs(updatedDocs);

        setLoading(true);
        await updateCurrentUser({ userDocuments: updatedDocs });
        setLoading(false);

        setNewCertTitle('');
        setNewCertUrl('');
        setCertAddedStatus(true);
        setTimeout(() => setCertAddedStatus(false), 3000);
    };

    // Delete Document
    const handleDeleteDoc = async (docId: string) => {
        const updatedDocs = userDocs.filter(d => d.id !== docId);
        setUserDocs(updatedDocs);
        await updateCurrentUser({ userDocuments: updatedDocs });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Profile & Credentials</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Manage your personal profile, CV, certificates, and notification settings for seamless course onboarding.
                </p>
            </div>

            {saveSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center text-sm font-bold text-emerald-500">
                    <CheckCircle2 className="w-5 h-5 mr-3" />
                    Profile & Documents saved successfully! Your changes are active across Backpack.
                </div>
            )}

            {/* Basic Profile Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Information</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your display profile seen by instructors and course administrators.</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={currentUser.email}
                                disabled
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-500 text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Professional Headline / Title</label>
                        <input
                            type="text"
                            value={headline}
                            onChange={e => setHeadline(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Computer Science Student & Frontend Developer"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Short Bio</label>
                        <textarea
                            rows={3}
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Share your academic interests, career goals, or background..."
                        />
                    </div>
                </div>
            </div>

            {/* CV / Resume Upload Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Curriculum Vitae (CV) / Resume</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Attach your standard CV to automatically satisfy course entry requirements.</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {cvUrl && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <FileText className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">CV Attached to Profile</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Available for 1-click attachment during course applications.</p>
                                </div>
                            </div>
                            <a
                                href={cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold transition hover:bg-indigo-500 flex items-center space-x-1"
                            >
                                <span>Preview CV</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Upload or Replace CV (PDF/DOC)</label>
                        <FileUpload
                            label="Upload Master CV / Resume"
                            onUpload={(url) => setCvUrl(url)}
                        />
                    </div>
                </div>
            </div>

            {/* Certificates & Qualifications Vault */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Certificates & Academic Vault</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Store diplomas, prerequisite certificates, and transcripts for course onboarding.</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Add Certificate Form */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                            <Plus className="w-4 h-4 mr-1.5 text-indigo-500" /> Add New Certificate or Credential
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Document Title</label>
                                <input
                                    type="text"
                                    value={newCertTitle}
                                    onChange={e => setNewCertTitle(e.target.value)}
                                    placeholder="e.g. High School Diploma, Python Cert..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                                <select
                                    value={newCertCategory}
                                    onChange={e => setNewCertCategory(e.target.value as 'certificate' | 'transcript' | 'cv' | 'id_proof' | 'other')}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="certificate">Certificate / Diploma</option>
                                    <option value="transcript">Academic Transcript</option>
                                    <option value="cv">Specialized CV</option>
                                    <option value="id_proof">ID Proof</option>
                                    <option value="other">Other Prerequisite</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Upload File</label>
                            <FileUpload
                                label="Upload Certificate File"
                                onUpload={url => setNewCertUrl(url)}
                            />
                            {newCertUrl && (
                                <p className="text-xs text-emerald-500 font-medium mt-1.5 flex items-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Document attached! Click "Save to Vault" below.
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleAddCertificate}
                            disabled={!newCertTitle.trim() || !newCertUrl}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Save Certificate to Vault</span>
                        </button>

                        {certAddedStatus && (
                            <p className="text-xs font-bold text-emerald-500 flex items-center animate-pulse">
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Certificate added successfully!
                            </p>
                        )}
                    </div>

                    {/* Document List */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Your Saved Credentials ({userDocs.length})
                        </h3>

                        {userDocs.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">No credentials uploaded yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {userDocs.map((doc) => (
                                    <div key={doc.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Award className="w-5 h-5 text-amber-500" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{doc.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                                                    {doc.category} • Uploaded {doc.uploadedAt}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 transition flex items-center space-x-1"
                                            >
                                                <span>View</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteDoc(doc.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                                title="Delete Document"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Identity Document (KYC) Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Identity Verification (KYC)</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Government ID verification for certified course qualifications.</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {currentUser.kycVerified ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center">
                            <ShieldCheck className="w-6 h-6 text-emerald-400 mr-3" />
                            <div>
                                <h3 className="font-bold text-emerald-400 text-sm">Identity Verified</h3>
                                <p className="text-xs text-emerald-500/80">Your government-issued identity document is verified.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center">
                            <AlertTriangle className="w-6 h-6 text-amber-400 mr-3" />
                            <div>
                                <h3 className="font-bold text-amber-400 text-sm">Verification Pending</h3>
                                <p className="text-xs text-amber-500/80">Upload a valid government-issued ID (Passport, National ID, Driver's License) to verify your identity.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Government ID Document</label>
                        <FileUpload label="Upload ID Document" onUpload={(url) => setUserKycDoc(url)} />
                        {userKycDoc && <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Government ID uploaded.</div>}
                    </div>
                </div>
            </div>

            {/* Instructor Paystack Split Payouts Subaccount */}
            {currentUser.role === 'instructor' && (
                <div className="pt-2">
                    <PaystackSubaccountOnboarding />
                </div>
            )}

            {/* Accessibility & Special Needs Accommodations Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            <Accessibility className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accessibility & Special Needs</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure visual filters, dyslexia fonts, TTS reader, and health accommodations.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => openAccessibilityModal()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                        <Accessibility className="w-4 h-4" />
                        <span>Open Accessibility Suite</span>
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Dyslexia Font</span>
                            <span className={`text-xs font-bold ${dyslexicFont ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                {dyslexicFont ? 'Enabled (OpenDyslexic)' : 'Default Font'}
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Eye-Strain Filter</span>
                            <span className={`text-xs font-bold capitalize ${colorFilter !== 'none' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                {colorFilter === 'none' ? 'None' : colorFilter.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">TTS Audio Reader</span>
                            <span className={`text-xs font-bold ${ttsEnabled ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                {ttsEnabled ? 'Active' : 'Off'}
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Exam Multiplier</span>
                            <span className={`text-xs font-bold ${examTimeMultiplier > 1.0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                {examTimeMultiplier}x Time
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification & Push Preferences Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Push & Notification Preferences</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Desktop push notifications for live classes and assignment updates.</p>
                        </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        pushPermission === 'granted' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : pushPermission === 'denied'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                        Status: {pushPermission}
                    </span>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Volume2 className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Browser Push Alerts</h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Receive instant desktop popups when live classes start or when your assignments are graded.
                            </p>
                        </div>
                        <div className="flex items-center space-x-3 whitespace-nowrap">
                            {pushPermission !== 'granted' ? (
                                <button
                                    onClick={handleEnablePush}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center space-x-2"
                                >
                                    <Bell className="w-4 h-4" />
                                    <span>Enable Push Notifications</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleTestPush}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center space-x-2"
                                >
                                    <Send className="w-4 h-4 text-indigo-500" />
                                    <span>Send Test Push</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {testAlertSent && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center text-xs font-bold text-emerald-500">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Test push notification dispatched! Check your desktop banner.
                        </div>
                    )}
                </div>
            </div>

            {/* Save All Changes Floating Bar */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <Link to="/profile" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    ← Back to Public Profile
                </Link>

                <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition flex items-center shadow-lg shadow-indigo-600/30"
                >
                    {loading ? (
                        <span>Saving Changes...</span>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            <span>Save Profile & Settings</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
