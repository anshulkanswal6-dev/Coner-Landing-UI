import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/App.css";

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render (prevents race conditions)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
