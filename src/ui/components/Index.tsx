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
import AboutUs from "../pages/AboutUs";
import Policy from "../pages/Policy";
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

const Index: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <GlobalLoader />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto p-6">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/about-us" element={<AboutUs />} />

                  <Route path="/privacy" element={<Policy />} />
                  <Route
                    path="/explore"
                    element={
                      <ProtectedRoute>
                        <ExploreOrgs />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/org/:orgId" element={<OrgProfile />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboard"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/upload-course"
                    element={
                      <ProtectedRoute>
                        <CourseUpload />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/course/:courseId"
                    element={
                      <ProtectedRoute>
                        <CourseDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lunch"
                    element={
                      <ProtectedRoute>
                        <Lunch />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/events" element={<Events />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Index;
