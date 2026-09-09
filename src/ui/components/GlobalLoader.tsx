import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useAppContext } from "../../store/AppContext";

export const GlobalLoader: React.FC = () => {
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const { isLoadingApp } = useAppContext();
  
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevLocation = useRef(`${location.pathname}${location.search}`);

  // Adjust state during render to avoid cascading renders from useEffect
  if (isFirstLaunch) {
    const hasCache = !!localStorage.getItem("bp_cache_organizations");
    if (!authLoading && (!isLoadingApp || hasCache)) {
      setIsFirstLaunch(false);
    }
  }

  useEffect(() => {
    const currentLocation = `${location.pathname}${location.search}`;

    if (isFirstLaunch) {
      prevLocation.current = currentLocation;
      return;
    }

    if (prevLocation.current !== currentLocation) {
      prevLocation.current = currentLocation;

      const startTimer = setTimeout(() => {
        setIsNavigating(true);
        setProgress(15);
      }, 0);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval);
            return 85;
          }
          return prev + Math.random() * 15;
        });
      }, 150);

      const timer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsNavigating(false);
          setProgress(0);
        }, 250); // wait for transition to finish
      }, 400);

      return () => {
        clearTimeout(startTimer);
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [location.pathname, location.search, isFirstLaunch]);

  if (isFirstLaunch) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (isNavigating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-100 h-1 bg-transparent overflow-hidden">
        <div
          className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(79,70,229,0.7)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  return null;
};
