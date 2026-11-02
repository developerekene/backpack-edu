import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { Role } from "../../types";
import { BlueBackpack3DIcon } from "../components/BlueBackpack3DIcon";
import authBanner from "../../assets/images/auth_banner.jpg";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Video,
  Banknote,
  Star,
  Loader2,
  Building2,
  GraduationCap,
  UserCheck,
  AlertCircle,
} from "lucide-react";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, currentUser } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate page
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "organization") {
        navigate("/onboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match. Please ensure both passwords are identical.",
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await signup(name.trim(), cleanEmail, password, role);
      if (res.role === "organization") {
        navigate("/onboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as Error)?.message || "Failed to create account";
      if (
        errorMessage.toLowerCase().includes("permission") ||
        errorMessage.toLowerCase().includes("missing or insufficient")
      ) {
        setError(
          "Missing or insufficient permissions. Please check Firebase Firestore permissions.",
        );
      } else if (errorMessage.includes("email-already-in-use")) {
        setError(
          "This email address is already registered. Please sign in instead.",
        );
      } else if (errorMessage.includes("weak-password")) {
        setError("Password should be at least 6 characters.");
      } else if (errorMessage.includes("invalid-email")) {
        setError("Please enter a valid actual email address.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
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
                Start Your Learning & Teaching Journey Today.
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed font-body">
                Whether you are a student advancing your career, an educator
                sharing mastery, or an institution onboarding cohorts.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>Accredited digital certificate issuance</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Video className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>Live video lectures & screen sharing</span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-medium text-white/95">
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Banknote className="w-3.5 h-3.5 text-sky-200" />
                </div>
                <span>Flexible local payments & tuition waivers</span>
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
                Verified Trust
              </span>
            </div>
            <p className="text-[11px] text-sky-100 font-body">
              100% direct bank settlements and verified educational telemetry.
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
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-body">
              Join Backpack to discover accredited courses or publish
              institutional programs.
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
          <form onSubmit={handleSignup} className="space-y-4 font-body">
            {/* Account Type Visual Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                I want to join as a...
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    value: "student",
                    label: "Student",
                    icon: GraduationCap,
                    desc: "Learn",
                  },
                  {
                    value: "instructor",
                    label: "Instructor",
                    icon: UserCheck,
                    desc: "Teach",
                  },
                  {
                    value: "organization",
                    label: "Academy",
                    icon: Building2,
                    desc: "Institution",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = role === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRole(item.value as Role)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-[#d6e9f8]/60 dark:bg-[#1a384f] border-[#0078d4] text-[#0078d4] dark:text-[#04a4ec] shadow-xs"
                          : "bg-[#f8fafd] dark:bg-[#132838] border-[#d6e9f8] dark:border-[#1e3a52] text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-800"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected
                            ? "text-[#0078d4] dark:text-[#04a4ec]"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="text-xs font-bold font-heading">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-body hidden sm:inline">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                {role === "organization"
                  ? "Organization or Institution Name"
                  : "Full Name"}
              </label>
              <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {role === "organization" ? (
                    <Building2 className="w-4.5 h-4.5" />
                  ) : (
                    <User className="w-4.5 h-4.5" />
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-body"
                  placeholder={
                    role === "organization"
                      ? "Lagos Technical Institute"
                      : "Ogochukwu Okoli"
                  }
                />
              </div>
            </div>

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

            {/* Password Grid (2 Columns on tablet/desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                  Password
                </label>
                <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
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

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                  Confirm Password
                </label>
                <div className="relative rounded-xl border border-[#d6e9f8] dark:border-[#1e3a52] bg-[#f8fafd] dark:bg-[#132838] focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-body"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                    title={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-body">
            <span>Already have an account? </span>
            <Link
              to="/login"
              className="text-[#0078d4] dark:text-[#04a4ec] hover:underline font-bold font-heading ml-1"
            >
              Sign In
            </Link>
          </div>

          {/* App Version Tag */}
          <div className="pt-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 font-heading tracking-wider">
            v0.1.2
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
