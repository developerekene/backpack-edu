import React, { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { ScheduleEvent } from '../../types';
import { Calendar, Video, Plus, Trash2 } from 'lucide-react';
import { ProctoringSession } from './ProctoringSession';
import { LiveKitCall } from './LiveKitCall';

export const CourseSchedule = ({ courseId, isStudent }: { courseId: string, isStudent: boolean }) => {
    const { scheduleEvents, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, organizations, courses } = useAppContext();
    const { currentUser } = useAuth();
    const courseEvents = scheduleEvents.filter(e => e.courseId === courseId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const currentCourse = courses.find(c => c.id === courseId);
    const myOrg = organizations.find(o => o.ownerId === currentUser?.id || o.id === currentUser?.id);
    const courseOrg = organizations.find(o => o.id === currentCourse?.orgId || o.ownerId === currentCourse?.orgId) || myOrg;
    const organisationName = (courseOrg?.name || "organisation").toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const courseTitle = (currentCourse?.title || "course").toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const getEventRoomName = (evt: ScheduleEvent) => {
        const timestamp = new Date(`${evt.date}T${evt.time}`).getTime() || evt.id;
        return `${organisationName}-${courseTitle}-${timestamp}`;
    };
    
    const participantDisplayName = currentUser?.role === 'organization'
        ? (myOrg?.name || currentUser?.name || "Organization")
        : (currentUser?.name || "Participant");
    
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [durationMins, setDurationMins] = useState(60);
    const [type, setType] = useState<'lecture' | 'meeting' | 'exam'>('lecture');
    const [meetingUrl, setMeetingUrl] = useState("");
    
    // Stabilize Date.now() for render
    const [currentTime] = useState(() => Date.now());
    
    // Track which event has active proctoring
    const [activeProctoringId, setActiveProctoringId] = useState<string | null>(null);

    // Track active embedded video call room
    const [activeLiveKitRoom, setActiveLiveKitRoom] = useState<string | null>(null);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        const eventTimestamp = date && time ? new Date(`${date}T${time}`).getTime() : Date.now();
        const defaultMeetingUrl = `https://meet.jit.si/${organisationName}-${courseTitle}-${eventTimestamp}`;
        const newEvent: ScheduleEvent = {
            id: `evt_${Math.random().toString(36).substring(2, 15)}`,
            courseId,
            title,
            date,
            time,
            durationMins: Number(durationMins),
            type,
            meetingUrl: meetingUrl.trim() || defaultMeetingUrl,
            isActive: false
        };
        await addScheduleEvent(newEvent);
        setTitle("");
        setDate("");
        setTime("");
        setDurationMins(60);
        setMeetingUrl("");
    };

    return (
        <div className="space-y-8">
            {!isStudent && (
                <form onSubmit={handleCreateEvent} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-indigo-400" /> Schedule Class Event</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Title</label>
                            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Week 1 Lecture" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Date</label>
                            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Time</label>
                            <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Duration (mins)</label>
                            <input required type="number" min={15} value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as 'lecture' | 'meeting' | 'exam')} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none">
                                <option value="lecture">Lecture</option>
                                <option value="meeting">Meeting</option>
                                <option value="exam">Exam</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Meeting URL (Optional)</label>
                            <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="https://meet.google.com/..." />
                        </div>
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-lg font-bold transition w-full sm:w-auto flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-2" /> Add to Timetable
                    </button>
                </form>
            )}

            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Class Timetable</h3>
                {courseEvents.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 dark:text-slate-400">No events scheduled.</div>
                ) : (
                    <div className="space-y-4">
                        {courseEvents.map(evt => {
                            const isPast = new Date(`${evt.date}T${evt.time}`).getTime() < currentTime;
                            return (
                                <div key={evt.id} className={`flex flex-col sm:flex-row p-5 rounded-xl border ${isPast ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-800 opacity-60' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                    <div className="flex-shrink-0 w-24 mb-3 sm:mb-0 text-center sm:text-left">
                                        <div className="text-sm font-bold text-indigo-400 uppercase tracking-wider">{new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                        <div className="text-slate-900 dark:text-white font-medium">{evt.time}</div>
                                        <div className="text-xs text-slate-500">{evt.durationMins} mins</div>
                                    </div>
                                    <div className="flex-grow pl-0 sm:pl-6 sm:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{evt.title}</h4>
                                                    <span className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold rounded-full border border-slate-200 dark:border-slate-700">{evt.type}</span>
                                                </div>
                                                {!isStudent && (
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm("Delete this event from the timetable?")) {
                                                                deleteScheduleEvent(evt.id);
                                                            }
                                                        }}
                                                        title="Delete event"
                                                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {evt.meetingUrl && (
                                            <div className="mt-3 flex flex-col gap-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {activeLiveKitRoom === getEventRoomName(evt) ? (
                                                        <span className="inline-flex items-center px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-bold">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2" /> Live Call Active
                                                        </span>
                                                    ) : !evt.isActive ? (
                                                        !isStudent ? (
                                                            <button 
                                                                onClick={async () => {
                                                                    await updateScheduleEvent(evt.id, { isActive: true });
                                                                    setActiveLiveKitRoom(getEventRoomName(evt));
                                                                }}
                                                                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition shadow-sm"
                                                            >
                                                                <Video className="w-4 h-4 mr-2" /> Start Live Class
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-medium">
                                                                <Video className="w-3.5 h-3.5 mr-1.5 opacity-60" /> Waiting for instructor to start call
                                                            </span>
                                                        )
                                                    ) : (
                                                        isStudent && (evt.type === 'lecture' || evt.type === 'exam') && activeProctoringId !== evt.id ? (
                                                            <button 
                                                                onClick={() => setActiveProctoringId(evt.id)}
                                                                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-lg text-sm font-bold transition shadow-sm"
                                                            >
                                                                <Video className="w-4 h-4 mr-2" /> Start Monitored Session to Join
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setActiveLiveKitRoom(getEventRoomName(evt))} 
                                                                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${isPast ? 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 hover:text-slate-900 dark:text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                                                            >
                                                                <Video className="w-4 h-4 mr-2" /> Join Video Call
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                                
                                                {activeLiveKitRoom === getEventRoomName(evt) && (
                                                    <div className="mt-4">
                                                        <LiveKitCall 
                                                            roomName={getEventRoomName(evt)}
                                                            participantName={participantDisplayName}
                                                            userRole={currentUser?.role}
                                                            onClose={() => setActiveLiveKitRoom(null)}
                                                        />
                                                    </div>
                                                )}
                                                {activeProctoringId === evt.id && (
                                                    <div className="mt-2">
                                                        <ProctoringSession assessmentTitle={evt.title} onComplete={() => setActiveProctoringId(null)} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
