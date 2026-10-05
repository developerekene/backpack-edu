/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Circle, Square, Pause, Play, Download, 
  Check, AlertCircle, Save, X, Eye, FileVideo
} from 'lucide-react';
import { useAppContext } from '../../store/AppContext';

interface LiveClassRecorderProps {
  roomName: string;
  courseId?: string;
  isInstructor?: boolean;
}

export const LiveClassRecorder: React.FC<LiveClassRecorderProps> = ({
  roomName,
  courseId,
}) => {
  const { addMaterial } = useAppContext();

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordingTimeSec, setRecordingTimeSec] = useState<number>(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Manage timer interval
  useEffect(() => {
    if (recordingState === 'recording') {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimeSec(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [recordingState]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const displayMins = mins % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setErrorMessage(null);
    recordedChunksRef.current = [];
    setRecordingTimeSec(0);

    try {
      let captureStream: MediaStream | null = null;

      // First try screen share with audio
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
          captureStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30, max: 60 } },
            audio: true
          });
        } catch (e: any) {
          if (e.name === 'NotAllowedError') {
            return; // user cancelled screen share dialog
          }
        }
      }

      // Fallback to webcam and microphone if getDisplayMedia is cancelled or not available
      if (!captureStream) {
        captureStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }

      streamRef.current = captureStream;

      // Select supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(captureStream, options);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm'
        });
        const url = URL.createObjectURL(fullBlob);
        setRecordedBlobUrl(url);
        setIsPreviewModalOpen(true);
        setRecordingState('stopped');

        // Stop all tracks in the capture stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      // Handle stream track ended by browser control bar
      captureStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.start(1000); // chunk every 1 second
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
    } catch (err: any) {
      console.warn('Recording error:', err);
      setErrorMessage(err.message || 'Could not start screen/audio recording.');
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDownloadVideo = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `live-class-${roomName}-${new Date().toISOString().split('T')[0]}.webm`;
    a.click();
  };

  const handleSaveToMaterials = async () => {
    if (!courseId) return;
    try {
      await addMaterial({
        id: `mat_rec_${Date.now()}`,
        courseId,
        title: `Live Class Recording (${roomName}) - ${new Date().toLocaleDateString()}`,
        type: 'video',
        url: recordedBlobUrl || '',
        createdAt: new Date().toISOString()
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.warn('Could not save recording material:', e);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
            title="Start recording live class"
          >
            <Circle className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span className="hidden sm:inline">Record Class</span>
          </button>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="flex items-center space-x-1.5 bg-slate-900/95 border border-red-500/50 rounded-xl px-2.5 py-1 shadow-lg animate-in fade-in duration-200">
            <span className="flex items-center space-x-1 text-red-400 text-xs font-mono font-bold">
              <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${recordingState === 'recording' ? 'animate-ping' : 'opacity-50'}`} />
              <span>{formatTimer(recordingTimeSec)}</span>
            </span>

            {recordingState === 'recording' ? (
              <button
                onClick={pauseRecording}
                className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition"
                title="Pause recording"
              >
                <Pause className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="p-1 rounded-md hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition"
                title="Resume recording"
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
            )}

            <button
              onClick={stopRecording}
              className="p-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white transition"
              title="Stop & Save recording"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {recordedBlobUrl && recordingState === 'stopped' && (
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Recording</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="absolute top-14 right-4 z-50 bg-red-950/90 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs shadow-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Recorded Video Playback & Download Modal */}
      {isPreviewModalOpen && recordedBlobUrl && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Class Recording Preview</h3>
                  <p className="text-xs text-slate-400">Duration: {formatTimer(recordingTimeSec)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <video
                src={recordedBlobUrl}
                controls
                className="w-full h-full object-contain"
                autoPlay
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
              <button
                onClick={handleDownloadVideo}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Video (.webm)</span>
              </button>

              {courseId && (
                <button
                  onClick={handleSaveToMaterials}
                  disabled={savedSuccess}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-2 border border-slate-700"
                >
                  {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                  <span>{savedSuccess ? 'Saved to Materials' : 'Save to Course Study Materials'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setRecordingState('idle');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
