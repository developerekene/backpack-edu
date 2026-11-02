import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { BlueBackpack3DIcon } from "../components/BlueBackpack3DIcon";
import authBanner from "../../assets/images/auth_banner.jpg";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Video,
  Banknote,
  Star,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { login, resetPassword, currentUser } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g. user@example.com).");
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || "Failed to login";
      if (
        errorMessage.includes("invalid-credential") ||
        errorMessage.includes("wrong-password") ||
        errorMessage.includes("user-not-found")
      ) {
        setError(
          "Invalid email or password. Please check your credentials and try again.",
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(cleanEmail);
      setResetSuccess(
        `Password reset link sent to ${cleanEmail}. Check your inbox!`,
      );
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message || "Failed to send password reset email.";
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0f2231] rounded-3xl border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
        {/* Left Flank: Visual Brand Showcase */}
        <div className="relative hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0078d4] to-[#004e8a] text-white p-8 xl:p-10 flex-col justify-between overflow-hidden">
          {/* Background illustration & gradient overlay */}
          <img
            src={authBanner}
            alt="Backpack learning community"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002f52]/95 via-[#005a9e]/60 to-transparent pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-3">
            <Link to="/" className="inline-flex items-center space-x-3 group">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                <BlueBackpack3DIcon className="w-8 h-8 drop-shadow-md" />
              </div>
              <div>
                <span className="font-extrabold text-xl font-heading tracking-tight text-white block">
                  BACKPACK
                </span>
                <span className="text-[10px] uppercase font-bold text-sky-200 tracking-wider block font-heading">
                  Education Without Borders
                </span>
              </div>
            </Link>
          </div>

          {/* Center Pitch */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl xl:text-3xl font-extrabold font-heading leading-tight text-white">
                Empowering Students, Teachers, and Academies.
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed font-body">
                Access live HD classrooms, view accredited telemetry, and
                connect with institutions across Africa.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>Verified university & vocational credentials</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Video className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>LiveKit HD interactive lecture rooms</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Banknote className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>Direct regional bank settlements</span>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-1">
            <div className="flex items-center space-x-1 text-amber-300">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
              <span className="text-xs font-bold text-white ml-1.5 font-heading">
                100+ Academies
              </span>
            </div>
            <p className="text-[11px] text-sky-100 font-body">
              Trusted by secondary schools, universities, and vocational
              centers.
            </p>
          </div>
        </div>

        {/* Right Flank: Form Container */}
        <div className="lg:col-span-7 p-6 sm:p-10 xl:p-12 flex flex-col justify-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="lg:hidden flex items-center space-x-2.5 mb-2">
              <BlueBackpack3DIcon className="w-8 h-8" />
              <span className="font-extrabold text-lg font-heading text-slate-900 dark:text-white">
                BACKPACK
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
              Sign in to your learning portal and continue your coursework.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed font-body">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 font-body">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                Email Address
              </label>
              <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-body"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError("");
                    setResetSuccess("");
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-[#0078d4] dark:text-[#04a4ec] hover:underline font-heading cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-body"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] active:scale-[0.99] disabled:opacity-50 text-white font-bold font-heading shadow-md shadow-blue-500/15 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-body">
            <span>Don't have an account yet? </span>
            <Link
              to="/signup"
              className="text-[#0078d4] dark:text-[#04a4ec] hover:underline font-bold font-heading ml-1"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f2231] rounded-3xl max-w-md w-full border border-[#d6e9f8] dark:border-[#1e3a52] shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#d6e9f8]/60 dark:bg-[#1a384f] text-[#0078d4] dark:text-[#04a4ec] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                    Reset Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                    We'll email you a secure reset link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-body">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center font-body">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-4 font-body">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                  Your Email Address
                </label>
                <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4]">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-body"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 bg-[#e2f0fb] dark:bg-[#1a384f] hover:bg-[#d6e9f8] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition font-heading cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 font-heading shadow-xs cursor-pointer"
                >
                  {resetLoading ? "Sending..." : "Send Link"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
