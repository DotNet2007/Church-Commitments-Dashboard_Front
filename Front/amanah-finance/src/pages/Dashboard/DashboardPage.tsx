// import {
//   ArrowDownLeft,
//   CalendarDays,
//   ChevronDown,
//   Clock3,
//   CreditCard,
//   MoreHorizontal,
//   Plus,
//   TrendingUp,
//   Users,
//   CircleDollarSign,
//   CheckCircle2,
//   Receipt,
// } from "lucide-react";
// import { moneyToCents, centsToMoney } from "../../services/api/commitmentsApi";
// import {
//   lazy,
//   Suspense,
//   useEffect,
//   useState,
// } from "react";

// import PageTitle from "../../components/common/PageTitle";
// import type { Page } from "../../types";
// import { useAuth } from "../../context/AuthContext";

// import { getDashboard } from "../../services/api/dashboardApi";
// import { toast } from "sonner";

// import type {
//   DashboardResponse,
//   DashboardDateParams,
// } from "../../interfaces/dashboard-interface";

// const frequencyLabels: Record<string, string> = {
//   MONTHLY: "شهري",
//   QUARTERLY: "ربع سنوي",
//   HALF_YEARLY: "نصف سنوي",
//   YEARLY: "سنوي",
// };

// const DashboardChart = lazy(() => import("./DashboardChart"));

// interface DashboardPageProps {
//   onNavigate: (page: Page) => void;
//   onAddPayment: () => void;
// }

// const formatMoney = (value: number | string) =>
//   `${Number(value ?? 0).toLocaleString("en-US", {
//     maximumFractionDigits: 2,
//   })} ج.م`;

// const formatDate = (value: string) => {
//   if (!value) return "-";

//   const datePart = value.slice(0, 10);
//   const [year, month, day] = datePart.split("-").map(Number);

//   if (!year || !month || !day) return value;

//   return new Date(year, month - 1, day).toLocaleDateString("ar-EG");
// };

// const getPaymentMethod = (method: string) => {
//   const methods: Record<string, string> = {
//     CASH: "نقداً",
//     BANK_TRANSFER: "تحويل بنكي",
//     CARD: "بطاقة",
//     CHEQUE: "شيك",
//   };

//   return methods[method] ?? method;
// };

// export default function DashboardPage({
//   onNavigate,
//   onAddPayment,
// }: DashboardPageProps) {
//   const { user } = useAuth();

// const [dateFrom, setDateFrom] = useState("");
// const [dateTo, setDateTo] = useState("");

// const [dashboard, setDashboard] =
//   useState<DashboardResponse | null>(null);

// const [appliedDates, setAppliedDates] =
//   useState<DashboardDateParams>({});

// const [isLoading, setIsLoading] = useState(true);
// const [error, setError] = useState("");
// const [retryCount, setRetryCount] = useState(0);

// useEffect(() => {
//   let ignore = false;

//   const fetchDashboard = async () => {
//     try {
//       setIsLoading(true);
//       setError("");

//       const response = await getDashboard(appliedDates);

//       if (!ignore) {
//         setDashboard(response);
//       }
//     } catch (err) {
//       if (!ignore) {
//         setError(
//           err instanceof Error
//             ? err.message
//             : "حدث خطأ أثناء تحميل بيانات لوحة التحكم",
//         );
//       }
//     } finally {
//       if (!ignore) {
//         setIsLoading(false);
//       }
//     }
//   };

//   fetchDashboard();

//   return () => {
//     ignore = true;
//   };
// }, [appliedDates, retryCount]);
// // Apply date filter
// const handleApplyDates = () => {
//   if (!dateFrom && !dateTo) {
//     toast.error("يرجى اختيار تاريخ واحد على الأقل");
//     return;
//   }

//   if (dateFrom && dateTo && dateFrom > dateTo) {
//     toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
//     return;
//   }

//   // Compare selected dates with currently applied dates
//   if (
//     dateFrom === (appliedDates.dateFrom ?? "") &&
//     dateTo === (appliedDates.dateTo ?? "")
//   ) {
//     return;
//   }

//   setAppliedDates({
//     ...(dateFrom ? { dateFrom } : {}),
//     ...(dateTo ? { dateTo } : {}),
//   });
// };

