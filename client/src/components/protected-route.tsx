import { ReactNode, useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // TEMPORARY: Bypass auth while database connectivity is being fixed
  // TODO: Set to false once Replit database is working
  const bypassAuth = true;

  if (bypassAuth) {
    // Wait for initial auth check
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    
    // In bypass mode, redirect unauthenticated users to login
    if (!user) {
      return <Redirect to="/login" />;
    }
    
    // Allow authenticated users through
    console.warn("⚠️ Authentication bypass is ENABLED. Database connectivity issue - authentication temporarily disabled.");
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground">If this takes too long, there may be a database connectivity issue.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
