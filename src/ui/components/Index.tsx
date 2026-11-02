import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import ExploreOrgs from "../pages/ExploreOrgs";
import Events from "../pages/Events";
import Home from "../pages/Home";
import Onboarding from "../pages/Onboarding";
import CourseUpload from "../pages/CourseUpload";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import CourseDetails from "../pages/CourseDetails";
import Lunch from "../pages/Lunch";
import { OrgProfile } from "../pages/OrgProfile";
import { Settings } from "../pages/Settings";
import { Profile } from "../pages/Profile";
import { Navbar } from "./Navbar";
import { AppProvider } from "../../store/AppContext";
import { AuthProvider, useAuth } from "../../store/AuthContext";
import { ThemeProvider } from "../../store/ThemeContext";
import { EventProvider } from "../../store/EventContext";
import { AccessibilityProvider } from "../../store/AccessibilityContext";
import { ColorFilterOverlay } from "./accessibility/ColorFilterOverlay";
import { ReadingFocusRuler } from "./accessibility/ReadingFocusRuler";
import { TTSFloatingController } from "./accessibility/TTSFloatingController";
import { UniversalAccessibilityModal } from "./accessibility/UniversalAccessibilityModal";
import AboutUs from "../pages/AboutUs";
import Policy from "../pages/Policy";
import { LiveRoomPage } from "../pages/LiveRoomPage";
import { GlobalLoader } from "./GlobalLoader";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, firebaseUser, loading } = useAuth();

  if (loading && !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        {/* We rely on GlobalLoader for visual loading indicators */}
      </div>
    );
  }

  if (!currentUser && !firebaseUser && !loading)
    return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 flex-1">
    {children}
  </div>
);

const Index: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <EventProvider>
            <AccessibilityProvider>
              <BrowserRouter>
                <GlobalLoader />
                <ColorFilterOverlay />
                <ReadingFocusRuler />
                <TTSFloatingController />
                <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0a1824] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
                  <Navbar />
                  <UniversalAccessibilityModal />
                  <main className="flex-1 w-full flex flex-col">
                    <Routes>
                      {/* Home has full-width layout capabilities with edge-to-edge Hero */}
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
                      <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
                      <Route path="/about-us" element={<PageWrapper><AboutUs /></PageWrapper>} />
                      <Route path="/donate" element={<Navigate to="/explore" replace />} />
                      <Route path="/donate/:courseId" element={<Navigate to="/explore" replace />} />

                      <Route path="/privacy" element={<PageWrapper><Policy /></PageWrapper>} />
                      <Route path="/live" element={<PageWrapper><LiveRoomPage /></PageWrapper>} />
                      <Route path="/live/:roomName" element={<PageWrapper><LiveRoomPage /></PageWrapper>} />
                      <Route path="/explore" element={<PageWrapper><ExploreOrgs /></PageWrapper>} />
                      <Route path="/org/:orgId" element={<PageWrapper><OrgProfile /></PageWrapper>} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><Dashboard /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/onboard"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><Onboarding /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/upload-course"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><CourseUpload /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/course/:courseId"
                        element={<PageWrapper><CourseDetails /></PageWrapper>}
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><Settings /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><Profile /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/lunch"
                        element={
                          <ProtectedRoute>
                            <PageWrapper><Lunch /></PageWrapper>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/events" element={<PageWrapper><Events /></PageWrapper>} />
                    </Routes>
                  </main>
                </div>
              </BrowserRouter>
            </AccessibilityProvider>
          </EventProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Index;
