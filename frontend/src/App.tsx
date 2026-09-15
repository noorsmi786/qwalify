import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout, AuthenticatedLayout } from '@/components/layout/Layouts';
import { LoginPage, SignupPage, ForgotPasswordPage } from '@/pages/auth/AuthPages';
import DashboardPage from '@/pages/Dashboard';
import LeadsPage from '@/pages/Leads';
import LeadDetailPage from '@/pages/LeadDetail';
import SettingsPage from '@/pages/Settings';
import BookingsPage from '@/pages/Bookings';
import OnboardingPage from '@/pages/Onboarding';
import FeaturesGuidePage from '@/pages/FeaturesGuide';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Onboarding wizard */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected app routes */}
        <Route element={<AuthenticatedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/features" element={<FeaturesGuidePage />} />
          <Route path="/guide" element={<FeaturesGuidePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
