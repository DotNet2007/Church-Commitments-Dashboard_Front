import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  AlertTriangle, ArrowLeft, Eye, EyeOff, LockKeyhole, UserRound,
} from "lucide-react";

function LogoMark() {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#9B82C4] shadow-[0_8px_18px_rgba(155,130,196,0.22)]">
        <span className="h-6 w-6 rotate-45 rounded-[7px] border-[4px] border-white/90" />
        <span className="absolute h-2.5 w-2.5 rounded-full bg-[#D6C8E8]" />
      </span>
      <span className="text-right">
        <strong className="block text-[27px] font-extrabold leading-none text-[#554A61]">أمانة</strong>
        <span className="mt-1 block text-[10px] font-semibold tracking-[0.18em] text-[#8B8294]">AMANAH FINANCE</span>
      </span>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="relative flex min-h-[250px] flex-col items-center justify-center overflow-hidden bg-[#F0EAF7] px-8 py-10 text-center lg:min-h-screen lg:w-[44%] lg:px-12">
      <div className="relative z-10 flex max-w-[410px] flex-col items-center">
        <LogoMark />
        <h1 className="mt-8 text-2xl font-extrabold text-[#554A61] lg:mt-10 lg:text-[29px]">أهلاً بك في عالم أمانة</h1>
        <p className="mt-3 max-w-[330px] text-sm leading-7 text-[#8B8294] lg:text-[15px]">نظام متكامل لإدارة الالتزامات المالية بثقة واحترافية</p>
        <svg className="mt-8 h-[105px] w-[240px] text-[#B29BD3] lg:mt-14" viewBox="0 0 240 105" fill="none" aria-hidden="true">
          <circle cx="120" cy="54" r="37" stroke="currentColor" strokeWidth="1.5" opacity=".65" />
          <circle cx="120" cy="54" r="25" stroke="currentColor" strokeWidth="1.5" opacity=".4" />
          <path d="M36 77C57 71 65 52 86 51C109 50 108 79 132 76C157 73 158 34 204 24" stroke="#9B82C4" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M181 25h23v23" stroke="#9B82C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="36" cy="77" r="4" fill="#D6C8E8" /><circle cx="204" cy="24" r="4" fill="#9B82C4" />
        </svg>
      </div>
      <p className="mt-8 text-xs font-medium text-[#8B8294] lg:absolute lg:bottom-10">© 2026 Amanah Finance</p>
    </section>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setError("");

  if (!username.trim() || !password) {
    setError("يرجى إدخال اسم المستخدم وكلمة المرور");
    return;
  }

  setLoading(true);

  try {
    await login(username.trim(), password, remember);

    navigate("/dashboard", { replace: true });
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <main dir="rtl" className="flex min-h-screen w-full flex-col bg-[#FAF8FC] text-[#554A61] lg:flex-row">
      <BrandPanel />
      <section className="flex flex-1 items-center justify-center bg-[#FAF8FC] px-5 py-12 sm:px-8 lg:bg-white lg:px-14">
        <div className="w-full max-w-[470px]">
          <header className="mb-8 text-right">
            <p className="mb-3 text-sm font-bold text-[#9B82C4]">لوحة أمانة المالية</p>
            <h2 className="text-[30px] font-extrabold tracking-tight text-[#554A61]">مرحباً بعودتك</h2>
            <p className="mt-2 text-[15px] text-[#8B8294]">سجل الدخول للوصول إلى لوحة التحكم</p>
          </header>
          <form onSubmit={handleSubmit} className="rounded-[12px] border border-[#E8E0F0] bg-white p-6 shadow-[0_10px_30px_rgba(155,130,196,0.08)] sm:p-10" noValidate>
            {error && <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-[#D6C8E8] bg-[#F0EAF7] px-4 py-3 text-right text-sm leading-6 text-[#6F5C89]" role="alert"><AlertTriangle className="mt-1 shrink-0 text-[#9B82C4]" size={18} /><span>{error}</span></div>}
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-bold text-[#554A61]">اسم المستخدم</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#B29BD3]" size={19} />
                <input id="username" name="username" value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="أدخل اسم المستخدم" autoComplete="username" className="h-12 w-full rounded-[12px] border border-[#E8E0F0] bg-white pr-12 pl-4 text-right text-sm text-[#554A61] outline-none transition placeholder:text-[#B7AFC0] focus:border-[#9B82C4] focus:ring-4 focus:ring-[#F0EAF7]" />
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="password" className="mb-2 block text-sm font-bold text-[#554A61]">كلمة المرور</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#B29BD3]" size={19} />
                <input id="password" name="password" value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" className="h-12 w-full rounded-[12px] border border-[#E8E0F0] bg-white px-12 text-right text-sm tracking-[0.2em] text-[#554A61] outline-none transition placeholder:text-[#B7AFC0] focus:border-[#9B82C4] focus:ring-4 focus:ring-[#F0EAF7]" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#8B8294] hover:bg-[#F0EAF7] hover:text-[#9B82C4]" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#8B8294]"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 rounded border-[#D6C8E8] accent-[#9B82C4]" /><span>تذكرني</span></label>
              <button type="button" onClick={() => setError("يرجى التواصل مع مسؤول النظام لاستعادة كلمة المرور.")} className="font-semibold text-[#9B82C4] hover:text-[#7E62A8] hover:underline">نسيت كلمة المرور؟</button>
            </div>
            <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#9B82C4] text-sm font-bold text-white shadow-[0_7px_16px_rgba(155,130,196,0.22)] transition hover:bg-[#856CB1] focus:outline-none focus:ring-4 focus:ring-[#D6C8E8] disabled:opacity-80"><span>{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}</span><ArrowLeft size={17} /></button>
            <p className="mt-7 text-center text-sm text-[#8B8294]">ليس لديك حساب؟ تواصل مع مسؤول النظام لإنشاء حساب.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
