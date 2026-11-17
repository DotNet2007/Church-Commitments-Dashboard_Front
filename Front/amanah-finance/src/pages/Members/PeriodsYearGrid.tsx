import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
} from "lucide-react";
import type { CommitmentPeriod } from "../../services/api/commitmentsApi";
import type { MemberPaymentAllocation } from "../../services/api/paymentsApi";

const money = (value: string | number) =>
  `${Number(value).toLocaleString("en-EG", { maximumFractionDigits: 2 })} ج.م`;

// "YYYY-MM" من أي تاريخ ISO (بدون مشاكل المنطقة الزمنية)
const monthKey = (value: string) => value.slice(0, 7);

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("ar-EG", { month: "long" }).format(
    new Date(2026, index, 1),
  ),
);

type Tone = "paid" | "partial" | "late" | "pending" | "empty";

const tones: Record<
  Tone,
  { box: string; text: string; label: string; icon: ReactNode }
> = {
  paid: {
    box: "border-[#BFE3CB] bg-[#EDF8F1]",
    text: "text-[#2F7D4A]",
    label: "تم الدفع",
    icon: <CheckCircle2 size={18} />,
  },
  partial: {
    box: "border-[#F2D9A0] bg-[#FFF8E8]",
    text: "text-[#B7791F]",
    label: "مدفوع جزئياً",
    icon: <CreditCard size={18} />,
  },
  late: {
    box: "border-[#F2C4C4] bg-[#FDEEEE]",
    text: "text-[#B84545]",
    label: "متأخر",
    icon: <AlertCircle size={18} />,
  },
  pending: {
    box: "border-[#E8E0F0] bg-[#F7F4FB]",
    text: "text-[#8B8294]",
    label: "غير مدفوع",
    icon: <Clock3 size={18} />,
  },
  empty: {
    box: "border-dashed border-[#E8E0F0] bg-white",
    text: "text-[#B7AFC0]",
    label: "لا يوجد التزام",
    icon: null,
  },
};

const toneOf = (period?: CommitmentPeriod): Tone => {
  if (!period) return "empty";
  if (period.status === "PAID") return "paid";
  if (period.status === "PARTIALLY_PAID") return "partial";
  return period.overdue ? "late" : "pending";
};

export default function PeriodsYearGrid({
  periods,
  allocations,
}: {
  periods: CommitmentPeriod[];
  allocations: MemberPaymentAllocation[];
}) {
  const currentYear = new Date().getFullYear();

  // كل السنوات التي تلمسها الفترات
  const years = useMemo(() => {
    const set = new Set<number>();
    periods.forEach((period) => {
      const from = Number(period.periodStart.slice(0, 4));
      const to = Number(period.periodEnd.slice(0, 4));
      for (let y = from; y <= to; y++) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [periods]);

  const [pickedYear, setPickedYear] = useState<number | null>(null);

  const year =
    pickedYear !== null && years.includes(pickedYear)
      ? pickedYear
      : years.includes(currentYear)
        ? currentYear
        : (years[0] ?? currentYear);

  const cells = useMemo(
    () =>
      monthNames.map((name, index) => {
        const key = `${year}-${String(index + 1).padStart(2, "0")}`;

        // الفترة التي تغطي هذا الشهر (لو أكثر من فترة، نأخذ الأحدث بداية)
        const period = periods
          .filter(
            (item) =>
              monthKey(item.periodStart) <= key &&
              key <= monthKey(item.periodEnd),
          )
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];

        // إيصالات الدفعات الموزعة على نفس الفترة
        const receipts = period
          ? [
              ...new Set(
                allocations
                  .filter((allocation) => {
                    const allocationKey = monthKey(allocation.PeriodMonth);
                    return (
                      allocationKey >= monthKey(period.periodStart) &&
                      allocationKey <= monthKey(period.periodEnd)
                    );
                  })
                  .map((allocation) => allocation.Payment?.ReceiptNumber)
                  .filter((receipt): receipt is string => Boolean(receipt)),
              ),
            ]
          : [];

        return { key, name, period, receipts, tone: toneOf(period) };
      }),
    [year, periods, allocations],
  );

  return (
    <section className="members-section">
      <div className="panel" style={{ padding: 20 }} dir="rtl">
<div
  className="mb-4 flex items-center justify-between gap-3"
  dir="rtl"
>
  <h2 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[17px] font-bold text-[#7E62A8]">
    <CalendarDays size={17} />
    فترات الالتزام والسداد
  </h2>

  <select
    value={year}
    onChange={(event) => setPickedYear(Number(event.target.value))}
    aria-label="السنة"
    style={{
      width: 84,
      minWidth: 84,
      flex: "0 0 84px",
      marginRight: "auto",
      marginLeft: 0,
    }}
    className="h-8 rounded-[8px] border border-[#E8E0F0] bg-white px-2 text-[13px] font-bold text-[#7E62A8] outline-none focus:border-[#9B82C4]"
  >
            {(years.length ? years : [currentYear]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {periods.length === 0 ? (
          <div className="empty-state">لا توجد فترات التزام لعرضها.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cells.map((cell) => {
              const tone = tones[cell.tone];

              return (
                <div
                  key={cell.key}
                  className={`flex min-h-[140px] flex-col items-center gap-2 rounded-[12px] border px-3 py-4 text-center ${tone.box}`}
                >
                  <strong className="text-sm text-[#554A61]">
                    {cell.name}
                  </strong>

                  <span className={tone.text}>{tone.icon}</span>

                  <span className={`text-xs font-bold ${tone.text}`}>
                    {tone.label}
                  </span>

                  {cell.tone === "partial" && cell.period && (
                    <span className={`text-xs font-bold ${tone.text}`}>
                      {money(cell.period.paidAmount)}
                    </span>
                  )}

                  {cell.receipts.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {cell.receipts.map((receipt) => (
                        <span
                          key={receipt}
                          className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[#554A61] shadow-sm"
                        >
                          {receipt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}