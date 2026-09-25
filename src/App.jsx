import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ChatbotWidget from './components/ChatbotWidget'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import AcademicProfile from './pages/AcademicProfile'
import Auth from './pages/Auth'
import CareerRecommendations from './pages/CareerRecommendations'
import CareerRoadmap from './pages/CareerRoadmap'
import Dashboard from './pages/Dashboard'
import Feedback from './pages/Feedback'
import HelpSupport from './pages/HelpSupport'
import JobMatching from './pages/JobMatching'
import MindRelax from './pages/MindRelax'
import Notifications from './pages/Notifications'
import OverallProgress from './pages/OverallProgress'
import PlacementPreparation from './pages/PlacementPreparation'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import ResumeBuilder from './pages/ResumeBuilder'
import Settings from './pages/Settings'
import SkillAnalysis from './pages/SkillAnalysis'
import WeeklyQuiz from './pages/WeeklyQuiz'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Public Authentication Routes */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            {/* Password Recovery Route */}
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>

                <Route
                  path="/"
                  element={<Dashboard />}
                />

                <Route
                  path="/academic-profile"
                  element={<AcademicProfile />}
                />

                <Route
                  path="/skills"
                  element={
                    <Navigate
                      to="/academic-profile?tab=skills"
                      replace
                    />
                  }
                />

                <Route
                  path="/certificates"
                  element={
                    <Navigate
                      to="/academic-profile?tab=certificates"
                      replace
                    />
                  }
                />

                <Route
                  path="/projects"
                  element={
                    <Navigate
                      to="/academic-profile?tab=projects"
                      replace
                    />
                  }
                />

                <Route
                  path="/experience"
                  element={
                    <Navigate
                      to="/academic-profile?tab=experience"
                      replace
                    />
                  }
                />

                <Route
                  path="/job-matching"
                  element={<JobMatching />}
                />

                <Route
                  path="/overall-progress"
                  element={<OverallProgress />}
                />

                <Route
                  path="/placement-preparation"
                  element={<PlacementPreparation />}
                />

                <Route
                  path="/weekly-quiz"
                  element={<WeeklyQuiz />}
                />

                <Route
                  path="/skill-analysis"
                  element={<SkillAnalysis />}
                />

                <Route
                  path="/career-recommendations"
                  element={<CareerRecommendations />}
                />

                <Route
                  path="/career-roadmap"
                  element={<CareerRoadmap />}
                />

                <Route
                  path="/resume-builder"
                  element={<ResumeBuilder />}
                />

                <Route
                  path="/mind-relax"
                  element={<MindRelax />}
                />

                <Route
                  path="/profile"
                  element={<Profile />}
                />

                <Route
                  path="/settings"
                  element={<Settings />}
                />

                <Route
                  path="/notifications"
                  element={<Notifications />}
                />

                <Route
                  path="/help"
                  element={<HelpSupport />}
                />

                <Route
                  path="/feedback"
                  element={<Feedback />}
                />

              </Route>
            </Route>

            {/* Fallback */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

          <ChatbotWidget />

        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App