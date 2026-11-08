import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#FAF8FC] text-[#8B8294]">
        جاري التحقق من تسجيل الدخول...
      </main>
    );
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />;
}
