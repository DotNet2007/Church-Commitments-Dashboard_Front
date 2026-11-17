import {
  ArrowLeftRight,
  CalendarDays,
  Info,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { CommitmentPreviewResponse } from "../../services/api/commitmentsApi";

type Loose = Record<string, unknown>;

const money = (value: unknown) =>
  `${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ج.م`;

const isoDate = /^\d{4}-\d{2}-\d{2}/;

const dateLabel = (value: unknown) => {
  if (typeof value !== "string" || !isoDate.test(value)) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
};

const statusMap: Record<string, { label: string; className: string }> = {
  PAID: { label: "مدفوع", className: "status-paid" },
  PARTIALLY_PAID: { label: "مدفوع جزئيًا", className: "status-partial" },
  UNPAID: { label: "غير مدفوع", className: "status-pending" },
};

const fieldLabels: Record<string, string> = {
  receiptnumber: "رقم الإيصال",
  paymentid: "رقم الدفعة",
  paymentdate: "تاريخ الدفع",
  periodmonth: "الفترة",
  periodstart: "بداية الفترة",
  periodend: "نهاية الفترة",
  allocatedamount: "المبلغ الموزع",
  oldallocatedamount: "الموزع سابقًا",
  newallocatedamount: "الموزع حاليًا",
  amount: "المبلغ",
  id: "المعرف",
};

const formatField = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && isoDate.test(value)) return dateLabel(value);
  if (key.toLowerCase().includes("amount") && !Number.isNaN(Number(value))) {
    return money(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function SummaryCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "up" | "down" | "neutral";
  icon: React.ReactNode;
}) {
  return (
    <div className="review-card">
      <div className="review-card-top">
        <span className="stat-icon">{icon}</span>
        <div className="review-card-label">{label}</div>
      </div>
      <div className={`review-card-value review-${tone}`}>{value}</div>
    </div>
  );
}

function ItemsList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Loose[];
  emptyText: string;
}) {
  return (
    <div className="review-block">
      <div className="review-block-title">
        <Receipt size={16} />
        <h3>{title}</h3>
        <div className="review-count">{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div className="review-empty">{emptyText}</div>
      ) : (
        <div className="review-items">
          {items.map((item, index) => (
            <div className="review-item" key={index}>
              {Object.entries(item).map(([key, value]) => (
                <div className="review-item-row" key={key}>
                  <div>{fieldLabels[key.toLowerCase()] ?? key}</div>
                  <div className="review-item-value">
                    {formatField(key, value)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommitmentPreviewReview({
  preview,
}: {
  preview: CommitmentPreviewResponse;
}) {
  const p = preview as unknown as Loose;
  const summary = (p.summary ?? {}) as Loose;
  const periods = (p.affectedPeriods ?? []) as Loose[];
  const credit = (p.resultingExcessOrCreditAdjustments ?? {}) as Loose;
  const payments = (p.existingPaymentsAffected ?? []) as Loose[];
  const oldAllocations = (p.existingAllocations ?? []) as Loose[];
  const newAllocations = (p.recalculatedAllocations ?? []) as Loose[];

  const change = Number(summary.changeInExpectedAmount ?? 0);
  const changeTone = change > 0 ? "up" : change < 0 ? "down" : "neutral";
  const changeText =
    change === 0
      ? money(0)
      : `${change > 0 ? "+" : "−"}${money(Math.abs(change))}`;

  const hasPaymentImpact =
    payments.length > 0 ||
    oldAllocations.length > 0 ||
    newAllocations.length > 0 ||
    Number(summary.reallocatedAmount ?? 0) !== 0;

  return (
    <div className="commitment-review">
      {/* ملخص التغيير */}
      <div className="review-block">
        <div className="review-block-title">
          <ArrowLeftRight size={16} />
          <h3>ملخص التغيير</h3>
        </div>

        <div className="review-cards">
          <SummaryCard
            label="المستحق قبل التغيير"
            value={money(summary.oldExpectedAmount)}
            icon={<Wallet size={15} />}
          />
          <SummaryCard
            label="المستحق بعد التغيير"
            value={money(summary.newExpectedAmount)}
            icon={<Wallet size={15} />}
          />
          <SummaryCard
            label="الفرق في المستحق"
            value={changeText}
            tone={changeTone}
            icon={
              change < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />
            }
          />     
        </div>
      </div>

      {/* الفترات المتأثرة */}
      <div className="review-block">
        <div className="review-block-title">
          <CalendarDays size={16} />
          <h3>الفترات المتأثرة</h3>
          <div className="review-count">{periods.length}</div>
        </div>

        {periods.length === 0 ? (
          <div className="review-empty">لا توجد فترات متأثرة.</div>
        ) : (
          <div className="review-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الفترة</th>
                  <th>المطلوب</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period, index) => {
                  const status =
                    statusMap[String(period.status)] ?? statusMap.UNPAID;
                  return (
                    <tr key={index}>
                      <td>
                        {dateLabel(period.periodStart)}
                        {" ← "}
                        {dateLabel(period.periodEnd)}
                      </td>
                      <td className="amount-cell">
                        {money(period.expectedAmount)}
                      </td>
                      <td className="amount-cell">{money(period.paidAmount)}</td>
                      <td className="amount-cell">
                        {money(period.outstandingAmount)}
                      </td>
                      <td>
                        <span className={`status ${status.className}`}>
                          <i />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* المدفوعات والتوزيعات */}
    
        <div className="review-notice">
          <Info size={18} />
          <div>
            هذا التغيير لا يؤثر على أي مدفوعات أو توزيعات مسجلة سابقًا.
          </div>
        </div>
    
      {/* الرصيد المقدم */}
      <div className="review-block">
        <div className="review-block-title">
          <Wallet size={16} />
          <h3>الرصيد المقدم والزيادة</h3>
        </div>

        <div className="review-credit">
          <div className="review-credit-row">
            <div>الرصيد المقدم سابقًا</div>
            <div className="review-credit-value">
              {money(credit.oldAdvanceAllocated)}
            </div>
          </div>
          <div className="review-credit-row">
            <div>الرصيد المقدم بعد التغيير</div>
            <div className="review-credit-value">
              {money(credit.newAdvanceAllocated)}
            </div>
          </div>
          <div className="review-credit-row">
            <div>التغير في الرصيد المقدم</div>
            <div className="review-credit-value">
              {money(credit.changeInAdvanceAllocated)}
            </div>
          </div>
          <div className="review-credit-row">
            <div>رصيد غير موزع</div>
            <div className="review-credit-value">
              {money(credit.unallocatedCredit)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}