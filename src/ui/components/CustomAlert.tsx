/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export type AlertState = "confirm" | "loading" | "success" | "error";

export interface CustomAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  const [status, setStatus] = useState<AlertState>("confirm");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStatus("confirm");
      setErrorMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      await onConfirm();
      setStatus("success");
      setTimeout(() => {
        onCancel();
      }, 1200);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "An error occurred");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm overflow-hidden animate-in zoom-in-75 fade-in duration-500 ease-out">
        {status === "confirm" && (
          <div className="p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              {message}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-red-600/20"
              >
                {confirmText}
              </button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="p-8 flex flex-col items-center justify-center animate-in slide-in-from-right-8 fade-in duration-300">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Processing...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="p-8 flex flex-col items-center justify-center animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 animate-in zoom-in" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              Done!
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="p-6 text-center animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <XCircle className="w-8 h-8 animate-in zoom-in" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Failed
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
