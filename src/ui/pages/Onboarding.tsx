import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { 
    Building, 
    MapPin, 
    DollarSign, 
    ArrowRight, 
    FileText, 
    Award,
    Building2,
    CheckCircle2,
    ArrowLeft
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
        <div className="w-full text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center min-h-[80vh] py-12 px-4 font-body animate-in fade-in zoom-in-95 duration-300">
            
            <div className="w-full max-w-2xl text-center mb-8">
                <div className="w-16 h-16 bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#0078d4]/20 shadow-xs">
                    <Building2 className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight mb-2">
                    Set Up Your Institution
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete your organizational profile to start publishing courses and receiving tuition.
                </p>
            </div>

            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
                
                {/* Progress Bar */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0078d4] dark:text-[#04a4ec] font-heading">
                            Step {step} of 3
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading mt-1">
                            {step === 1 && "Basic Profile Information"}
                            {step === 2 && "Regional Settings"}
                            {step === 3 && "Legal & Accreditation"}
                        </h2>
                    </div>
                    
                    <div className="flex items-center space-x-2 w-full sm:w-40">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[#0078d4]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[#0078d4]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-[#0078d4]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    {/* STEP 1: Profile */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Organization / Institution Name
                                    </label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs" 
                                            placeholder="e.g. Africa Tech Academy" 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Organization Type
                                    </label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <select 
                                            value={formData.orgType} 
                                            onChange={(e) => setFormData({...formData, orgType: e.target.value as 'basic' | 'higher' | 'vocational'})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                                        >
                                            <option value="basic">Basic Education (Nursery, Primary, Secondary)</option>
                                            <option value="higher">Higher Education (Universities, Colleges)</option>
                                            <option value="vocational">Vocational Education (NGOs, Institutes)</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Short Description
                                    </label>
                                    <textarea 
                                        value={formData.description} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs h-28 resize-none leading-relaxed" 
                                        placeholder="Briefly describe what your organization teaches..." 
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-2">
                                <button 
                                    onClick={() => setStep(2)} 
                                    disabled={!formData.name.trim() || !formData.description.trim()} 
                                    className="w-full bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center transition shadow-sm cursor-pointer font-heading"
                                >
                                    Continue to Regional Settings <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Location & Currency */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Headquarters Location / Country
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={formData.location} 
                                            onChange={(e) => setFormData({...formData, location: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs" 
                                            placeholder="e.g. Lagos, Nigeria" 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Base Currency for Tuition
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <select 
                                            value={formData.baseCurrency} 
                                            onChange={(e) => setFormData({...formData, baseCurrency: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs appearance-none cursor-pointer"
                                        >
                                            {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 font-body ml-1">This currency will be used to price all your courses.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition shadow-2xs cursor-pointer font-heading flex items-center justify-center"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setStep(3)} 
                                    disabled={!formData.location.trim()} 
                                    className="flex-1 bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center transition shadow-sm cursor-pointer font-heading"
                                >
                                    Continue to Legal <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Legal KYC & Accreditation */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                        Company / Institution Physical Address
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={formData.address} 
                                            onChange={(e) => setFormData({...formData, address: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs" 
                                            placeholder="e.g. 123 Tech Lane, Victoria Island, Lagos" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.isRegisteredCompany ? 'bg-[#0078d4] border-[#0078d4]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                            {formData.isRegisteredCompany && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isRegisteredCompany} 
                                            onChange={e => setFormData({...formData, isRegisteredCompany: e.target.checked})} 
                                            className="sr-only" 
                                        />
                                        <span className="text-sm text-slate-900 dark:text-white font-bold font-heading">We are a registered company</span>
                                    </label>
                                </div>

                                {formData.isRegisteredCompany && (
                                    <div className="space-y-5 p-5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs animate-in fade-in">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                                Company Registration ID
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={formData.registrationId} 
                                                    onChange={(e) => setFormData({...formData, registrationId: e.target.value})} 
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]/40 focus:border-[#0078d4] transition shadow-2xs" 
                                                    placeholder="e.g. RC 123456" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                                Registration Certificate (PDF/Image)
                                            </label>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                <FileUpload label="Upload Certificate" onUpload={(url) => setFormData({...formData, kycDocumentUrl: url})} />
                                                {formData.kycDocumentUrl && (
                                                    <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 font-heading">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Document Uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ACCREDITATION SECTION */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs mt-4">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.isAccredited ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                            {formData.isAccredited && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isAccredited} 
                                            onChange={e => setFormData({...formData, isAccredited: e.target.checked})} 
                                            className="sr-only" 
                                        />
                                        <span className="text-sm text-slate-900 dark:text-white font-bold font-heading">Institution is Accredited by Official Educational Bodies</span>
                                    </label>
                                </div>

                                {formData.isAccredited && (
                                    <div className="space-y-5 p-5 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-2xs animate-in fade-in">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                                Accrediting Body Name
                                            </label>
                                            <div className="relative">
                                                <Award className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={formData.accreditingBody} 
                                                    onChange={(e) => setFormData({...formData, accreditingBody: e.target.value})} 
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition shadow-2xs" 
                                                    placeholder="e.g. NUC, Ministry of Education, TVET" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                                Accreditation Status
                                            </label>
                                            <select 
                                                value={formData.accreditationStatus} 
                                                onChange={(e) => setFormData({...formData, accreditationStatus: e.target.value as 'accredited' | 'pending' | 'unaccredited'})} 
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition shadow-2xs appearance-none cursor-pointer"
                                            >
                                                <option value="accredited">Fully Accredited</option>
                                                <option value="pending">Accreditation Pending</option>
                                                <option value="unaccredited">Provisional / Unaccredited</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 font-heading">
                                                Upload Accreditation Certificate / Proof
                                            </label>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                <FileUpload label="Upload Accreditation Document" onUpload={(url) => setFormData({...formData, accreditationDocUrl: url})} />
                                                {formData.accreditationDocUrl && (
                                                    <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 font-heading">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Proof Uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStep(2)} 
                                    className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition shadow-2xs cursor-pointer font-heading flex items-center justify-center"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading || !formData.address.trim()} 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center transition shadow-sm cursor-pointer font-heading"
                                >
                                    {loading ? 'Saving Profile...' : 'Complete Registration'} <CheckCircle2 className="w-4 h-4 ml-2" />
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            
            <div className="mt-6 text-center">
                <Link to="/dashboard" className="text-xs font-bold text-slate-500 hover:text-[#0078d4] dark:text-slate-400 dark:hover:text-[#04a4ec] transition font-heading">
                    Cancel and return to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default Onboarding;