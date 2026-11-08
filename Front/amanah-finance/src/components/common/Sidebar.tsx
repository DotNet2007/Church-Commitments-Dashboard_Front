import { NavLink } from "react-router-dom";
import {
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type SidebarProps = {
  mobileNav: boolean;
  onClose: () => void;
};

export default function Sidebar({ mobileNav, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const nav = [
    { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { to: "/members", label: "إدارة الأعضاء", icon: Users },
    { to: "/payments", label: "المدفوعات", icon: WalletCards },
    // { to: "/reports", label: "التقارير المالية", icon: FileText },
    { to: "/audit-logs", label: "سجل العمليات", icon: History },
    { to: "/add-member", label: "إضافة عضو جديد", icon: UserPlus },
  ];

  return (
    <>
      {mobileNav && (
        <button
          className="mobile-overlay"
          onClick={onClose}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={23} />
          </div>

          <div>
            <strong>أمانة</strong>
            <span>AMANAH FINANCE</span>
          </div>

          <button className="icon-button sidebar-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">القائمة الرئيسية</div>

        <nav className="nav-list">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-label tools-label">أدوات النظام</div>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Settings size={17} />
            <span>الإعدادات</span>
          </NavLink>
          <button
            className="nav-item logout"
            onClick={() => { logout(); onClose(); navigate("/login", { replace: true }); }}
          >
            <LogOut size={17} />
            <span>تسجيل الخروج</span>
          </button>
          <div className="sidebar-footer">© 2026 Amanah Finance</div>
        </div>
      </aside>
    </>
  );
}
