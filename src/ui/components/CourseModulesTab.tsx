import { useState, useEffect } from "react";
import { CheckCircle, Video, FileText, Link as LinkIcon, Trash2, Plus, CheckCircle2, Save } from "lucide-react";
import { Course, CourseModule } from "../../types";
import { useAppContext } from "../../store/AppContext";
import { useAuth } from "../../store/AuthContext";
import { FileUpload } from "./FileUpload";
import { generateId } from "../../lib/id";

interface CourseModulesTabProps {
    course: Course;
    isStudent: boolean;
}

export const CourseModulesTab = ({ course, isStudent }: CourseModulesTabProps) => {
    const { currentUser } = useAuth();
    const { userProgress, updateProgress, updateCourse } = useAppContext();
    
    const [localModules, setLocalModules] = useState<CourseModule[]>(course.modules || []);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isDirty) {
            setLocalModules(course.modules || []);
        }
    }, [course.modules, isDirty]);

    const progress = userProgress.find(p => p.courseId === course.id && p.userId === currentUser?.id);

    const handleCompleteModule = (moduleId: string) => {
        if (!currentUser || !isStudent) return;
        const completed = progress?.completedModuleIds || [];
        if (!completed.includes(moduleId)) {
            updateProgress({
                userId: currentUser.id,
                courseId: course.id,
                completedModuleIds: [...completed, moduleId],
                performanceScore: progress?.performanceScore || 85
            });
        }
    };

    const addModule = () => {
        setLocalModules([
            ...localModules,
            {
                id: generateId("mod"),
                title: "",
                description: "",
                items: [],
            },
        ]);
        setIsDirty(true);
    };

    const updateModule = (index: number, field: keyof CourseModule, value: any) => {
        const newModules = [...localModules];
        newModules[index] = { ...newModules[index], [field]: value };
        setLocalModules(newModules);
        setIsDirty(true);
    };

    const removeModule = (index: number) => {
        if (confirm("Are you sure you want to delete this module?")) {
            const newModules = [...localModules];
            newModules.splice(index, 1);
            setLocalModules(newModules);
            setIsDirty(true);
        }
    };

    const addModuleItem = (moduleIndex: number, type: "video" | "document" | "link" | "text" | "embed") => {
        const newModules = [...localModules];
        if (!newModules[moduleIndex].items) {
            newModules[moduleIndex].items = [];
        }
        newModules[moduleIndex].items!.push({
            id: generateId("item"),
            title: "",
            type,
            content: "",
            url: "",
        });
        setLocalModules(newModules);
        setIsDirty(true);
    };

    const updateModuleItem = (moduleIndex: number, itemIndex: number, field: string, value: any) => {
        const newModules = [...localModules];
        const item = newModules[moduleIndex].items![itemIndex];
        newModules[moduleIndex].items![itemIndex] = { ...item, [field]: value };
        setLocalModules(newModules);
        setIsDirty(true);
    };

    const removeModuleItem = (moduleIndex: number, itemIndex: number) => {
        if (confirm("Are you sure you want to delete this item?")) {
            const newModules = [...localModules];
            newModules[moduleIndex].items!.splice(itemIndex, 1);
            setLocalModules(newModules);
            setIsDirty(true);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        await updateCourse(course.id, { modules: localModules });
        setIsDirty(false);
        setIsSaving(false);
    };

    if (isStudent) {
        // Read-only student view
        return (
            <div className="p-6 space-y-6 animate-in fade-in">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Course Modules</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review the course material and track your progress.</p>
                </div>

                {course.modules.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        No modules have been published yet.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {course.modules.map((mod, index) => {
                            const isCompleted = progress?.completedModuleIds.includes(mod.id);
                            return (
                                <div key={mod.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
                                                <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">Module {index + 1}:</span>
                                                {mod.title}
                                            </div>
                                            {mod.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{mod.description}</p>}
                                            {mod.content && !mod.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{mod.content}</p>}
                                        </div>
                                        {isCompleted ? (
                                            <span className="flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-semibold whitespace-nowrap"><CheckCircle className="w-4 h-4 mr-2"/> Completed</span>
                                        ) : (
                                            <button onClick={() => handleCompleteModule(mod.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap shadow-sm">
                                                Mark Complete
                                            </button>
                                        )}
                                    </div>
                                    
                                    {mod.items && mod.items.length > 0 && (
                                        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Module Items</h4>
                                            <div className="space-y-3">
                                                {mod.items.map((item, itemIndex) => (
                                                    <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
                                                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                                            <span className="text-xs text-slate-400 mr-1">{itemIndex + 1}.</span>
                                                            {item.type === 'video' && <Video className="w-4 h-4 text-purple-500 shrink-0" />}
                                                            {item.type === 'document' && <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                                                            {item.type === 'embed' && <LinkIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                            {item.type === 'text' && <FileText className="w-4 h-4 text-slate-500 shrink-0" />}
                                                            {item.title}
                                                        </div>
                                                        {item.type === 'text' && (
                                                            <div className="text-sm text-slate-600 dark:text-slate-300 prose prose-invert max-w-none bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                                                <p className="whitespace-pre-wrap">{item.content}</p>
                                                            </div>
                                                        )}
                                                        {item.type === 'embed' && item.url && (
                                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                <iframe src={item.url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
                                                            </div>
                                                        )}
                                                        {item.type === 'video' && item.url && (
                                                            <video src={item.url} controls className="w-full max-h-96 rounded-xl bg-black border border-slate-200 dark:border-slate-700 shadow-sm" />
                                                        )}
                                                        {item.type === 'document' && item.url && (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition border border-indigo-100 dark:border-indigo-500/20">
                                                                <FileText className="w-4 h-4 mr-2" /> View / Download Document
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Legacy Media (Keep for backwards compatibility) */}
                                    {mod.media && mod.media.length > 0 && (
                                        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Legacy Attachments</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {mod.media.map((med) => (
                                                    <div key={med.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                                                        {med.type === 'document' ? (
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-2.5 overflow-hidden">
                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                                                        <FileText className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{med.name}</span>
                                                                </div>
                                                                <a href={med.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition shrink-0 ml-2">
                                                                    View
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <a href={med.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">{med.name} ({med.type})</a>
                                                        )}
                                                    </div>
                                                ))}
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

    // Instructor / Org View (Editable)
    return (
        <div className="p-6 space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Course Modules</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Build and arrange your course modules and learning items.
                    </p>
                </div>
                {isDirty && (
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-600/20 flex items-center shrink-0"
                    >
                        {isSaving ? (
                            <>Saving...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                        )}
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {localModules.map((mod, index) => (
                    <div
                        key={mod.id}
                        className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-300 dark:border-slate-600 rounded-xl relative group overflow-hidden"
                    >
                        {/* Module Header */}
                        <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                            <div className="font-bold text-slate-900 dark:text-white shrink-0 flex items-center">
                                <span className="text-sm">Module {index + 1}:</span>
                            </div>
                            <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                                <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    required
                                    value={mod.title}
                                    onChange={(e) => updateModule(index, "title", e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                                    placeholder="Enter a title for this module"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeModule(index)}
                                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0"
                                title="Delete Module"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Module Body */}
                        <div className="p-4 sm:p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    What will students learn in this module?
                                </label>
                                <textarea
                                    value={mod.description || mod.content || ""}
                                    onChange={(e) => updateModule(index, "description", e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                                    placeholder="Brief summary of the learning objectives..."
                                    rows={2}
                                />
                            </div>

                            {/* Module Items */}
                            <div className="space-y-4 sm:pl-8 sm:border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                                {mod.items && mod.items.map((item, itemIndex) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow group/item">
                                        {/* Item Header */}
                                        <div className="p-3 sm:px-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
                                                    Item {itemIndex + 1}:
                                                </span>
                                                {item.type === "video" && <Video className="w-4 h-4 text-purple-500 shrink-0" />}
                                                {item.type === "document" && <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                                                {item.type === "embed" && <LinkIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                {item.type === "text" && <FileText className="w-4 h-4 text-slate-500 shrink-0" />}
                                                <input
                                                    type="text"
                                                    required
                                                    value={item.title}
                                                    onChange={(e) => updateModuleItem(index, itemIndex, "title", e.target.value)}
                                                    placeholder="Enter a title"
                                                    className="flex-1 bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeModuleItem(index, itemIndex)}
                                                className="text-slate-400 hover:text-red-500 ml-3 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                                                title="Delete Item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        {/* Item Content */}
                                        <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 space-y-3">
                                            {item.type === "text" && (
                                                <textarea
                                                    required
                                                    value={item.content || ""}
                                                    onChange={(e) => updateModuleItem(index, itemIndex, "content", e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 leading-relaxed text-slate-900 dark:text-white"
                                                    placeholder="Write your item content here... (Markdown supported)"
                                                    rows={5}
                                                />
                                            )}
                                            {item.type === "embed" && (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700">
                                                        <LinkIcon className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                    <input
                                                        type="url"
                                                        required
                                                        value={item.url || ""}
                                                        onChange={(e) => updateModuleItem(index, itemIndex, "url", e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                                        placeholder="Paste video or external resource link URL here..."
                                                    />
                                                </div>
                                            )}
                                            {(item.type === "video" || item.type === "document") && (
                                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition duration-200">
                                                    <div className="max-w-xs mx-auto">
                                                        <FileUpload
                                                            label={`Upload ${item.type === 'video' ? 'Video' : 'Document'}`}
                                                            accept={item.type === "video" ? "video/*" : ".pdf,.doc,.docx,.txt"}
                                                            onUpload={(url) => updateModuleItem(index, itemIndex, "url", url)}
                                                        />
                                                    </div>
                                                    {item.url && (
                                                        <div className="mt-4 inline-flex items-center px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-800/50">
                                                            <CheckCircle2 className="w-4 h-4 mr-2" /> File Uploaded Successfully
                                                        </div>
                                                    )}
                                                    {!item.url && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                                                            No file selected. Please upload a {item.type}.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Add Item Actions */}
                                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                                        <Plus className="w-4 h-4 mr-1" /> Add Module Item
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => addModuleItem(index, "video")}
                                            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                                        >
                                            <Video className="w-3.5 h-3.5 mr-1.5" /> Video
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addModuleItem(index, "document")}
                                            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Article / Doc
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addModuleItem(index, "embed")}
                                            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addModuleItem(index, "text")}
                                            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-500 hover:text-slate-900 dark:hover:text-white text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center shadow-sm"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Text
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addModule}
                    className="w-full py-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 rounded-2xl text-sm font-bold transition flex items-center justify-center bg-transparent"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add Module
                </button>
            </div>
        </div>
    );
};
