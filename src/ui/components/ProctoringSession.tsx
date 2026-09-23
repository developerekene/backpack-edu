import { useState, useRef, useEffect } from "react";
import { Camera, Monitor, ShieldAlert, CheckCircle, Clock, HeartHandshake, AlertTriangle } from "lucide-react";
import { useAccessibility } from "../../store/AccessibilityContext";

export const ProctoringSession = ({
  assessmentTitle,
  durationMinutes = 60,
  onComplete,
  onTimeExpired,
}: {
  assessmentTitle: string;
  durationMinutes?: number;
  onComplete: () => void;
  onTimeExpired?: () => void;
}) => {
  const { examTimeMultiplier, openAccessibilityModal } = useAccessibility();
  const [isProctoring, setIsProctoring] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Scaled duration based on accommodation multiplier
  const effectiveMinutes = Math.round(durationMinutes * examTimeMultiplier);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => effectiveMinutes * 60);

  useEffect(() => {
    if (!isProctoring) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeExpired) onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isProctoring, onTimeExpired]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = screenStream;
      if (screenRef.current) {
        screenRef.current.srcObject = screenStream;
      }

      setSecondsRemaining(effectiveMinutes * 60);
      setIsProctoring(true);
    } catch (err) {
      console.error("Proctoring error:", err);
      alert(
        "Camera, Microphone, and Screen Share permissions are required to take this assessment.",
      );
    }
  };

  const stopProctoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsProctoring(false);
    onComplete();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (!isProctoring) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Proctored Assessment: {assessmentTitle}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-md mx-auto">
            This assessment requires screen, camera, and microphone monitoring
            to ensure academic integrity.
          </p>
        </div>

        {/* Accommodation Timer Banner */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold mx-auto">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Allocated Time: {effectiveMinutes} Mins</span>
          {examTimeMultiplier > 1.0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">
              {examTimeMultiplier}x Accommodation Applied (+
              {Math.round((examTimeMultiplier - 1) * 100)}%)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={startProctoring}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center text-xs sm:text-sm"
          >
            <Camera className="w-4 h-4 mr-2" /> Start Proctored Session
          </button>
          <button
            onClick={() => openAccessibilityModal("accommodations")}
            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <HeartHandshake className="w-4 h-4 text-indigo-500" />
            <span>Accommodation Settings</span>
          </button>
        </div>
      </div>
    );
  }

  const isLowTime = secondsRemaining <= 300 && secondsRemaining > 0;

  return (
    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center">
            <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Session
            Monitored: {assessmentTitle}
          </h3>
          <p className="text-xs text-emerald-400/80">
            Screen, camera, and microphone are recording.
          </p>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex items-center space-x-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-mono font-bold ${
              isLowTime
                ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Left: {formatTime(secondsRemaining)}</span>
            {examTimeMultiplier > 1.0 && (
              <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                {examTimeMultiplier}x
              </span>
            )}
          </div>

          <button
            onClick={stopProctoring}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition"
          >
            End Session
          </button>
        </div>
      </div>

      {isLowTime && (
        <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Less than 5 minutes remaining! Complete and submit your questions.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[11px] text-white flex items-center">
            <Camera className="w-3 h-3 mr-1" /> Camera & Mic
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative aspect-video">
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[11px] text-white flex items-center">
            <Monitor className="w-3 h-3 mr-1" /> Screen Capture
          </div>
        </div>
      </div>
    </div>
  );
};

