import { Navigate, Outlet } from "react-router-dom";
import { isSessionValid } from "../config/session";

export default function ProtectedRoute() {
  const isAuthenticated = isSessionValid();
  console.log("[protected-route] isAuthenticated:", isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
