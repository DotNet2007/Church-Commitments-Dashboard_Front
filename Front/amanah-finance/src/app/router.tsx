import { lazy, Suspense } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { useAuth } from "../context/AuthContext";

// Lazy-loaded pages
const LoginPage = lazy(() => import("../pages/Login/LoginPage"));
const DashboardRoute = lazy(() => import("../pages/Dashboard/DashboardRoute"));
const MembersRoute = lazy(() => import("../pages/Members/MembersRoute"));
const MemberDetailsRoute = lazy(
  () => import("../pages/Members/MemberDetailsRoute"),
);
const PaymentsRoute = lazy(() => import("../pages/Payments/PaymentsRoute"));
// const ReportsPage = lazy(() => import("../pages/Reports/ReportsPage"));
const AuditLogsPage = lazy(() => import("../pages/AuditLogs/AuditLogsPage"));
const AddMemberPage = lazy(() => import("../pages/AddMember/AddMemberPage"));
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function LoginEntry() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <LazyPage>
      <LoginPage />
    </LazyPage>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginEntry />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: (
              <LazyPage>
                <DashboardRoute />
              </LazyPage>
            ),
          },
          {
            path: "members",
            element: (
              <LazyPage>
                <MembersRoute />
              </LazyPage>
            ),
          },
          {
            path: "members/:memberId",
            element: (
              <LazyPage>
                <MemberDetailsRoute />
              </LazyPage>
            ),
          },
          {
            path: "payments",
            element: (
              <LazyPage>
                <PaymentsRoute />
              </LazyPage>
            ),
          },
          // {
          //   path: "reports",
          //   element: (
          //     <LazyPage>
          //       <ReportsPage />
          //     </LazyPage>
          //   ),
          // },
          {
            path: "audit-logs",
            element: (
              <LazyPage>
                <AuditLogsPage />
              </LazyPage>
            ),
          },
           {
            path: "add-member",
            element: (
              <LazyPage>
                <AddMemberPage />
              </LazyPage>
            ),
          },
          {
            path: "settings",
            element: (
              <section className="page-heading">
                <div>
                  <div className="eyebrow">أدوات النظام</div>
                  <h1>الإعدادات</h1>
                  <p>إعدادات النظام والحساب.</p>
                </div>
              </section>
            ),
          },
          {
            path: "*",
            element: <Navigate to="/dashboard" replace />,
          },
        ],
      },
    ],
  },
]);