// const handleResetDates = () => {
//   setDateFrom("");
//   setDateTo("");

//   if (Object.keys(appliedDates).length === 0) {
//     return;
//   }

//   setAppliedDates({});
// };

//   const stats = dashboard
//     ? [
//         {
//           label: "إجمالي الأعضاء النشطين",
//           value: dashboard.stats.activeMembers.toLocaleString("en-US"),
//           hint: "عدد الأعضاء النشطين",
//           icon: Users,
//           trend: "up",
//         },
//         {
//           label: "إجمالي المستحقات",
//           value: formatMoney(dashboard.stats.totalDue),
//           hint: "إجمالي المبالغ المستحقة",
//           icon: CircleDollarSign,
//           trend: "up",
//         },
// //         {
// //   label: "القيمة الشهرية المكافئة للالتزامات",
// //   value: formatMoney(
// //     Number(
// //       dashboard.stats.totalNormalizedMonthlyEquivalent ?? 0
// //     )
// //   ),
// //   hint: "إجمالي الالتزامات بعد توحيدها شهرياً",
// //   icon: CircleDollarSign,
// //   trend: "up",
// // },
//         {
//           label: "إجمالي التحصيل",
//           value: formatMoney(dashboard.stats.totalCollected),
//           hint: "إجمالي المبالغ المحصلة",
//           icon: TrendingUp,
//           trend: "up",
//         },
//         {
//           label: "إجمالي المتبقي",
//           value: formatMoney(dashboard.stats.remaining),
//           hint: "المبالغ التي لم يتم تحصيلها",
//           icon: ArrowDownLeft,
//           trend: "down",
//         },
//         {
//           label: "الأقساط المتأخرة",
//           value: formatMoney(dashboard.stats.overdue),
//           hint: "إجمالي المبالغ المتأخرة",
//           icon: CreditCard,
//           trend: "alert",
//         },
//         {
//           label: "نسبة التحصيل",
//           value: `${dashboard.stats.collectionRate.toLocaleString("en-US")}%`,
//           hint: "نسبة التحصيل من المستحقات",
//           icon: TrendingUp,
//           trend: "up",
//         },
//       ]
//     : [];

// const commitmentRateSummary = Object.entries(
//   (dashboard?.commitmentRates ?? []).reduce(
//     (acc, item) => {
//       const group = (acc[item.frequency] ??= {
//         memberIds: new Set<number>(),
//         monthlyCents: 0,
//       });

//       group.memberIds.add(item.memberId);
//       group.monthlyCents += moneyToCents(item.normalizedMonthlyEquivalent ?? "0");

//       return acc;
//     },
//     {} as Record<string, { memberIds: Set<number>; monthlyCents: number }>,
//   ),
// ).map(
//   ([frequency, data]) =>
//     [
//       frequency,
//       {
//         count: data.memberIds.size,
//         monthlyEquivalent: centsToMoney(data.monthlyCents),
//       },
//     ] as const,
// );

//   return (
//     <>
//       <PageTitle
//         eyebrow={`مرحباً بك، ${user?.username ?? "المستخدم"} 👋`}
//         title="لوحة التحكم"
//         description="إليك ملخص الأداء المالي لمؤسستك المالية اليوم."
//         action={
//           <div className="heading-actions">
// <button
//   className="button button-secondary"
//   onClick={handleResetDates}
//   disabled={isLoading}
//   title="عرض كل البيانات"
// >
//   <CalendarDays size={15} />
// {Object.keys(appliedDates).length > 0
//   ? "مسح التواريخ المختارة"
//   : "الفترة المحددة"}
// </button>

//             <button className="button button-primary" onClick={onAddPayment}>
//               <Plus size={16} />
//               تسجيل دفعة
//             </button>
//           </div>
//         }
//       />

//       {/* Date Filters */}
//       <div className="panel mb-5 p-4">
//         <div className="flex flex-wrap items-end gap-3">
//           <div className="flex min-w-[180px] flex-1 flex-col gap-2">
//             <label className="text-sm font-medium">من تاريخ</label>
//             <input
//               type="date"
//               value={dateFrom}
//               onChange={(e) => setDateFrom(e.target.value)}
//               className="button button-secondary w-full"
//             />
//           </div>

