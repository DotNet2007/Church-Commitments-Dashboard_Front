
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Menu,
  Moon,
  Sun,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import NewPaymentModal from "../components/payments/NewPaymentModal";
import Sidebar from "../components/common/Sidebar";
import { useAuth } from "../context/AuthContext";
import {
  getMembers,
  type MemberRecord,
} from "../services/api/membersApi";

type Theme = "light" | "dark";

export default function DashboardLayout() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMemberId, setPaymentMemberId] = useState<number | undefined>();
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
const openPayment = (memberId?: number) => {
  setPaymentMemberId(memberId);
  setPaymentModal(true);
};
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    return localStorage.getItem("amanah-theme") === "dark"
      ? "dark"
      : "light";
  });

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const title =
    (
      {
        "/dashboard": "لوحة التحكم",
        "/members": "إدارة الأعضاء",
        "/payments": "المدفوعات",
        "/reports": "التقارير المالية",
        "/audit-logs" :"سجل العمليات",
        "/settings": "الإعدادات",
      } as Record<string, string>
    )[location.pathname] ?? "أمانة";

  // Save theme preference
  useEffect(() => {
    localStorage.setItem("amanah-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Close profile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Close menu when navigating to another page
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Load real members from backend
  const loadMembers = useCallback(async (showLoader = true) => {
    if (showLoader) setMembersLoading(true);

    try {
      const result = await getMembers();
      setMembers(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحميل بيانات الأعضاء",
      );
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return members.filter(
      (member) =>
        !query ||
        [member.FullName, member.Phone ?? "", String(member.Id)].some(
          (value) => value.toLocaleLowerCase().includes(query),
        ),
    );
  }, [members, search]);

  const handlePaymentSuccess = async () => {
    await loadMembers(false);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
  };

  const handleOpenSettings = () => {
    setProfileMenuOpen(false);
    navigate("/settings");
  };

  return (
    <div className="app-shell" dir="rtl" data-theme={theme}>
      <Sidebar
        mobileNav={mobileNav}
        onClose={() => setMobileNav(false)}
      />

      <main className="main-area">
        <header className="topbar" dir="ltr">
          <div className="topbar-start">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileNav(true)}
              type="button"
              aria-label="فتح القائمة"
            >
              <Menu size={20} />
            </button>

            {/* User Profile Dropdown */}
            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button
                className={`profile profile-trigger ${
                  profileMenuOpen ? "profile-trigger-open" : ""
                }`}
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="قائمة حساب المستخدم"
              >
                <ChevronDown
                  size={15}
                  className={`muted-icon profile-chevron ${
                    profileMenuOpen ? "profile-chevron-open" : ""
                  }`}
                />

                <div className="avatar">م</div>

                <div className="profile-copy">
                  <strong>{user?.username ?? "المستخدم"}</strong>
                  <span>مسؤول النظام</span>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown" dir="rtl" role="menu">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">
                      <UserRound size={21} />
                    </div>

                    <div className="profile-dropdown-user">
                      <strong>{user?.username ?? "المستخدم"}</strong>
                      <span>مسؤول النظام</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <button
                    className="profile-dropdown-item"
                    type="button"
                    role="menuitem"
                    onClick={handleOpenSettings}
                  >
                    <Settings size={18} />
                    <span>الإعدادات</span>
                  </button>

                  <div className="profile-dropdown-divider" />

                  <button
                    className="profile-dropdown-item profile-dropdown-logout"
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>

            <span className="top-divider" />

            {/* Dark / Light Mode Toggle */}
            <button
              className="icon-button theme-toggle-button"
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "تفعيل الوضع الداكن"
                  : "تفعيل الوضع الفاتح"
              }
              title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
            >
              {theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
          </div>

          <div className="top-page-title" dir="rtl">
            {title}
          </div>
        </header>

        <div className="page-content">
          <Outlet
            context={{
              members,
              filteredMembers,
              membersLoading,
              reloadMembers: () => loadMembers(false),
              search,
              setSearch,
              openPayment,
            }}
          />

          <footer className="page-footer">
            أمانة لإدارة الالتزامات المالية <span>•</span> جميع الحقوق
            محفوظة 2024
          </footer>
        </div>
      </main>

      {paymentModal && (
      <NewPaymentModal
  members={members}
  initialMemberId={paymentMemberId}
 onClose={() => {
  setPaymentModal(false);
  setPaymentMemberId(undefined);
}}
  onSuccess={handlePaymentSuccess}
/>
      )}

      <Toaster position="top-left" richColors theme={theme} />
    </div>
  );
}
