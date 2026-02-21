import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="animate-pulse text-zinc-400 font-body">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