//           <div className="flex min-w-[180px] flex-1 flex-col gap-2">
//             <label className="text-sm font-medium">إلى تاريخ</label>
//             <input
//               type="date"
//               value={dateTo}
//               onChange={(e) => setDateTo(e.target.value)}
//               className="button button-secondary w-full"
//             />
//           </div>

// <button
//   className="button button-primary"
//   onClick={handleApplyDates}
//   disabled={isLoading}
// >
//   <CalendarDays size={15} />
//   {isLoading ? "جاري التحميل..." : "تطبيق الفترة"}
// </button>
//         </div>
//       </div>

//       {error && (
//         <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
//           <span>{error}</span>
//           <button
//             className="font-semibold underline"
//             onClick={() => setRetryCount((count) => count + 1)}
//           >
//             إعادة المحاولة
//           </button>
//         </div>
//       )}

//       {/* Statistics */}
//       <section className="stats-grid">
//         {isLoading && !dashboard
//           ? Array.from({ length: 7 }).map((_, index) => (
//               <article className="stat-card" key={index}>
//                 <div className="stat-top">
//                   <div className="stat-icon">
//                     <TrendingUp size={17} />
//                   </div>
//                 </div>
//                 <div className="h-4 w-32 animate-pulse rounded bg-purple-100" />
//                 <div className="mt-3 h-7 w-28 animate-pulse rounded bg-purple-100" />
//                 <div className="mt-3 h-3 w-36 animate-pulse rounded bg-purple-50" />
//               </article>
//             ))
//           : stats.map(({ label, value, hint, icon: Icon, trend }) => (
//               <article className="stat-card" key={label}>
//                 <div className="stat-top">
//                   <div className="stat-icon">
//                     <Icon size={17} />
//                   </div>
//                   {/* <button className="more-button" type="button">
//                     <MoreHorizontal size={17} />
//                   </button> */}
//                 </div>

//                 <div className="stat-label">{label}</div>
//                 <div className="stat-value">{value}</div>

//                 <div
//                   className={`stat-hint ${
//                     trend === "alert" ? "hint-alert" : "hint-up"
//                   }`}
//                 >
//                   {trend === "alert" ? (
//                     <Clock3 size={12} />
//                   ) : (
//                     <ArrowDownLeft size={12} />
//                   )}
//                   {hint}
//                 </div>
//               </article>
//             ))}
//       </section>

// {/* Commitment Rates */}
// <section className="panel mb-5">
//   <div className="panel-heading">
//     <div>
//       <div className="eyebrow">الالتزامات</div>
//       <h2>توزيع الالتزامات حسب الدورية</h2>
//     </div>
//   </div>

//   <div className="stats-grid">
//     {commitmentRateSummary.length > 0 ? (
//       commitmentRateSummary.map(([frequency, data]) => (
//         <article className="stat-card" key={frequency}>
//           <div className="stat-top">
//             <div className="stat-icon">
//               <CalendarDays size={17} />
//             </div>
//           </div>

//           <div className="stat-label">
//             {frequencyLabels[frequency] ?? frequency}
//           </div>

//           <div className="stat-value">
//             {data.count.toLocaleString("en-US")}
//           </div>

//           <div className="stat-hint hint-up">
//             عضو
//           </div>

//           <div className="mt-3 text-sm text-gray-500">
//             المكافئ الشهري:
//             <strong className="block mt-1">
//               {formatMoney(data.monthlyEquivalent)}
//             </strong>
//           </div>
//         </article>
//       ))
//     ) : (
//       <div className="col-span-full py-8 text-center text-gray-500">
//         لا توجد بيانات للالتزامات
//       </div>
//     )}
//   </div>
// </section>

//       {/* Chart */}
//       <article className="panel dashboard-chart">
//         <div className="panel-heading">
//           <div>
//             <div className="eyebrow">نظرة عامة</div>
//             <h2>المستحقات والتحصيل الشهري</h2>
//           </div>

