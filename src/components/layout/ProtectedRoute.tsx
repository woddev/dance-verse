import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole) {
    // super_admin and finance_admin also have access to admin routes
    const roleMatch = requiredRole === "admin"
      ? hasRole("admin") || hasRole("super_admin") || hasRole("finance_admin")
      : hasRole(requiredRole);
    if (!roleMatch) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
