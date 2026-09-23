import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { 
    Building, 
    MapPin, 
    DollarSign, 
    ArrowRight, 
    FileText, 
    Award
} from "lucide-react";
import { FileUpload } from '../components/FileUpload';

const Onboarding = () => {
    const navigate = useNavigate();
    const { addOrganization, updateOrganization, organizations } = useAppContext();
    const { currentUser, updateCurrentUser } = useAuth();
    
    const existingOrg = organizations.find(o => o.ownerId === currentUser?.id || o.id === currentUser?.id);
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState(() => ({
        name: existingOrg?.name || currentUser?.name || "",
        description: existingOrg?.description || currentUser?.description || "",
        location: existingOrg?.location || currentUser?.location || "",
        baseCurrency: existingOrg?.baseCurrency || currentUser?.baseCurrency || "NGN",
        orgType: ((existingOrg?.orgType || currentUser?.orgType || "basic") as 'basic' | 'higher' | 'vocational'),
        address: existingOrg?.address || currentUser?.address || "",
        registrationId: existingOrg?.registrationId || currentUser?.registrationId || "",
        kycDocumentUrl: existingOrg?.kycDocumentUrl || currentUser?.kycDocumentUrl || "",
        isRegisteredCompany: !!(existingOrg?.registrationId || currentUser?.registrationId || existingOrg?.kycDocumentUrl || currentUser?.kycDocumentUrl),
        isAccredited: existingOrg?.isAccredited ?? currentUser?.isAccredited ?? false,
        accreditingBody: existingOrg?.accreditingBody || currentUser?.accreditingBody || "",
        accreditationStatus: existingOrg?.accreditationStatus || currentUser?.accreditationStatus || ((existingOrg?.isAccredited ?? currentUser?.isAccredited) ? 'accredited' : 'unaccredited'),
        accreditationDocUrl: existingOrg?.accreditationDocUrl || currentUser?.accreditationDocUrl || ""
    }));

    // Auto-redirect effect removed as step 4 is removed
    useEffect(() => {
        // Step 4 removed
    }, []);

    const currencies = [
        { code: "NGN", name: "Nigerian Naira" },
        { code: "KES", name: "Kenyan Shilling" },
        { code: "ZAR", name: "South African Rand" },
        { code: "GHS", name: "Ghanaian Cedi" },
        { code: "USD", name: "US Dollar (Pan-Africa)" }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setLoading(true);

        try {
            const orgPayload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                baseCurrency: formData.baseCurrency,
                location: formData.location.trim(),
                orgType: formData.orgType,
                address: formData.address.trim(),
                registrationId: formData.registrationId.trim(),
                kycDocumentUrl: formData.kycDocumentUrl,
                isAccredited: formData.isAccredited,
                accreditingBody: formData.accreditingBody.trim(),
                accreditationStatus: formData.accreditationStatus as 'accredited' | 'pending' | 'unaccredited',
                accreditationDocUrl: formData.accreditationDocUrl,
                kycVerified: true
            };

            if (existingOrg) {
                await updateOrganization(existingOrg.id, orgPayload);
            } else {
                await addOrganization({
                    id: currentUser.id,
                    ownerId: currentUser.id,
                    ...orgPayload
                });
            }

            await updateCurrentUser({
                role: 'organization',
                ...orgPayload
            });

            navigate('/dashboard');
        } catch (err) {
            console.error("Error submitting KYC:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-8 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                            Organization Setup
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Configure your organization profile and KYC verification.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 sm:w-36">
                        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                        <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                    </div>
                </div>

                <div className="p-8">
                    {/* STEP 1: Profile */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Organization / Institution Name</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="e.g. Africa Tech Academy" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Organization Type</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <select 
                                            value={formData.orgType} 
                                            onChange={(e) => setFormData({...formData, orgType: e.target.value as 'basic' | 'higher' | 'vocational'})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none"
                                        >
                                            <option value="basic">Basic Education (Nursery, Primary, Secondary)</option>
                                            <option value="higher">Higher Education (Universities, Colleges)</option>
                                            <option value="vocational">Vocational Education (NGOs, Institutes)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Short Description</label>
                                    <textarea 
                                        value={formData.description} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 h-24" 
                                        placeholder="What does your organization teach?" 
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!formData.name.trim() || !formData.description.trim()} 
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center transition shadow-md"
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Location & Currency */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Headquarters Location / Country</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={formData.location} 
                                            onChange={(e) => setFormData({...formData, location: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="e.g. Lagos, Nigeria" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Base Currency</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <select 
                                            value={formData.baseCurrency} 
                                            onChange={(e) => setFormData({...formData, baseCurrency: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none"
                                        >
                                            {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-bold transition"
                                >
                                    Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setStep(3)} 
                                    disabled={!formData.location.trim()} 
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center transition shadow-md"
                                >
                                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Legal KYC & Accreditation */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Company / Institution Physical Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={formData.address} 
                                            onChange={(e) => setFormData({...formData, address: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="e.g. 123 Tech Lane, Victoria Island, Lagos" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isRegisteredCompany} 
                                            onChange={e => setFormData({...formData, isRegisteredCompany: e.target.checked})} 
                                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-900" 
                                        />
                                        <span className="text-slate-900 dark:text-white font-medium">We are a registered company</span>
                                    </label>
                                </div>
                                {formData.isRegisteredCompany && (
                                    <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Company Registration ID</label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                                <input 
                                                    type="text" 
                                                    value={formData.registrationId} 
                                                    onChange={(e) => setFormData({...formData, registrationId: e.target.value})} 
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                                    placeholder="e.g. RC 123456" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Registration Certificate (PDF/Image)</label>
                                            <FileUpload label="Upload Certificate" onUpload={(url) => setFormData({...formData, kycDocumentUrl: url})} />
                                            {formData.kycDocumentUrl && <div className="mt-2 text-xs text-emerald-400 font-medium">Document uploaded successfully.</div>}
                                        </div>
                                    </div>
                                )}

                                {/* ACCREDITATION SECTION */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isAccredited} 
                                            onChange={e => setFormData({...formData, isAccredited: e.target.checked})} 
                                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-900" 
                                        />
                                        <span className="text-slate-900 dark:text-white font-medium">Institution is Accredited by Official Educational Bodies</span>
                                    </label>
                                </div>

                                {formData.isAccredited && (
                                    <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Accrediting Body Name</label>
                                            <div className="relative">
                                                <Award className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                                <input 
                                                    type="text" 
                                                    value={formData.accreditingBody} 
                                                    onChange={(e) => setFormData({...formData, accreditingBody: e.target.value})} 
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                                    placeholder="e.g. NUC, Ministry of Education, TVET" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Accreditation Status</label>
                                            <select 
                                                value={formData.accreditationStatus} 
                                                onChange={(e) => setFormData({...formData, accreditationStatus: e.target.value as 'accredited' | 'pending' | 'unaccredited'})} 
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="accredited">Fully Accredited</option>
                                                <option value="pending">Accreditation Pending</option>
                                                <option value="unaccredited">Provisional / Unaccredited</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Upload Accreditation Certificate / Proof</label>
                                            <FileUpload label="Upload Accreditation Document" onUpload={(url) => setFormData({...formData, accreditationDocUrl: url})} />
                                            {formData.accreditationDocUrl && <div className="mt-2 text-xs text-emerald-400 font-medium">Accreditation proof uploaded successfully.</div>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(2)} 
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-bold transition"
                                >
                                    Back
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading || !formData.address.trim()} 
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center transition shadow-md"
                                >
                                    {loading ? 'Saving...' : 'Continue'} <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;

