import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Clock,
  Award,
  BookOpen,
  User,
  Sparkles,
} from "lucide-react";
import { Course, CourseFAQ } from "../../types";
import { useAppContext } from "../../store/AppContext";

type TabKey =
  | "overview"
  | "schedule"
  | "curriculum"
  | "instructor"
  | "faq"
  | "credentials";

interface EditCourseDetailsModalProps {
  course: Course;
  onClose: () => void;
}

export const EditCourseDetailsModal: React.FC<EditCourseDetailsModalProps> = ({
  course,
  onClose,
}) => {
  const { updateCourse } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);

  // Form State initialized directly from course
  const [title, setTitle] = useState(course.title || "");
  const [subtitle, setSubtitle] = useState(course.subtitle || "");
  const [description, setDescription] = useState(course.description || "");
  const [whyItMatters, setWhyItMatters] = useState(course.whyItMatters || "");

  // Schedule & Pacing
  const [pacing, setPacing] = useState<"self-paced" | "live-online" | "blended" | "">(
    course.pacing || ""
  );
  const [durationWeeks, setDurationWeeks] = useState(
    course.durationWeeks !== undefined ? String(course.durationWeeks) : ""
  );
  const [timeCommitment, setTimeCommitment] = useState(course.timeCommitment || "");
  const [totalHours, setTotalHours] = useState(course.totalHours || "");
  const [language, setLanguage] = useState(course.language || "");
  const [subtitlesInput, setSubtitlesInput] = useState(
    (course.subtitles || []).join(", ")
  );
  const [accessDuration, setAccessDuration] = useState(course.accessDuration || "");

  // Learning Objectives (What you will learn)
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    course.learningObjectives || []
  );
  const [newObjective, setNewObjective] = useState("");

  // Prerequisites
  const [prerequisites, setPrerequisites] = useState<string[]>(
    course.prerequisites || (course.requirements ? course.requirements.split("\n").filter(Boolean) : [])
  );
  const [newPrereq, setNewPrereq] = useState("");

  // Certification & Policies
  const [certificationDetails, setCertificationDetails] = useState(
    course.certificationDetails || ""
  );
  const [refundPolicy, setRefundPolicy] = useState(course.refundPolicy || "");

  // Instructor
  const [instructorName, setInstructorName] = useState(course.instructorName || "");
  const [instructorTitle, setInstructorTitle] = useState(course.instructorTitle || "");
  const [instructorBio, setInstructorBio] = useState(course.instructorBio || "");

  // FAQs
  const [faqs, setFaqs] = useState<CourseFAQ[]>(course.faqs || []);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [newFaqCategory, setNewFaqCategory] = useState("General");

  // Metrics
  const [enrolledCount, setEnrolledCount] = useState<string>(
    course.studentMetrics?.enrolledCount !== undefined
      ? String(course.studentMetrics.enrolledCount)
      : ""
  );
  const [completionRate, setCompletionRate] = useState(
    course.studentMetrics?.completionRate || ""
  );
  const [satisfactionRate, setSatisfactionRate] = useState(
    course.studentMetrics?.satisfactionRate || ""
  );

  // Handlers for dynamic lists
  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setLearningObjectives([...learningObjectives, newObjective.trim()]);
    setNewObjective("");
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleAddPrereq = () => {
    if (!newPrereq.trim()) return;
    setPrerequisites([...prerequisites, newPrereq.trim()]);
    setNewPrereq("");
  };

  const handleRemovePrereq = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setFaqs([
      ...faqs,
      {
        question: newFaqQuestion.trim(),
        answer: newFaqAnswer.trim(),
        category: newFaqCategory.trim() || undefined,
      },
    ]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const parsedSubtitles = subtitlesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedMetrics =
        enrolledCount || completionRate || satisfactionRate
          ? {
              enrolledCount: enrolledCount ? Number(enrolledCount) : undefined,
              completionRate: completionRate.trim() || undefined,
              satisfactionRate: satisfactionRate.trim() || undefined,
            }
          : undefined;

      const updates: Partial<Course> = {
        title: title.trim() || course.title,
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || course.description,
        whyItMatters: whyItMatters.trim() || undefined,
        pacing: pacing ? pacing : undefined,
        durationWeeks: durationWeeks.trim() || undefined,
        timeCommitment: timeCommitment.trim() || undefined,
        totalHours: totalHours.trim() || undefined,
        language: language.trim() || undefined,
        subtitles: parsedSubtitles.length > 0 ? parsedSubtitles : undefined,
        accessDuration: accessDuration.trim() || undefined,
        learningObjectives:
          learningObjectives.length > 0 ? learningObjectives : undefined,
        prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
        certificationDetails: certificationDetails.trim() || undefined,
        refundPolicy: refundPolicy.trim() || undefined,
        instructorName: instructorName.trim() || undefined,
        instructorTitle: instructorTitle.trim() || undefined,
        instructorBio: instructorBio.trim() || undefined,
        faqs: faqs.length > 0 ? faqs : undefined,
        studentMetrics: parsedMetrics,
      };

      await updateCourse(course.id, updates);
      onClose();
    } catch (err) {
      console.error("Failed to update course details", err);
      alert("Failed to save updates. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Edit Course Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update course details, syllabus info, instructor profile, and public catalog data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-3 border-b border-slate-100 dark:border-slate-700/60 shrink-0 text-xs font-bold">
          {(
            [
              { key: "overview", label: "Overview & Hook", icon: Sparkles },
              { key: "schedule", label: "Pacing & Hours", icon: Clock },
              { key: "curriculum", label: "Objectives & Prerequisites", icon: CheckCircle2 },
              { key: "instructor", label: "Instructor Profile", icon: User },
              { key: "credentials", label: "Credentials & Policies", icon: Award },
              { key: "faq", label: "FAQs & Metrics", icon: HelpCircle },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 text-xs">
          {/* TAB 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Subtitle / One-Sentence Summary Hook
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Master modern cloud architecture through guided hands-on lab sprints and verified capstone projects."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A concise sentence highlighting the unique value proposition shown below the course title.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Course Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Why This Course Matters & Educational Philosophy
                </label>
                <textarea
                  rows={3}
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  placeholder="Explain why this subject is essential, industry relevance, and the pedagogical approach."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Pacing & Schedule */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Learning Pacing
                  </label>
                  <select
                    value={pacing}
                    onChange={(e) =>
                      setPacing(
                        e.target.value as
                          | "self-paced"
                          | "live-online"
                          | "blended"
                          | ""
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value="">Select pacing (optional)</option>
                    <option value="self-paced">Self-Paced</option>
                    <option value="live-online">Live Online (Cohort-based)</option>
                    <option value="blended">Blended Learning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Duration in Weeks
                  </label>
                  <input
                    type="text"
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    placeholder="e.g. 8 Weeks or 12 Weeks"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Weekly Time Commitment
                  </label>
                  <input
                    type="text"
                    value={timeCommitment}
                    onChange={(e) => setTimeCommitment(e.target.value)}
                    placeholder="e.g. 6–8 hours / week"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Total Hours
                  </label>
                  <input
                    type="text"
                    value={totalHours}
                    onChange={(e) => setTotalHours(e.target.value)}
                    placeholder="e.g. 48 Total Hours"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Language of Instruction
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. English or French"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Subtitles & Translations (comma separated)
                  </label>
                  <input
                    type="text"
                    value={subtitlesInput}
                    onChange={(e) => setSubtitlesInput(e.target.value)}
                    placeholder="e.g. English [CC], French, Spanish"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Access Duration
                </label>
                <input
                  type="text"
                  value={accessDuration}
                  onChange={(e) => setAccessDuration(e.target.value)}
                  placeholder="e.g. Lifetime Access upon Enrollment, or 1 Year Full Access"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Learning Objectives & Prerequisites */}
          {activeTab === "curriculum" && (
            <div className="space-y-6">
              {/* Objectives */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Learning Objectives ("What You Will Learn")
                </label>
                <p className="text-[11px] text-slate-400">
                  Add concrete, verifiable skills and takeaways that students will acquire.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddObjective();
                      }
                    }}
                    placeholder="e.g. Design fault-tolerant distributed cloud microservices"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddObjective}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {learningObjectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{obj}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(i)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {learningObjectives.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic block py-1">
                      No learning objectives added yet. Only objectives you input will appear on the course page.
                    </span>
                  )}
                </div>
              </div>

              {/* Prerequisites */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Prerequisites & Background Knowledge
                </label>
                <p className="text-[11px] text-slate-400">
                  Technical requirements, prior experience, or software requirements.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPrereq}
                    onChange={(e) => setNewPrereq(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPrereq();
                      }
                    }}
                    placeholder="e.g. Fundamental familiarity with Python or JavaScript"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPrereq}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {prerequisites.map((req, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300">{req}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrereq(i)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {prerequisites.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic block py-1">
                      No prerequisites added yet.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Instructor Profile */}
          {activeTab === "instructor" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Lead Instructor Name
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="e.g. Dr. Adeyemi Adeleke"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Instructor Academic / Professional Title
                  </label>
                  <input
                    type="text"
                    value={instructorTitle}
                    onChange={(e) => setInstructorTitle(e.target.value)}
                    placeholder="e.g. Associate Professor of Informatics"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Instructor Biography & Credentials
                </label>
                <textarea
                  rows={4}
                  value={instructorBio}
                  onChange={(e) => setInstructorBio(e.target.value)}
                  placeholder="Provide background, academic standing, publications, industry leadership..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Credentials & Policies */}
          {activeTab === "credentials" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Certification & Digital Credentials Description
                </label>
                <textarea
                  rows={3}
                  value={certificationDetails}
                  onChange={(e) => setCertificationDetails(e.target.value)}
                  placeholder="Describe the certificate issued upon completion, accredited verification ID, or academic transcript credits..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Refund Policy & Guarantee Window
                </label>
                <textarea
                  rows={3}
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  placeholder="e.g. 14-day 100% money-back guarantee if requested before the second module opens."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 6: FAQs & Metrics */}
          {activeTab === "faq" && (
            <div className="space-y-6">
              {/* FAQs */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Frequently Asked Questions (FAQ)
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="Question: e.g. What are the laptop specs?"
                      className="sm:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value)}
                      placeholder="Category: e.g. Technical"
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Answer to the question..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {faq.question}
                          </span>
                          {faq.category && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              {faq.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {faq.answer}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(i)}
                        className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic block py-1">
                      No FAQs added yet.
                    </span>
                  )}
                </div>
              </div>

              {/* Student Metrics */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student Success & Cohort Milestones (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Enrolled Learners Count
                    </label>
                    <input
                      type="number"
                      value={enrolledCount}
                      onChange={(e) => setEnrolledCount(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Completion Rate
                    </label>
                    <input
                      type="text"
                      value={completionRate}
                      onChange={(e) => setCompletionRate(e.target.value)}
                      placeholder="e.g. 96%"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Satisfaction Rate
                    </label>
                    <input
                      type="text"
                      value={satisfactionRate}
                      onChange={(e) => setSatisfactionRate(e.target.value)}
                      placeholder="e.g. 98%"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Saving Updates..." : "Save Course Details"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