//           <div className="chart-legend">
//             <span>
//               <i className="legend-dot due" /> المستحق
//             </span>
//             <span>
//               <i className="legend-dot collected" /> المحصل
//             </span>
//           </div>
//         </div>

//         {isLoading && !dashboard ? (
//           <div className="chart-wrap flex items-center justify-center">
//             <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
//           </div>
//         ) : (
//           <Suspense
//             fallback={
//               <div className="chart-wrap flex items-center justify-center">
//                 <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
//               </div>
//             }
//           >
//             <DashboardChart data={dashboard?.chart ?? []} />
//           </Suspense>
//         )}
//       </article>

//       {/* Latest Payments */}
//       <section className="panel dashboard-table">
//         <div className="panel-heading panel-heading-row">
//           <div>
//             <div className="eyebrow">آخر النشاطات</div>
//             <h2>أحدث المدفوعات</h2>
//           </div>

//           {/* <button
//             className="text-link"
//             onClick={() => onNavigate("payments")}
//           >
//             عرض التقرير <ArrowDownLeft size={13} />
//           </button> */}
//         </div>

//         <div className="table-scroll">
//           <table>
//             <thead>
//               <tr>
//                 <th>اسم العضو</th>
//                 <th>المبلغ</th>
//                 <th>تاريخ الدفع</th>
//                 <th>طريقة الدفع</th>
//                 <th>رقم الإيصال</th>
//               </tr>
//             </thead>

//             <tbody>
//               {dashboard?.latestPayments?.length ? (
//                 dashboard.latestPayments.map((payment) => (
//                   <tr key={payment.id}>
//                     <td>
//                       <strong>{payment.member?.FullName ?? "-"}</strong>
//                     </td>

//                     <td className="amount-cell">
//                       {formatMoney(payment.amount)}
//                     </td>

//                     <td>{formatDate(payment.paymentDate)}</td>

//                     <td>{getPaymentMethod(payment.paymentMethod)}</td>

//                     <td>
//                       <span className="status status-paid">
//                         <Receipt size={11} />
//                         {payment.receiptNumber}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={5} className="py-8 text-center">
//                     {isLoading
//                       ? "جاري تحميل المدفوعات..."
//                       : "لا توجد مدفوعات في هذه الفترة"}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </section>
//     </>
//   );
// }

import {
  ArrowDownLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  CreditCard,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
  CircleDollarSign,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { moneyToCents, centsToMoney } from "../../services/api/commitmentsApi";
import { lazy, Suspense, useEffect, useState } from "react";

import PageTitle from "../../components/common/PageTitle";
import type { Page } from "../../types";
import { useAuth } from "../../context/AuthContext";

import { getDashboard } from "../../services/api/dashboardApi";
import { toast } from "sonner";

import type {
  DashboardResponse,
  DashboardDateParams,
} from "../../interfaces/dashboard-interface";

const frequencyLabels: Record<string, string> = {
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
  HALF_YEARLY: "نصف سنوي",
  YEARLY: "سنوي",
};

const DashboardChart = lazy(() => import("./DashboardChart"));

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
  onAddPayment: () => void;
}

const formatMoney = (value: number | string) =>
  `${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ج.م`;

const formatDate = (value: string) => {
  if (!value) return "-";

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("ar-EG");
};

const getPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    CASH: "نقداً",
    BANK_TRANSFER: "تحويل بنكي",
    CARD: "بطاقة",
    CHEQUE: "شيك",
  };

  return methods[method] ?? method;
};

