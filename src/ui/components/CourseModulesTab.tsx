/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  CheckCircle,
  Video,
  FileText,
  Link as LinkIcon,
  Trash2,
  Plus,
  CheckCircle2,
  Save,
  GripVertical,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";
import { Course, CourseModule } from "../../types";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { FileUpload } from "./FileUpload";
import { generateId } from "../../lib/id";
import { CustomAlert } from "./CustomAlert";

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('watch?v=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
};

const isYouTubeUrl = (url: string) => {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
};


interface CourseModulesTabProps {
  course: Course;
  isStudent: boolean;
  isPreview?: boolean;
  onTogglePreview?: (preview: boolean) => void;
}

export const CourseModulesTab = ({
  course,
  isStudent,
  isPreview,
  onTogglePreview,
}: CourseModulesTabProps) => {
  const { currentUser } = useAuth();
  const { userProgress, updateProgress, updateCourse, addMaterial } = useAppContext();

  const [draftModules, setDraftModules] = useState<CourseModule[] | null>(null);
  const [internalPreviewMode, setInternalPreviewMode] = useState(false);
  const isPreviewMode = isPreview !== undefined ? isPreview : internalPreviewMode;
  const setPreviewMode = (val: boolean) => {
    setInternalPreviewMode(val);
    if (onTogglePreview) {
      onTogglePreview(val);
    }
  };
  const localModules = draftModules ?? (course.modules || []);
  const isDirty = draftModules !== null;
  const [isSaving, setIsSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "warning" | "error" | "success" | "danger";
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
  });

  const progress = userProgress.find(
    (p) => p.courseId === course.id && p.userId === currentUser?.id,
  );

  const handleCompleteModule = (moduleId: string) => {
    if (!currentUser || (!isStudent && !isPreviewMode)) return;
    const completed = progress?.completedModuleIds || [];
    if (!completed.includes(moduleId)) {
      updateProgress({
        userId: currentUser.id,
        courseId: course.id,
        completedModuleIds: [...completed, moduleId],
        completedItemIds: progress?.completedItemIds || [],
        performanceScore: progress?.performanceScore || 85,
      });
    }
  };

  const handleCompleteItem = (itemId: string) => {
    if (!currentUser || (!isStudent && !isPreviewMode)) return;
    const completedItems = progress?.completedItemIds || [];
    if (!completedItems.includes(itemId)) {
      updateProgress({
        userId: currentUser.id,
        courseId: course.id,
        completedModuleIds: progress?.completedModuleIds || [],
        completedItemIds: [...completedItems, itemId],
        performanceScore: progress?.performanceScore || 85,
      });
    }
  };

  const addModule = () => {
    setDraftModules([
      ...localModules,
      {
        id: generateId("mod"),
        title: "",
        description: "",
        items: [],
      },
    ]);
  };

  const updateModule = (
    index: number,
    field: keyof CourseModule,
    value: any,
  ) => {
    const newModules = [...localModules];
    newModules[index] = { ...newModules[index], [field]: value };
    setDraftModules(newModules);
  };

  const removeModule = (index: number) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Module",
      message:
        "Are you sure you want to delete this module? This action cannot be undone.",
      confirmText: "Yes, Delete Module",
      type: "danger",
      onConfirm: async () => {
        await new Promise((r) => setTimeout(r, 400));
        const newModules = [...localModules];
        newModules.splice(index, 1);
        setDraftModules(newModules);
      },
    });
  };

  const addModuleItem = (
    moduleIndex: number,
    type: "video" | "document" | "link" | "text" | "embed",
  ) => {
    const newModules = [...localModules];
    const newItems = [...(newModules[moduleIndex].items || [])];
    newItems.push({
      id: generateId("item"),
      title: "",
      type,
      content: "",
      url: "",
    });
    newModules[moduleIndex] = { ...newModules[moduleIndex], items: newItems };
    setDraftModules(newModules);
  };

  const updateModuleItem = (
    moduleIndex: number,
    itemIndex: number,
    field: string,
    value: any,
  ) => {
    const newModules = [...localModules];
    const newItems = [...(newModules[moduleIndex].items || [])];
    const item = newItems[itemIndex];
    newItems[itemIndex] = { ...item, [field]: value };
    newModules[moduleIndex] = { ...newModules[moduleIndex], items: newItems };
    setDraftModules(newModules);
  };

  const removeModuleItem = (moduleIndex: number, itemIndex: number) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Item",
      message:
        "Are you sure you want to delete this curriculum item? This action cannot be undone.",
      confirmText: "Yes, Delete Item",
      type: "danger",
      onConfirm: async () => {
        await new Promise((r) => setTimeout(r, 400));
        const newModules = [...localModules];
        const newItems = [...(newModules[moduleIndex].items || [])];
        newItems.splice(itemIndex, 1);
        newModules[moduleIndex] = { ...newModules[moduleIndex], items: newItems };
        setDraftModules(newModules);
      },
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await updateCourse(course.id, { modules: localModules });
    setDraftModules(null);
    setIsSaving(false);
  };

  if (isStudent || isPreviewMode) {
    // Calculate granular progress
    let totalTrackables = localModules.length;
    let completedTrackables = (progress?.completedModuleIds || []).filter(id => localModules.some(m => m.id === id)).length;

    localModules.forEach(mod => {
      if (mod.items) {
        totalTrackables += mod.items.length;
        const completedItemsCount = (progress?.completedItemIds || []).filter(id => mod.items?.some(i => i.id === id)).length;
        completedTrackables += completedItemsCount;
      }
    });

    const progressPercentage = totalTrackables > 0 ? (completedTrackables / totalTrackables) * 100 : 0;

    // Read-only student view
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
              Course Modules
            </h2>
            <div className="max-w-md w-full mt-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold font-heading">
                <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Progress</span>
                <span className="text-[#0078d4] dark:text-[#04a4ec]">{progressPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#0078d4] h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {(!isStudent || isPreviewMode) && (
            <button
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors flex items-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer font-heading shadow-xs"
            >
              <EyeOff className="w-4 h-4 mr-2" /> Exit Preview
            </button>
          )}
        </div>

        {localModules.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed font-body">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <p>No modules have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {localModules.map((mod, index) => {
              const isCompleted = progress?.completedModuleIds.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start gap-4 bg-slate-50 dark:bg-slate-900/40">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-lg flex items-center font-heading">
                        <span className="text-sm text-[#0078d4] dark:text-[#04a4ec] mr-2">
                          Module {index + 1}:
                        </span>
                        {mod.title}
                      </div>
                      {mod.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-body leading-relaxed">
                          {mod.description}
                        </p>
                      )}
                      {mod.content && !mod.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-body leading-relaxed">
                          {mod.content}
                        </p>
                      )}
                    </div>
                    {isCompleted ? (
                      <span className="flex items-center px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold whitespace-nowrap font-heading shadow-xs">
                        <CheckCircle className="w-4 h-4 mr-2" /> Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCompleteModule(mod.id)}
                        className="px-4 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-sm cursor-pointer font-heading"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>

                  {mod.items && mod.items.length > 0 && (
                    <div className="p-5 sm:p-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 font-heading">
                        Module Items
                      </h4>
                      <div className="space-y-4">
                        {mod.items.map((item, itemIndex) => {
                          const isItemCompleted = progress?.completedItemIds?.includes(item.id);
                          return (
                          <div
                            key={item.id}
                            className={`p-4 sm:p-5 rounded-2xl border space-y-3 shadow-sm transition-colors ${isItemCompleted ? 'bg-[#f0f7fd]/50 dark:bg-[#0078d4]/10 border-[#d6e9f8] dark:border-[#0078d4]/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#0078d4]/50 dark:hover:border-[#04a4ec]/50'}`}
                            onClick={() => handleCompleteItem(item.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 font-bold text-sm text-slate-900 dark:text-white cursor-pointer group">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCompleteItem(item.id); }}
                                  className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors mt-0.5 ${isItemCompleted ? 'bg-[#0078d4] border-[#0078d4] text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-[#0078d4]'}`}
                                >
                                  {isItemCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-heading">
                                      Item {itemIndex + 1}
                                    </span>
                                    {item.type === "video" && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/60 uppercase tracking-wider font-heading"><Video className="w-3 h-3 mr-1" /> Video</span>
                                    )}
                                    {item.type === "document" && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider font-heading"><FileText className="w-3 h-3 mr-1" /> Document</span>
                                    )}
                                    {item.type === "embed" && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 uppercase tracking-wider font-heading"><LinkIcon className="w-3 h-3 mr-1" /> Link</span>
                                    )}
                                    {item.type === "text" && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-wider font-heading"><FileText className="w-3 h-3 mr-1" /> Text</span>
                                    )}
                                  </div>
                                  <span className="group-hover:text-[#0078d4] dark:group-hover:text-[#04a4ec] transition-colors font-heading text-base">{item.title}</span>
                                </div>
                              </div>
                              {isItemCompleted && (
                                <span className="text-[10px] font-bold text-[#0078d4] dark:text-[#04a4ec] bg-[#d6e9f8]/60 dark:bg-[#0078d4]/15 px-2 py-1 rounded-full uppercase tracking-wider font-heading border border-[#0078d4]/20 shrink-0 mt-1">Completed</span>
                              )}
                            </div>
                            
                            {/* Lecture Description if present */}
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-body pl-8">
                                {item.description}
                              </p>
                            )}

                            {/* Video Content */}
                            {(item.type === "video" || item.videoUrl || (item.formats?.includes("video") && item.url)) && (item.videoUrl || item.url) && (
                              <div className="pl-8 mt-3">
                                {isYouTubeUrl(item.videoUrl || item.url || "") ? (
                                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <iframe
                                      src={getYouTubeEmbedUrl(item.videoUrl || item.url || "")}
                                      className="w-full h-full"
                                      allowFullScreen
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      onLoad={() => handleCompleteItem(item.id)}
                                    ></iframe>
                                  </div>
                                ) : (
                                  <video
                                    src={item.videoUrl || item.url}
                                    controls
                                    className="w-full max-h-96 rounded-xl bg-black border border-slate-200 dark:border-slate-700 shadow-sm"
                                    onPlay={() => handleCompleteItem(item.id)}
                                  />
                                )}
                              </div>
                            )}

                            {/* Embed Content */}
                            {(item.type === "embed" || item.embedUrl || (item.formats?.includes("embed") && item.url)) && (item.embedUrl || item.url) && (
                              <div className="pl-8 mt-3">
                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <iframe
                                    src={getYouTubeEmbedUrl(item.embedUrl || item.url || "")}
                                    className="w-full h-full"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    onLoad={() => handleCompleteItem(item.id)}
                                  ></iframe>
                                </div>
                              </div>
                            )}

                            {/* Document Content */}
                            {(item.type === "document" || item.documentUrl || (item.formats?.includes("document") && item.url)) && (item.documentUrl || item.url) && (
                              <div className="pl-8 mt-3">
                                <a
                                  href={item.documentUrl || item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => { e.stopPropagation(); handleCompleteItem(item.id); }}
                                  className="inline-flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0078d4] dark:text-[#04a4ec] rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-xs font-heading"
                                >
                                  <FileText className="w-4 h-4 mr-2" /> View Document
                                </a>
                              </div>
                            )}

                            {/* Text Content */}
                            {(item.type === "text" || item.content) && item.content && (
                              <div className="pl-8 mt-3">
                                <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 font-body cursor-auto" onClick={(e) => e.stopPropagation()}>
                                  <p className="whitespace-pre-wrap leading-relaxed">
                                    {item.content}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Instructor / Org View (Editable - Udemy Style Curriculum Builder)
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Curriculum Builder
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-body">
            Build and arrange your course modules, video lectures, and learning items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setPreviewMode(true)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer font-heading shadow-xs"
          >
            <Eye className="w-4 h-4 mr-2" /> Preview as Student
          </button>
          {isDirty && (
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold transition-colors shadow-sm hover:shadow-md flex items-center shrink-0 font-heading cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {localModules.map((mod, index) => (
          <div
            key={mod.id}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Module Header */}
            <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="font-bold text-slate-900 dark:text-white shrink-0 flex items-center font-heading">
                <span className="text-sm">Module {index + 1}:</span>
              </div>
              <div className="flex-1 space-y-4">
                <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#0078d4]/30 focus-within:border-[#0078d4] transition shadow-2xs">
                  <input
                    type="text"
                    required
                    value={mod.title}
                    onChange={(e) => updateModule(index, "title", e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 font-heading"
                    placeholder="Enter a title for this module (e.g. Introduction to the Course)"
                  />
                </div>
                <div>
                  <textarea
                    value={mod.description || mod.content || ""}
                    onChange={(e) =>
                      updateModule(index, "description", e.target.value)
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-slate-900 dark:text-white font-body leading-relaxed shadow-2xs resize-none"
                    placeholder="Brief summary of what students will learn in this module..."
                    rows={2}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeModule(index)}
                className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 cursor-pointer self-start border border-transparent hover:border-red-200 dark:hover:border-red-900"
                title="Delete Module"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Module Body (Items List) */}
            <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-4">
                {mod.items &&
                  mod.items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", JSON.stringify({ moduleIndex: index, itemIndex }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        try {
                          const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                          if (data.moduleIndex === index && data.itemIndex !== itemIndex) {
                             const newModules = [...localModules];
                             const items = [...(newModules[index].items || [])];
                             const [draggedItem] = items.splice(data.itemIndex, 1);
                             items.splice(itemIndex, 0, draggedItem);
                             newModules[index] = { ...newModules[index], items };
                             setDraftModules(newModules);
                          }
                        } catch (err) {
                          console.error("Failed to parse drop data:", err);
                        }
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow group/item"
                    >
                      {/* Item Header */}
                      <div className="p-3 sm:px-5 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1 shrink-0 -ml-2 transition-colors">
                             <GripVertical className="w-5 h-5" />
                          </div>
                          
                          {/* Item Type Badge */}
                          <div className="flex items-center shrink-0">
                            {item.type === "video" && (
                              <span className="inline-flex items-center text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded border border-purple-200 dark:border-purple-800/60 uppercase tracking-wider font-heading"><Video className="w-3 h-3 mr-1" /> Video</span>
                            )}
                            {item.type === "document" && (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider font-heading"><FileText className="w-3 h-3 mr-1" /> Document</span>
                            )}
                            {item.type === "embed" && (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/60 uppercase tracking-wider font-heading"><LinkIcon className="w-3 h-3 mr-1" /> Link</span>
                            )}
                            {item.type === "text" && (
                              <span className="inline-flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider font-heading"><FileText className="w-3 h-3 mr-1" /> Text</span>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            required
                            value={item.title}
                            onChange={(e) =>
                              updateModuleItem(
                                index,
                                itemIndex,
                                "title",
                                e.target.value,
                              )
                            }
                            placeholder={`Enter ${item.type} title`}
                            className="flex-1 bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 font-heading"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeModuleItem(index, itemIndex)}
                          className="text-slate-400 hover:text-red-500 ml-3 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Content Area */}
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/40 space-y-4">
                        {/* Text Editor for Content */}
                        {item.type === "text" && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-heading block">Text Content</label>
                            <textarea
                              required
                              value={item.content || ""}
                              onChange={(e) =>
                                updateModuleItem(
                                  index,
                                  itemIndex,
                                  "content",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] leading-relaxed text-slate-900 dark:text-white font-body shadow-2xs"
                              placeholder="Write your article or text content here..."
                              rows={5}
                            />
                          </div>
                        )}
                        
                        {/* URL / Embed Input */}
                        {(item.type === "embed" || item.type === "video") && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-heading block">
                              {item.type === "video" ? "Video URL (YouTube, Vimeo, etc.)" : "External Link URL"}
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <LinkIcon className="w-4 h-4 text-slate-400" />
                              </div>
                              <input
                                type="url"
                                required={item.type === "embed"}
                                value={item.url || ""}
                                onChange={(e) =>
                                  updateModuleItem(
                                    index,
                                    itemIndex,
                                    "url",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4]/30 focus:border-[#0078d4] text-slate-900 dark:text-white shadow-2xs font-body"
                                placeholder={item.type === "video" ? "Paste video link here..." : "Paste external resource link..."}
                              />
                            </div>
                          </div>
                        )}

                        {/* File Uploader for Video / Document */}
                        {(item.type === "video" || item.type === "document") && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-heading block">
                              {item.type === "video" ? "Or Upload Video File Directly" : "Upload Document File (PDF, DOCX, etc.)"}
                            </label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition duration-200">
                              <div className="max-w-xs mx-auto">
                                <FileUpload
                                  label={`Upload ${item.type === "video" ? "Video" : "Document"}`}
                                  accept={
                                    item.type === "video"
                                      ? "video/*"
                                      : ".pdf,.doc,.docx,.txt"
                                  }
                                  onUpload={(url) => {
                                    updateModuleItem(index, itemIndex, "url", url);
                                    if (item.type === "document") {
                                      addMaterial({
                                        courseId: course.id,
                                        title: item.title || "Module Document",
                                        url: url,
                                        type: "doc",
                                      });
                                    }
                                  }}
                                />
                              </div>
                              {item.url && (
                                <div className="mt-4 inline-flex items-center px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 font-heading">
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Resource Added Successfully
                                </div>
                              )}
                              {!item.url && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium font-body">
                                  No file selected. Please upload a valid {item.type}.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Add Item Actions (Coursera / Udemy Style) */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Curriculum Item
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addModuleItem(index, "video")}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-2xs cursor-pointer font-heading hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        <Video className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Video
                      </button>
                      <button
                        type="button"
                        onClick={() => addModuleItem(index, "document")}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-2xs cursor-pointer font-heading hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Document
                      </button>
                      <button
                        type="button"
                        onClick={() => addModuleItem(index, "embed")}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-2xs cursor-pointer font-heading hover:text-amber-600 dark:hover:text-amber-400"
                      >
                        <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Link
                      </button>
                      <button
                        type="button"
                        onClick={() => addModuleItem(index, "text")}
                        className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-2xs cursor-pointer font-heading hover:text-slate-900 dark:hover:text-white"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Article
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Global Add Module Button */}
        <button
          type="button"
          onClick={addModule}
          className="w-full py-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0078d4] dark:hover:border-[#04a4ec] text-slate-500 hover:text-[#0078d4] dark:text-slate-400 dark:hover:text-[#04a4ec] hover:bg-[#f0f7fd] dark:hover:bg-[#0078d4]/10 rounded-2xl text-sm font-bold transition flex items-center justify-center cursor-pointer font-heading"
        >
          <Plus className="w-5 h-5 mr-2" /> Add New Module
        </button>
      </div>

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};