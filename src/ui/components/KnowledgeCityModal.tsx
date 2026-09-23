import React from "react";
import { X, ExternalLink, Sparkles, BookOpen, GraduationCap, CheckCircle2, Shield, Layers } from "lucide-react";

interface KnowledgeCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'student' | 'instructor';
}

export const KnowledgeCityModal: React.FC<KnowledgeCityModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'student',
}) => {
  const [activeTab, setActiveTab] = React.useState<'student' | 'instructor'>(defaultTab);

  if (!isOpen) return null;

  const KNOWLEDGE_CITY_PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=com.devekene.KnowledgeCity";

  const handleRedirect = () => {
    window.open(KNOWLEDGE_CITY_PLAYSTORE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header with gradient badge */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Our Sister Ecosystem</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Knowledge City
              </h2>
              <p className="text-sm text-indigo-100/80 max-w-md">
                The open Pan-African marketplace for individual learners and independent course creators.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Tab */}
          <div className="flex bg-black/30 p-1 rounded-xl mt-6 border border-white/10 max-w-md">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === 'student'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>For Individual Students</span>
            </button>
            <button
              onClick={() => setActiveTab('instructor')}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === 'instructor'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>For Independent Instructors</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {activeTab === 'student' ? (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2" />
                  Why Knowledge City for Individual Purchases?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  While <strong>Backpack</strong> specializes in formal institutional cohorts, corporate academies, and accredited university programs, <strong>Knowledge City</strong> is purpose-built for buying standalone, self-paced individual courses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Instant Access:</strong> No organizational applications or admission delays.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>1,000+ Masterclasses:</strong> Tech, design, leadership, entrepreneurship, and trade skills.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Lifetime Ownership:</strong> Watch on-demand anytime from mobile and web.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Pay-As-You-Go:</strong> Buy individual courses with Mobile Money, Card, or Crypto.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRedirect}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25"
                >
                  <span>Get Knowledge City on Google Play</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Stay on Backpack
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2" />
                  Backpack vs Knowledge City for Instructors
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                  On <strong>Backpack</strong>, courses can only be uploaded under verified organizations where you have active institutional permission. If you are looking to publish, distribute, and monetize courses as an <strong>independent / freelance creator</strong>, you should publish on <strong>Knowledge City</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Zero Org Approval:</strong> Sign up and publish courses instantly under your own name.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>85% Direct Royalties:</strong> Direct payouts to your bank or mobile wallet.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Global Marketplace:</strong> Access tens of thousands of active African learners.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Built-in Marketing:</strong> Automatic promotional campaigns & discounts.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRedirect}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25"
                >
                  <span>Open Knowledge City on Google Play</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Stay on Backpack
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