export default function DashboardPage({
  onNavigate,
  onAddPayment,
}: DashboardPageProps) {
  const { user } = useAuth();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  const [appliedDates, setAppliedDates] = useState<DashboardDateParams>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await getDashboard(appliedDates);

        if (!ignore) {
          setDashboard(response);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "حدث خطأ أثناء تحميل بيانات لوحة التحكم",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      ignore = true;
    };
  }, [appliedDates, retryCount]);
  // Apply date filter
  const handleApplyDates = () => {
    if (!dateFrom && !dateTo) {
      toast.error("يرجى اختيار تاريخ واحد على الأقل");
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    // Compare selected dates with currently applied dates
    if (
      dateFrom === (appliedDates.dateFrom ?? "") &&
      dateTo === (appliedDates.dateTo ?? "")
    ) {
      return;
    }

    setAppliedDates({
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
  };

  const handleResetDates = () => {
    setDateFrom("");
    setDateTo("");

    if (Object.keys(appliedDates).length === 0) {
      return;
    }

    setAppliedDates({});
  };

  const stats = dashboard
    ? [
        {
          label: "إجمالي الأعضاء النشطين",
          value: dashboard.stats.activeMembers.toLocaleString("en-US"),
          hint: "عدد الأعضاء النشطين",
          icon: Users,
          trend: "up",
        },
        {
          label: "إجمالي المستحقات",
          value: formatMoney(dashboard.stats.totalDue),
          hint: "إجمالي المبالغ المستحقة",
          icon: CircleDollarSign,
          trend: "up",
        },
        //         {
        //   label: "القيمة الشهرية المكافئة للالتزامات",
        //   value: formatMoney(
        //     Number(
        //       dashboard.stats.totalNormalizedMonthlyEquivalent ?? 0
        //     )
        //   ),
        //   hint: "إجمالي الالتزامات بعد توحيدها شهرياً",
        //   icon: CircleDollarSign,
        //   trend: "up",
        // },
        {
          label: "إجمالي التحصيل",
          value: formatMoney(dashboard.stats.totalCollected),
          hint: "إجمالي المبالغ المحصلة",
          icon: TrendingUp,
          trend: "up",
        },
        {
          label: "إجمالي المتبقي",
          value: formatMoney(dashboard.stats.remaining),
          hint: "المبالغ التي لم يتم تحصيلها",
          icon: ArrowDownLeft,
          trend: "down",
        },
        {
          label: "الأقساط المتأخرة",
          value: formatMoney(dashboard.stats.overdue),
          hint: "إجمالي المبالغ المتأخرة",
          icon: CreditCard,
          trend: "alert",
        },
        {
          label: "نسبة التحصيل",
          value: `${dashboard.stats.collectionRate.toLocaleString("en-US")}%`,
          hint: "نسبة التحصيل من المستحقات",
          icon: TrendingUp,
          trend: "up",
        },
      ]
    : [];

  const commitmentRateSummary = Object.entries(
    (dashboard?.commitmentRates ?? []).reduce(
      (acc, item) => {
        const group = (acc[item.frequency] ??= {
          memberIds: new Set<number>(),
          monthlyCents: 0,
        });

        group.memberIds.add(item.memberId);
        group.monthlyCents += moneyToCents(
          item.normalizedMonthlyEquivalent ?? "0",
        );

        return acc;
      },
      {} as Record<string, { memberIds: Set<number>; monthlyCents: number }>,
    ),
  ).map(
    ([frequency, data]) =>
      [
        frequency,
        {
          count: data.memberIds.size,
          monthlyEquivalent: centsToMoney(data.monthlyCents),
        },
      ] as const,
  );

  return (
    <>
      <PageTitle
        eyebrow={`مرحباً بك، ${user?.username ?? "المستخدم"} 👋`}
        title="لوحة التحكم"
        description="إليك ملخص الأداء المالي لمؤسستك المالية اليوم."
        action={
          <div className="heading-actions">
            <button
              className="button button-secondary"
              onClick={handleResetDates}
              disabled={isLoading}
              title="عرض كل البيانات"
            >
              <CalendarDays size={15} />
              {Object.keys(appliedDates).length > 0
                ? "مسح التواريخ المختارة"
                : "الفترة المحددة"}
            </button>

            <button className="button button-primary" onClick={onAddPayment}>
              <Plus size={16} />
              تسجيل دفعة
            </button>
          </div>
        }
      />

      {/* Date Filters */}
      <div className="panel mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <label className="text-sm font-medium">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="button button-secondary w-full"
            />
          </div>

          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <label className="text-sm font-medium">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="button button-secondary w-full"
            />
          </div>

          <button
            className="button button-primary"
            onClick={handleApplyDates}
            disabled={isLoading}
          >
            <CalendarDays size={15} />
            {isLoading ? "جاري التحميل..." : "تطبيق الفترة"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            className="font-semibold underline"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Statistics */}
      <section className="stats-grid">
        {isLoading && !dashboard
          ? Array.from({ length: 7 }).map((_, index) => (
              <article className="stat-card" key={index}>
                <div className="stat-top">
                  <div className="stat-icon">
                    <TrendingUp size={17} />
                  </div>
                </div>
                <div className="h-4 w-32 animate-pulse rounded bg-purple-100" />
                <div className="mt-3 h-7 w-28 animate-pulse rounded bg-purple-100" />
                <div className="mt-3 h-3 w-36 animate-pulse rounded bg-purple-50" />
              </article>
            ))
          : stats.map(({ label, value, hint, icon: Icon, trend }) => (
              <article className="stat-card" key={label}>
                <div className="stat-top">
                  <div className="stat-icon">
                    <Icon size={17} />
                  </div>
                  {/* <button className="more-button" type="button">
                    <MoreHorizontal size={17} />
                  </button> */}
                </div>

                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>

                <div
                  className={`stat-hint ${
                    trend === "alert" ? "hint-alert" : "hint-up"
                  }`}
                >
                  {trend === "alert" ? (
                    <Clock3 size={12} />
                  ) : (
                    <ArrowDownLeft size={12} />
                  )}
                  {hint}
                </div>
              </article>
            ))}
      </section>

      {/* Commitment Rates */}
      <section className="panel commitment-rates-panel mb-5">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">الالتزامات</div>
            <h2>توزيع الالتزامات </h2>
          </div>
        </div>

        <div className="commitment-rates-grid">
          {commitmentRateSummary.length > 0 ? (
            commitmentRateSummary.map(([frequency, data]) => (
              <article className="commitment-rate-card" key={frequency}>
                <div className="commitment-rate-top">
                  <span className="stat-icon">
                    <CalendarDays size={17} />
                  </span>
                  <span className="commitment-rate-label">
                    {frequencyLabels[frequency] ?? frequency}
                  </span>
                </div>

                <div className="commitment-rate-count">
                  <strong>{data.count.toLocaleString("en-US")}</strong>
                  <span>عضو</span>
                </div>

                <div className="commitment-rate-footer">
                  <span>المكافئ الشهري</span>
                  <strong>{formatMoney(data.monthlyEquivalent)}</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="commitment-rates-empty">
              لا توجد بيانات للالتزامات
            </div>
          )}
        </div>
      </section>

      {/* Chart */}
      <article className="panel dashboard-chart">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">نظرة عامة</div>
            <h2>المستحقات والتحصيل الشهري</h2>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-dot due" /> المستحق
            </span>
            <span>
              <i className="legend-dot collected" /> المحصل
            </span>
          </div>
        </div>

        {isLoading && !dashboard ? (
          <div className="chart-wrap flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="chart-wrap flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
              </div>
            }
          >
            <DashboardChart data={dashboard?.chart ?? []} />
          </Suspense>
        )}
      </article>

      {/* Latest Payments */}
      <section className="panel dashboard-table">
        <div className="panel-heading panel-heading-row">
          <div>
            <div className="eyebrow">آخر النشاطات</div>
            <h2>أحدث المدفوعات</h2>
          </div>

          {/* <button
            className="text-link"
            onClick={() => onNavigate("payments")}
          >
            عرض التقرير <ArrowDownLeft size={13} />
          </button> */}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>اسم العضو</th>
                <th>المبلغ</th>
                <th>تاريخ الدفع</th>
                <th>طريقة الدفع</th>
                <th>رقم الإيصال</th>
              </tr>
            </thead>

            <tbody>
              {dashboard?.latestPayments?.length ? (
                dashboard.latestPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.member?.FullName ?? "-"}</strong>
                    </td>

                    <td className="amount-cell">
                      {formatMoney(payment.amount)}
                    </td>

                    <td>{formatDate(payment.paymentDate)}</td>

                    <td>{getPaymentMethod(payment.paymentMethod)}</td>

                    <td>
                      <span className="status status-paid">
                        <Receipt size={11} />
                        {payment.receiptNumber}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    {isLoading
                      ? "جاري تحميل المدفوعات..."
                      : "لا توجد مدفوعات في هذه الفترة"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
