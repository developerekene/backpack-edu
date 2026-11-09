import React, { useState, useMemo } from "react";
import {
  Globe,
  ShieldCheck,
  ChevronRight,
  Loader2,
  AlertCircle,
  Copy,
  Building2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Organization } from "../../types";
import { useAppContext } from "../../store/AppContext";

interface DomainVerificationCardProps {
  organization: Organization;
}

export const DomainVerificationCard: React.FC<DomainVerificationCardProps> = ({
  organization,
}) => {
  const { updateOrganization } = useAppContext();
  const [domain, setDomain] = useState(organization.domain || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<"input" | "instructions" | "success">(
    organization.isDomainVerified ? "success" : "input"
  );
  const [method] = useState<"dns" | "meta" | "html">("dns");
  const [error, setError] = useState("");

  const verificationToken = useMemo(
    () => organization.domainVerificationToken || `backpack-verify-${organization.id || "org"}`,
    [organization.domainVerificationToken, organization.id]
  );

  const handleStartVerification = async () => {
    if (!domain.trim()) {
      setError("Please enter a valid domain name.");
      return;
    }
    setError("");
    setIsVerifying(true);
    
    try {
      // Save domain and token if not already saved
      await updateOrganization(organization.id, {
        domain: domain.trim(),
        domainVerificationToken: verificationToken,
        isDomainVerified: false,
      });
      setStep("instructions");
    } catch {
      setError("Failed to initialize verification. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyNow = async () => {
    setIsVerifying(true);
    setError("");
    
    // Simulate DNS check
    setTimeout(async () => {
      try {
        await updateOrganization(organization.id, {
          isDomainVerified: true,
          domainVerificationMethod: method,
        });
        setStep("success");
      } catch {
        setError("Verification failed. DNS record not found yet. It may take up to 24 hours for DNS changes to propagate.");
      } finally {
        setIsVerifying(false);
      }
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (step === "success") {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl p-6 sm:p-8 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
              Domain Verified
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              {organization.domain || domain} is successfully connected to your institution.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
          Your organization is now verified. You can now use custom branding, professional email delivery, and white-labeled portals for your students.
        </p>
        <div className="pt-2">
          <button 
            onClick={() => setStep("input")}
            className="text-xs font-bold text-[#0078d4] hover:underline flex items-center gap-1"
          >
            Change custom domain <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "instructions") {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 animate-in slide-in-from-right-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Verify domain ownership
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                {domain}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setStep("input")}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Back
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm font-bold text-slate-900 dark:text-white font-heading">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px]">1</span>
              <h4>Instructions for DNS verification:</h4>
            </div>
            
            <div className="ml-10 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-body">
                  Press start verification below to verify with a few easy steps by authorizing Google to access your DNS account on <strong className="text-slate-900 dark:text-white">GoDaddy.com</strong>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleVerifyNow}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Start Verification</span>
                  </button>
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    Please wait for verification to complete before closing this tab.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Manual Alternative (TXT Record)</p>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[10px] flex items-center justify-between group">
                  <code className="text-emerald-400">google-site-verification={verificationToken}</code>
                  <button 
                    onClick={() => copyToClipboard(`google-site-verification=${verificationToken}`)}
                    className="p-1.5 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-heading mb-1">
                    Can’t verify via Domain name provider?
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-body">
                    For more verification methods, try a URL prefix property instead
                  </p>
                </div>
                <button className="text-xs font-bold text-[#0078d4] hover:underline flex items-center gap-1">
                  View other methods <ExternalLink className="w-3 h-3" />
                </button>
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center space-x-4 border-b border-slate-100 dark:border-slate-700 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-[#0078d4]/10 text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center">
          <Globe className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Institutional Custom Domain
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-body mt-0.5">
            Connect your own domain to white-label your academy and student portals.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-heading">
            Domain Name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-body"
                placeholder="e.g. academy.edu.ng"
              />
            </div>
            <button
              onClick={handleStartVerification}
              disabled={isVerifying || !domain}
              className="px-6 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Verify Domain</span>
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>SSL & Security</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-body">
              Automatic SSL certificates provisioned for your custom domain upon successful verification.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Institutional Branding</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-body">
              Remove Backpack branding from student emails and login pages for a professional experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
