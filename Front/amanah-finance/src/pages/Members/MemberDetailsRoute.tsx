import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  UserRound,
  Pencil,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import {
  getMember,
  reopenMember,
  type MemberRecord,
  type CommitmentRecord,
} from "../../services/api/membersApi";
import {
  getCommitmentHistory,
  changeCommitment,
} from "../../services/api/commitmentsApi";
import {
  getMemberPayments,
  type PaymentRecord,
} from "../../services/api/paymentsApi";
import CommitmentFormModal from "./CommitmentFormModal";
type DashboardContext = {
  openPayment: (memberId?: number) => void;
};
const money = (value: string | number) =>
  `${Number(value).toLocaleString("en-EG", { maximumFractionDigits: 2 })} ج.م`;
const monthKey = (value: string) => value.slice(0, 7);
const monthDate = (key: string) => new Date(`${key}-01T00:00:00`);
const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(
    monthDate(key),
  );
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

type MonthRow = {
  key: string;
  due: number;
  paid: number;
  status: string;
  isFuture: boolean;
  hasCommitment: boolean;
  receiptNumbers: string[];
};

// Load all payment pages for a member
async function getAllMemberPayments(
  memberId: number,
): Promise<PaymentRecord[]> {
  const limit = 100;

  // Load the first page
  const firstPage = await getMemberPayments(memberId, {
    page: 1,
    limit,
  });

  const totalPages = firstPage.meta?.totalPages ?? 1;

  // Load remaining pages
  const remainingPages = Array.from(
    { length: Math.max(0, totalPages - 1) },
    (_, index) => index + 2,
  );

  const remainingResponses = await Promise.all(
    remainingPages.map((page) => getMemberPayments(memberId, { page, limit })),
  );

  return [
    ...(firstPage.data ?? []),
    ...remainingResponses.flatMap((response) => response.data ?? []),
  ];
}
export default function MemberDetailsRoute() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { openPayment } = useOutletContext<DashboardContext>();
  const id = Number(memberId);
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [commitments, setCommitments] = useState<CommitmentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commitmentModalOpen, setCommitmentModalOpen] = useState(false);
  const [savingCommitment, setSavingCommitment] = useState(false);


  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError("معرف العضو غير صحيح");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      getMember(id),
      getCommitmentHistory(id),
      getAllMemberPayments(id),
    ])
      .then(([memberData, commitmentData, paymentData]) => {
        if (!active) return;

        setMember(memberData);
        setCommitments(commitmentData);
        setPayments(paymentData);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "تعذر تحميل تفاصيل العضو";
        if (active) {
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const now = new Date();

const currentKey = `${now.getFullYear()}-${String(
  now.getMonth() + 1,
).padStart(2, "0")}`;
  const monthRows = useMemo<MonthRow[]>(() => {
    if (!member || commitments.length === 0) return [];

    const now = new Date();

    const currentKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    const startKey = commitments.reduce(
      (min, item) =>
        monthKey(item.EffectiveFrom) < min
          ? monthKey(item.EffectiveFrom)
          : min,
      monthKey(commitments[0].EffectiveFrom),
    );

    // Total allocated amount for each month
    const allocations = new Map<string, number>();

    // Receipt numbers for each month
    const receipts = new Map<string, Set<string>>();

    payments.forEach((payment) => {
      (payment.Allocations ?? []).forEach((allocation) => {
        const key = monthKey(allocation.PeriodMonth);

        allocations.set(
          key,
          (allocations.get(key) ?? 0) +
          Number(allocation.AllocatedAmount),
        );

        if (payment.ReceiptNumber) {
          if (!receipts.has(key)) {
            receipts.set(key, new Set());
          }

          receipts.get(key)!.add(payment.ReceiptNumber);
        }
      });
    });

    const rows: MonthRow[] = [];

    let cursor = monthDate(startKey);

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 12,
      1,
    );

    while (cursor <= end && rows.length < 240) {
      const key = `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1,
      ).padStart(2, "0")}`;

      const date = `${key}-01`;

      const activeCommitment = commitments
        .filter(
          (item) =>
            item.EffectiveFrom.slice(0, 10) <= date &&
            (!item.EffectiveTo ||
              item.EffectiveTo.slice(0, 10) >= date),
        )
        .sort((a, b) =>
          b.EffectiveFrom.localeCompare(a.EffectiveFrom),
        )[0];

    const hasCommitment = Boolean(activeCommitment);

const due = activeCommitment
  ? Number(activeCommitment.MonthlyAmount)
  : 0;

const paid = allocations.get(key) ?? 0;

const isFuture = key > currentKey;

const status = !hasCommitment
  ? "بدون التزام"
  : paid >= due
    ? "مدفوع"
    : paid > 0
      ? "مدفوع جزئيًا"
      : isFuture
        ? "مستحق مستقبلًا"
        : key < currentKey
          ? "متأخر"
          : "غير مدفوع";

rows.push({
  key,
  due,
  paid,
  status,
  isFuture,
  hasCommitment,
  receiptNumbers: Array.from(receipts.get(key) ?? []),
});

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return rows;
  }, [member, commitments, payments]);


 const monthsByYear = useMemo(() => {
  const groups = new Map<string, MonthRow[]>();

  monthRows.forEach((row) => {
    const year = row.key.slice(0, 4);

    if (!groups.has(year)) {
      groups.set(year, []);
    }

    groups.get(year)!.push(row);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => {
      const monthMap = new Map(
        months.map((month) => [month.key, month]),
      );

      const fullYearMonths = Array.from(
        { length: 12 },
        (_, index) => {
          const key = `${year}-${String(index + 1).padStart(2, "0")}`;

          return (
            monthMap.get(key) ?? {
              key,
              due: 0,
              paid: 0,
              status: "بدون التزام",
              isFuture: key > currentKey,
              hasCommitment: false,
              receiptNumbers: [],
            }
          );
        },
      );

      return {
        year,
        months: fullYearMonths,
      };
    });
}, [monthRows]);

  const availableYears = useMemo(
    () => monthsByYear.map(({ year }) => year),
    [monthsByYear],
  );

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );

  useEffect(() => {
    if (availableYears.length === 0) return;

    if (!availableYears.includes(selectedYear)) {
      const currentYear = String(new Date().getFullYear());

      setSelectedYear(
        availableYears.includes(currentYear)
          ? currentYear
          : availableYears[0],
      );
    }
  }, [availableYears, selectedYear]);

  const selectedYearMonths = useMemo(
    () =>
      monthsByYear.find(
        (group) => group.year === selectedYear,
      )?.months ?? [],
    [monthsByYear, selectedYear],
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.Amount),
    0,
  );
  const outstanding = monthRows
    .filter((row) => !row.isFuture)
    .reduce((sum, row) => sum + Math.max(0, row.due - row.paid), 0);

  const currentCommitment = commitments
    .filter((item) => item.EffectiveTo === null)
    .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0];

  const saveCommitment = async (values: {
    MonthlyAmount: number;
    EffectiveFrom: string;
  }) => {
    if (!currentCommitment) {
      toast.error("لا يوجد التزام حالي لتعديله");
      return;
    }

    setSavingCommitment(true);

    try {
      await changeCommitment(currentCommitment.Id, values);

      const updatedHistory = await getCommitmentHistory(id);
      setCommitments(updatedHistory);

      setCommitmentModalOpen(false);
      toast.success("تم تحديث الالتزام الشهري بنجاح");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "تعذر تحديث الالتزام الشهري";

      toast.error(message);
    } finally {
      setSavingCommitment(false);
    }
  };
  const handleReopenMember = async () => {
    try {
      await reopenMember(id);

      const updatedMember = await getMember(id);
      setMember(updatedMember);

      toast.success("تم إعادة فتح العضو بنجاح");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "تعذر إعادة فتح العضو";

      toast.error(message);
    }
  };
  if (loading)
    return <div className="empty-state">جاري تحميل تفاصيل العضو...</div>;
  if (error || !member)
    return (
      <div className="empty-state">
        {error || "العضو غير موجود"}{" "}
        <button className="text-link" onClick={() => navigate("/members")}>
          العودة للأعضاء
        </button>
      </div>
    );

  return (
    <>
      <PageTitle
        eyebrow="دليل الأعضاء"
        title={member.FullName}
        description={`${member.IsClosed ? "عضو مغلق" : "عضو نشط"}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">

            {member.IsClosed && (
              <button
                type="button"
                className="button button-primary"
                onClick={handleReopenMember}
              >
                <UserRound size={15} />
                إعادة فتح العضو
              </button>
            )}

            <button
              type="button"
              className="button button-primary"
              onClick={() => openPayment(member.Id)}
            >
              <Plus size={16} />
              تسجيل دفعة جديدة
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => navigate("/members")}
            >
              <ArrowRight size={15} />
              العودة للأعضاء
            </button>

          </div>
        }
      />
      <section className="member-detail-stats2">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <UserRound size={15} />
            </span>
          </div>
          <div className="stat-label">رقم الهاتف</div>
          <div className="stat-value">{member.Phone || "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <CalendarDays size={15} />
            </span>
          </div>
          <div className="stat-label">تاريخ الانضمام</div>
          <div className="stat-value">{dateLabel(member.JoiningDate)}</div>
        </div>
         <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <CreditCard size={15} />
            </span>
          </div>
          <div className="stat-label">قيمة الالتزام الشهري</div>
          <div className="stat-value">
            {currentCommitment ? money(currentCommitment.MonthlyAmount) : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <CreditCard size={15} />
            </span>
          </div>
          <div className="stat-label">إجمالي المدفوعات المسجلة</div>
          <div className="stat-value">{money(totalPaid)}</div>
        </div>       
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <CalendarDays size={15} />
            </span>
          </div>
          <div className="stat-label">المتبقي على الفترات المستحقة</div>
          <div className="stat-value">{money(outstanding)}</div>
        </div>
      </section>
      {member.Notes && (
        <section className="panel member-detail-notes">
          <strong style={{ fontSize: 15, fontWeight: 'bold' }} >ملاحظات</strong>
          <p style={{ fontSize: 15 }}>{member.Notes}</p>
        </section>
      )}

      <section className="members-section annual-payments-section">

        <div className="annual-year-group">

          <div className="annual-year-heading">
            <div className="annual-year-title">
              <CalendarDays size={19} />
              <h3>سجل المدفوعات السنوي </h3>

            </div>

            <select
              className="annual-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {selectedYearMonths.length > 0 ? (
            <div className="annual-months-grid">

              {selectedYearMonths.map((row) => {
              const isPaid =
  row.hasCommitment && row.paid >= row.due;

const isPartial =
  row.hasCommitment && row.paid > 0 && !isPaid;

                const monthName = new Intl.DateTimeFormat(
                  "ar-EG",
                  { month: "long" },
                ).format(monthDate(row.key));

                return (
                  <div
                    key={row.key}
                    className={`annual-month-card ${isPaid
                        ? "month-paid"
                        : isPartial
                          ? "month-partial"
                          : "month-empty"
                      }`}
                  >
                    <div className="annual-month-name">
                      {monthName}
                    </div>

                    {isPaid ? (
                      <>
                        <CheckCircle2
                          size={25}
                          className="month-status-icon"
                        />
                        <span className="month-status-text">
                          تم الدفع
                        </span>
                        <div className="month-receipts">
                          {row.receiptNumbers.map((receipt) => (
                            <span key={receipt}>{receipt}</span>
                          ))}
                        </div>
                      </>
                    ) : isPartial ? (
                      <>
                        <CreditCard
                          size={23}
                          className="month-status-icon"
                        />
                        <span className="month-status-text">
                          مدفوع جزئياً
                        </span>
                        <span className="month-paid-amount">
                          {money(row.paid)}
                        </span>
                        <div className="month-receipts">
                          {row.receiptNumbers.map((receipt) => (
                            <span key={receipt}>{receipt}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="month-empty-space" />
                    )}
                  </div>
                );
              })}

            </div>
          ) : (
            <div className="empty-state">
              لا توجد فترات التزام لهذه السنة.
            </div>
          )}

        </div>
      </section>

      {/* <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>الموقف الشهري للالتزامات</h2>
            <p style={{ fontSize: 15 }}>{monthRows.length} فترة معروضة</p>
          </div>
        </div>

        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>

              <tbody>
                {monthRows.map((row) => (
                  <tr key={row.key}>
                    <td>{monthLabel(row.key)}</td>

                    <td className="amount-cell">{money(row.paid)}</td>

                    <td className="amount-cell">
                      {money(Math.max(0, row.due - row.paid))}
                    </td>

                    <td>
                      <span
                        className={`status ${row.status === "مدفوع"
                          ? "status-paid"
                          : row.status === "مدفوع جزئيًا"
                            ? "status-partial"
                            : row.status === "متأخر"
                              ? "status-late"
                              : row.isFuture
                                ? "status-future"
                                : "status-pending"
                          }`}
                      >
                        <i />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {monthRows.length === 0 && (
                  <tr>
                    <td colSpan={4}>لا توجد فترات التزام لعرضها.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section> */}
      <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>سجل المدفوعات</h2>
            <p style={{ fontSize: 15 }}>{payments.length} عملية محملة</p>
          </div>
        </div>
        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>رقم الإيصال</th>
                  <th>تاريخ الدفع</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>الفترات المخصصة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.Id}>
                    <td className="id-cell">{payment.ReceiptNumber}</td>
                    <td style={{ fontWeight: 'bold' }}>{dateLabel(payment.PaymentDate)}</td>
                    <td className="amount-cell">{money(payment.Amount)}</td>
                    <td>
                      {payment.PaymentMethod === "CASH" ? "نقداً" : "إنستاباي"}
                    </td>
                    <td>
                      {(payment.Allocations ?? [])
                        .map(
                          (allocation) =>
                            `${monthLabel(monthKey(allocation.PeriodMonth))}`,
                        )
                        .join("-")}
                    </td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr>
                    <td colSpan={5}>لا توجد مدفوعات مسجلة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>سجل الالتزامات</h2>
            <p style={{ fontSize: 15 }}>{commitments.length} تغييرات مسجلة</p>
          </div>

          {currentCommitment && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setCommitmentModalOpen(true)}
            >
              <Pencil size={15} />
              تعديل الالتزام
            </button>
          )}
        </div>

        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>قيمة الالتزام الشهري</th>
                  <th>ساري من</th>
                  <th>ساري حتى</th>
                </tr>
              </thead>

              <tbody>
                {commitments.map((item) => (
                  <tr key={item.Id}>
                    <td className="amount-cell">{money(item.MonthlyAmount)}</td>
                    <td>{dateLabel(item.EffectiveFrom)}</td>
                    <td>
                      {item.EffectiveTo ? dateLabel(item.EffectiveTo) : "مستمر"}
                    </td>
                  </tr>
                ))}

                {!commitments.length && (
                  <tr>
                    <td colSpan={3}>لا يوجد سجل التزامات.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {commitmentModalOpen && currentCommitment && (
        <CommitmentFormModal
          currentAmount={currentCommitment.MonthlyAmount}
          effectiveFrom={currentCommitment.EffectiveFrom}
          saving={savingCommitment}
          onClose={() => setCommitmentModalOpen(false)}
          onSubmit={saveCommitment}
        />
      )}
    </>
  );
}
