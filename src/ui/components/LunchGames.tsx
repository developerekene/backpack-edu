import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Sparkles,
  Brain,
  Trophy,
  RotateCcw,
  Check,
  Smile,
  Rocket,
  Play,
  Volume2,
  VolumeX,
  Gift,
  ShieldCheck,
  Coins,
  Zap,
  Eye,
  Ticket,
  Star,
  Coffee,
} from "lucide-react";
import { BlueBackpack3DIcon } from "./BlueBackpack3DIcon";

interface Card {
  id: number;
  icon: string;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const CARD_ICONS = [
  { icon: "🎒", label: "Backpack" },
  { icon: "🚀", label: "Launch Box" },
  { icon: "📚", label: "Notebook" },
  { icon: "🍎", label: "Fresh Apple" },
  { icon: "🎓", label: "Graduation Cap" },
  { icon: "🌍", label: "Global Reach" },
  { icon: "⚡", label: "Brain Power" },
  { icon: "💡", label: "Bright Idea" },
];

const createShuffledCards = (): Card[] => {
  const duplicated = [...CARD_ICONS, ...CARD_ICONS];
  return duplicated
    .sort(() => Math.random() - 0.5)
    .map((item, index) => ({
      id: index,
      icon: item.icon,
      label: item.label,
      isFlipped: false,
      isMatched: false,
    }));
};

const AD_CAMPAIGNS = [
  {
    id: "admob_rewarded_1",
    network: "Google AdMob",
    unitId: "ca-app-pub-3940256099942544/5224354917",
    title: "Google Developer & AI Innovation Spotlight",
    sponsor: "Google Cloud & AI Studio",
    duration: 10,
    rewardPoints: 100,
    bgGradient: "from-blue-600 via-indigo-600 to-purple-600",
    description:
      "Learn about modern cloud container tools and scalable app development.",
  },
  {
    id: "adsense_partner_1",
    network: "Google AdSense",
    unitId: "pub-8920194830182390",
    title: "Global Tech Scholarships & Career Masterclass",
    sponsor: "TechEdu Global Network",
    duration: 12,
    rewardPoints: 150,
    bgGradient: "from-emerald-600 via-teal-600 to-cyan-600",
    description:
      "Discover top accreditation, career tracks, and global tech certifications.",
  },
  {
    id: "admob_rewarded_2",
    network: "Google AdMob",
    unitId: "ca-app-pub-3940256099942544/1033173712",
    title: "Focus & Mindfulness Apps for Students",
    sponsor: "Mindful Workspace",
    duration: 8,
    rewardPoints: 75,
    bgGradient: "from-pink-600 via-rose-600 to-amber-600",
    description:
      "Explore quick 5-minute study reset techniques and focus soundscapes.",
  },
];

export const LunchGames = () => {
  const [activeTab, setActiveTab] = useState<
    "videos" | "memory" | "quiz" | "arcade" | "breathing" | "store"
  >("videos");

  // Points State (Persisted)
  const [points, setPoints] = useState<number>(() => {
    const saved = localStorage.getItem("backpack_launchbox_points");
    return saved ? parseInt(saved, 10) : 500;
  });

  const [pointNotification, setPointNotification] = useState<string | null>(
    null,
  );

  const updatePoints = (delta: number, reason: string) => {
    setPoints((prev) => {
      const next = Math.max(0, prev + delta);
      localStorage.setItem("backpack_launchbox_points", next.toString());
      return next;
    });
    setPointNotification(
      `${delta > 0 ? `+${delta}` : delta} Points: ${reason}`,
    );
    setTimeout(() => setPointNotification(null), 3500);
  };

  // Video Ad State
  const [selectedAd, setSelectedAd] = useState(AD_CAMPAIGNS[0]);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0); // 0 to 100
  const [adTimeRemaining, setAdTimeRemaining] = useState(selectedAd.duration);
  const [isMuted, setIsMuted] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);

  // Memory Game State
  const [cards, setCards] = useState<Card[]>(createShuffledCards);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isWon, setIsWon] = useState(false);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  // Arcade Target Game State
  const [arcadeScore, setArcadeScore] = useState(0);
  const [arcadeTime, setArcadeTime] = useState(20);
  const [arcadeActive, setArcadeActive] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ top: 40, left: 50 });
  const [arcadeMultiplier, setArcadeMultiplier] = useState(1);

  // Breathing State
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">(
    "Inhale",
  );

  const quizQuestions = [
    {
      q: "Which country has the most official languages in Africa?",
      options: [
        "Zimbabwe (16)",
        "Nigeria (3)",
        "South Africa (11)",
        "Kenya (2)",
      ],
      correct: 0,
    },
    {
      q: "If you study for 45 minutes and take a 15-minute break, how many cycles fit in 2 hours?",
      options: ["1 cycle", "2 cycles", "3 cycles", "4 cycles"],
      correct: 1,
    },
    {
      q: "What is 12 × 12 - 44?",
      options: ["100", "120", "144", "88"],
      correct: 0,
    },
    {
      q: "Which nutrient provides sustained energy during long study sessions?",
      options: [
        "Refined Sugar",
        "Complex Carbs & Protein",
        "Sodium",
        "Saturated Fat",
      ],
      correct: 1,
    },
  ];

  // Ad Video Timer Logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlayingAd && !adCompleted) {
      timer = setInterval(() => {
        setAdTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsPlayingAd(false);
            setAdCompleted(true);
            setAdProgress(100);
            updatePoints(
              selectedAd.rewardPoints,
              `Watched ${selectedAd.network} Video`,
            );
            return 0;
          }
          const next = prev - 1;
          setAdProgress(
            Math.round(
              ((selectedAd.duration - next) / selectedAd.duration) * 100,
            ),
          );
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAd, adCompleted, selectedAd]);

  const handleStartAd = (ad = selectedAd) => {
    setSelectedAd(ad);
    setAdTimeRemaining(ad.duration);
    setAdProgress(0);
    setAdCompleted(false);
    setIsPlayingAd(true);
  };

  // Memory Game Logic
  const initializeMemoryGame = useCallback(() => {
    setCards(createShuffledCards());
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsWon(false);
  }, []);

  const handleCardClick = (index: number) => {
    if (
      flippedCards.length === 2 ||
      cards[index].isFlipped ||
      cards[index].isMatched
    )
      return;

    const nextFlipped = [...flippedCards, index];
    setFlippedCards(nextFlipped);

    setCards((prevCards) =>
      prevCards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)),
    );

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;

      if (cards[firstIdx].icon === cards[secondIdx].icon) {
        setCards((prevCards) =>
          prevCards.map((c, i) =>
            i === firstIdx || i === secondIdx
              ? { ...c, isMatched: true, isFlipped: true }
              : c,
          ),
        );
        setFlippedCards([]);
        setMatches((m) => {
          const nextMatches = m + 1;
          if (nextMatches === CARD_ICONS.length) {
            setIsWon(true);
            updatePoints(150, "Completed Memory Match!");
          }
          return nextMatches;
        });
      } else {
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c, i) =>
              i === firstIdx || i === secondIdx
                ? { ...c, isFlipped: false }
                : c,
            ),
          );
          setFlippedCards([]);
        }, 900);
      }
    }
  };

  // Memory Power-ups
  const handlePeekPowerUp = () => {
    if (points < 100) {
      alert("You need at least 100 points to use Peek Pass!");
      return;
    }
    updatePoints(-100, "Used Peek Pass Power-Up");
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: true })));
    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.isMatched ? c : { ...c, isFlipped: false })),
      );
    }, 2500);
  };

  // Quiz Power-ups
  const handle5050PowerUp = () => {
    if (points < 100) {
      alert("You need at least 100 points for 50:50 Lifeline!");
      return;
    }
    const currentCorrect = quizQuestions[quizIndex].correct;
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== currentCorrect);
    const toHide = wrongIndices.slice(0, 2);
    setHiddenOptions(toHide);
    updatePoints(-100, "Used 50:50 Lifeline");
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);
    if (optionIdx === quizQuestions[quizIndex].correct) {
      setQuizScore((s) => s + 1);
      updatePoints(25, "Correct Trivia Answer");
    }

    setTimeout(() => {
      if (quizIndex + 1 < quizQuestions.length) {
        setQuizIndex((i) => i + 1);
        setSelectedAnswer(null);
        setHiddenOptions([]);
      } else {
        setQuizCompleted(true);
        updatePoints(100, "Completed Trivia Dash");
      }
    }, 1200);
  };

  // Arcade Target Game Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (arcadeActive && arcadeTime > 0) {
      interval = setInterval(() => {
        setArcadeTime((t) => {
          if (t <= 1) {
            setArcadeActive(false);
            updatePoints(arcadeScore * 10, "Finished Target Tap Arcade");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [arcadeActive, arcadeTime, arcadeScore]);

  const moveTarget = () => {
    const top = Math.floor(Math.random() * 70) + 15;
    const left = Math.floor(Math.random() * 70) + 15;
    setTargetPosition({ top, left });
  };

  const handleTargetClick = () => {
    if (!arcadeActive) return;
    setArcadeScore((s) => s + 1 * arcadeMultiplier);
    moveTarget();
  };

  const startArcade = () => {
    setArcadeScore(0);
    setArcadeTime(20);
    setArcadeActive(true);
    moveTarget();
  };

  // Breathing Loop
  useEffect(() => {
    if (!isBreathing) return;
    const phases: ("Inhale" | "Hold" | "Exhale")[] = [
      "Inhale",
      "Hold",
      "Exhale",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % 3;
      setBreathPhase(phases[idx]);
    }, 3500);
    return () => clearInterval(interval);
  }, [isBreathing]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
            <Rocket className="w-4 h-4 text-pink-500" />
            <span className="px-2 py-0.5 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full text-xs font-extrabold uppercase">
              Break
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Launch Box & Casual Games
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Take a well-deserved mental break. Watch AdMob & AdSense videos to
            earn points, power up casual games, and claim reward passes.
          </p>
        </div>

        {/* Points Display Widget */}
        <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 p-3 rounded-2xl self-start md:self-auto shadow-sm">
          <div className="p-2.5 bg-amber-500 text-slate-900 dark:text-white rounded-xl font-bold shadow-sm">
            <Coins className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block">
              Launch Points Balance
            </span>
            <span className="text-xl font-black text-amber-900 dark:text-amber-200">
              {points.toLocaleString()}{" "}
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                PTS
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Point Toast Notification */}
      {pointNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{pointNotification}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 gap-1">
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "videos"
              ? "bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-white dark:text-white">
            Watch Videos (+PTS)
          </span>
        </button>
        <button
          onClick={() => setActiveTab("memory")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "memory"
              ? "bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Memory Match</span>
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "quiz"
              ? "bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trivia Dash</span>
        </button>
        <button
          onClick={() => setActiveTab("arcade")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "arcade"
              ? "bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Reflex Arcade</span>
        </button>
        <button
          onClick={() => setActiveTab("breathing")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "breathing"
              ? "bg-pink-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Mindful Reset</span>
        </button>
        <button
          onClick={() => setActiveTab("store")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "store"
              ? "bg-amber-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white"
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-amber-300" />
          <span>Points Shop</span>
        </button>
      </div>

      {/* Watch Videos Tab (AdMob / AdSense Rewarded Videos) */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AD_CAMPAIGNS.map((ad) => (
              <div
                key={ad.id}
                onClick={() => handleStartAd(ad)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  selectedAd.id === ad.id
                    ? "bg-slate-50 text-white hover:border-indigo-400 shadow-lg scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:border-indigo-400"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold rounded-full flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />{" "}
                    {ad.network}
                  </span>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    +{ad.rewardPoints} PTS
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors mb-1">
                  {ad.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {ad.description}
                </p>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span>Sponsor: {ad.sponsor}</span>
                  <span className="font-semibold">
                    {ad.duration}s Rewarded Video
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Video Player */}
          <div className="bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div
              className={`h-64 sm:h-80 bg-gradient-to-br ${selectedAd.bgGradient} flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}
            >
              {/* Ad Unit & Verified Badge */}
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-slate-300 border border-slate-700 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span>Ad Unit: {selectedAd.unitId}</span>
              </div>

              <div className="absolute top-4 right-4 flex items-center space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 bg-slate-900/80 rounded-full text-slate-300 hover:text-white border border-slate-700"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {!isPlayingAd && !adCompleted ? (
                <div className="space-y-4 max-w-md animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto shadow-inner">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {selectedAd.title}
                    </h3>
                    <p className="text-xs text-slate-200 mt-1">
                      Watch this official {selectedAd.network} sponsored video
                      to earn{" "}
                      <span className="font-bold text-amber-300">
                        +{selectedAd.rewardPoints} Points
                      </span>{" "}
                      instantly!
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartAd()}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm rounded-xl transition shadow-lg flex items-center mx-auto"
                  >
                    <Play className="w-4 h-4 mr-2 fill-slate-900" /> Watch Video
                    & Claim {selectedAd.rewardPoints} PTS
                  </button>
                </div>
              ) : isPlayingAd ? (
                <div className="space-y-4 max-w-md">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-400 border-t-transparent animate-spin flex items-center justify-center mx-auto">
                    <span className="text-xl font-black text-white">
                      {adTimeRemaining}s
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedAd.title}
                  </h3>
                  <p className="text-xs text-slate-200">
                    Playing sponsored media... Reward will be added
                    automatically upon completion.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-md animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center mx-auto shadow-lg">
                    <Check className="w-10 h-10 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      Reward Earned! 🎉
                    </h3>
                    <p className="text-sm text-emerald-200 mt-1 font-semibold">
                      You received +{selectedAd.rewardPoints} Launch Points for
                      watching!
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartAd()}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700"
                  >
                    Watch Another Video
                  </button>
                </div>
              )}
            </div>

            {/* Video Progress Bar */}
            <div className="w-full bg-slate-900 h-2 relative">
              <div
                className="bg-amber-400 h-2 transition-all duration-1000 ease-linear"
                style={{ width: `${adProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Memory Match Game */}
      {activeTab === "memory" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-sm gap-4">
            <div className="flex space-x-6">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs">
                  Moves
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-lg">
                  {moves}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs">
                  Matches
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                  {matches} / {CARD_ICONS.length}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePeekPowerUp}
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition"
                title="Briefly reveals all cards for 3 seconds"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> Peek Pass (100 PTS)
              </button>
              <button
                onClick={initializeMemoryGame}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {isWon ? (
            <div className="text-center py-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4 animate-in zoom-in-95">
              <Trophy className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Break Champion! 🎉
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                You matched all cards in{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {moves} moves
                </span>
                ! Earned{" "}
                <span className="font-bold text-amber-500">+150 PTS</span>.
              </p>
              <button
                onClick={initializeMemoryGame}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition"
              >
                Play Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-xl mx-auto">
              {cards.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(idx)}
                  disabled={card.isFlipped || card.isMatched}
                  className={`h-20 sm:h-24 rounded-xl font-bold text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 transform ${
                    card.isFlipped || card.isMatched
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-500 scale-100 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:scale-105"
                  }`}
                >
                  {card.isFlipped || card.isMatched ? (
                    card.icon
                  ) : (
                    <div className="flex items-center justify-center p-1">
                      <BlueBackpack3DIcon className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md pointer-events-none select-none transition-transform duration-200 group-hover:scale-110" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trivia Dash */}
      {activeTab === "quiz" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Question {quizIndex + 1} of {quizQuestions.length}
            </span>
            <button
              onClick={handle5050PowerUp}
              disabled={hiddenOptions.length > 0}
              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              50:50 Lifeline (100 PTS)
            </button>
          </div>

          {!quizCompleted ? (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                {quizQuestions[quizIndex].q}
              </h3>

              <div className="space-y-2.5">
                {quizQuestions[quizIndex].options.map((opt, oIdx) => {
                  if (hiddenOptions.includes(oIdx)) return null;

                  const isSelected = selectedAnswer === oIdx;
                  const isCorrect = oIdx === quizQuestions[quizIndex].correct;
                  let style =
                    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-500";

                  if (selectedAnswer !== null) {
                    if (isCorrect)
                      style =
                        "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold";
                    else if (isSelected)
                      style =
                        "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400";
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleQuizAnswer(oIdx)}
                      className={`w-full text-left p-3.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${style}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer !== null && isCorrect && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
              <Smile className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Trivia Complete!
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                You scored{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {quizScore} / {quizQuestions.length}
                </span>
                ! Earned bonus points!
              </p>
              <button
                onClick={() => {
                  setQuizIndex(0);
                  setQuizScore(0);
                  setQuizCompleted(false);
                  setSelectedAnswer(null);
                  setHiddenOptions([]);
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reflex Arcade Target Tap Game */}
      {activeTab === "arcade" && (
        <div className="space-y-6 max-w-xl mx-auto text-center">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Time Left
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {arcadeTime}s
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Score
              </span>
              <span className="text-xl font-black text-indigo-500">
                {arcadeScore}
              </span>
            </div>
            <button
              onClick={() => {
                if (points < 100) {
                  alert("Need 100 points for 2x Multiplier!");
                  return;
                }
                updatePoints(-100, "Used 2x Score Multiplier");
                setArcadeMultiplier(2);
              }}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition"
            >
              2x Score (100 PTS)
            </button>
          </div>

          <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center">
            {!arcadeActive ? (
              <div className="space-y-3 z-10">
                <Zap className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-white">
                  Reflex Target Tap
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Tap the target as fast as you can in 20 seconds. Every tap
                  earns Launch Points!
                </p>
                <button
                  onClick={startArcade}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm rounded-xl transition shadow-lg"
                >
                  Start Arcade
                </button>
              </div>
            ) : (
              <button
                onClick={handleTargetClick}
                style={{
                  top: `${targetPosition.top}%`,
                  left: `${targetPosition.left}%`,
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg animate-bounce cursor-pointer active:scale-95"
              >
                🚀
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mindful Reset (Breathing Exercise) */}
      {activeTab === "breathing" && (
        <div className="py-8 flex flex-col items-center justify-center space-y-6">
          <p className="text-slate-600 dark:text-slate-400 text-sm text-center max-w-md">
            Relax your shoulders, take a sip of water, and follow the rhythmic
            breathing guide.
          </p>

          {!isBreathing ? (
            <button
              onClick={() => setIsBreathing(true)}
              className="w-44 h-44 rounded-full bg-pink-500/10 border-2 border-pink-500/40 text-pink-600 dark:text-pink-400 flex flex-col items-center justify-center hover:bg-pink-500/20 hover:scale-105 transition-all duration-300 shadow-md"
            >
              <Heart className="w-10 h-10 mb-2 animate-pulse" />
              <span className="font-bold text-sm">Start Break Reset</span>
            </button>
          ) : (
            <div className="relative flex items-center justify-center my-6">
              <div
                className={`w-60 h-60 rounded-full bg-pink-500/20 absolute transition-all duration-[3500ms] ease-in-out ${
                  breathPhase === "Inhale"
                    ? "scale-150 opacity-60"
                    : breathPhase === "Hold"
                      ? "scale-150 opacity-90"
                      : "scale-100 opacity-30"
                }`}
              ></div>
              <div className="w-44 h-44 rounded-full bg-pink-600 text-slate-900 dark:text-white flex flex-col items-center justify-center relative z-10 shadow-xl">
                <span className="font-extrabold text-xl tracking-widest uppercase">
                  {breathPhase}
                </span>
              </div>
            </div>
          )}

          {isBreathing && (
            <button
              onClick={() => setIsBreathing(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white underline transition"
            >
              Stop Exercise
            </button>
          )}
        </div>
      )}

      {/* Points Shop & Perks */}
      {activeTab === "store" && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Gift className="w-5 h-5 text-amber-500 mr-2" /> Launch Points
              Perks Shop
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Redeem your Launch Points earned from AdMob/AdSense videos &
              casual games
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Assignment Grace Pass",
                cost: 500,
                icon: Ticket,
                desc: "Grants 24-hour extension request pass for submitted course modules.",
              },
              {
                title: "Distinction Scholar Badge",
                cost: 1000,
                icon: Star,
                desc: "Unlocks an official distinction badge on student certificate profiles.",
              },
              {
                title: "Golden Avatar Glow",
                cost: 750,
                icon: Sparkles,
                desc: "Shows a luminous golden ring around your user profile image.",
              },
              {
                title: "Campus Snack Voucher",
                cost: 300,
                icon: Coffee,
                desc: "Generates a claimable promotional code for institutional dining.",
              },
            ].map((perk, idx) => {
              const PerkIcon = perk.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                      <PerkIcon className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                      {perk.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {perk.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                      {perk.cost} PTS
                    </span>
                    <button
                      onClick={() => {
                        if (points < perk.cost) {
                          alert(
                            `You need ${perk.cost - points} more Launch Points! Watch AdMob/AdSense videos to earn more.`,
                          );
                          return;
                        }
                        updatePoints(-perk.cost, `Redeemed ${perk.title}`);
                        alert(`🎉 Successfully redeemed ${perk.title}!`);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition"
                    >
                      Claim Perk
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
