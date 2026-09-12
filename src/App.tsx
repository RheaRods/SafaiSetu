import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import HouseholdDashboard from '@/pages/household/HouseholdDashboard';
import WorkerDashboard from '@/pages/worker/WorkerDashboard';
import SupervisorDashboard from '@/pages/supervisor/SupervisorDashboard';
import { LoadingSpinner } from '@/components/ui';
import ErrorBoundary from '@/components/ErrorBoundary';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!profile) return <Navigate to="/signin" replace />;
  if (!allowedRoles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!profile) return <Navigate to="/signin" replace />;
  if (profile.role === 'household') return <Navigate to="/household" replace />;
  if (profile.role === 'worker') return <Navigate to="/worker" replace />;
  if (profile.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  return <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/household" element={<ProtectedRoute allowedRoles={['household']}><HouseholdDashboard /></ProtectedRoute>} />
          <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
