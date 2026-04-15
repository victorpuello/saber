import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  roles?: string[];
  children: React.ReactNode;
}

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export default function ProtectedRoute({ roles, children }: Props) {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="glass-panel animate-login-fade-in rounded-2xl border border-outline-variant px-6 py-4 text-sm font-semibold text-secondary">
          Verificando sesión...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;
  }

  return <>{children}</>;
}
