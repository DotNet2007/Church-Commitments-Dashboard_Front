import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  UserRound,
  Pencil,
  Plus,
  CheckCircle2,
  X,
  Clock3,
} from "lucide-react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import {
  getMember,
  reopenMember,
  type MemberRecord,
  type CommitmentRecord,
  type CommitmentFrequency,
} from "../../services/api/membersApi";
// import {
//   getCommitmentHistory,
//   changeCommitment,
// } from "../../services/api/commitmentsApi";
import {
  getCommitmentHistory,
  getMemberCommitmentPeriods,
  getMemberCommitmentSummary,
  previewCommitmentChange,
  confirmCommitmentChange,
  moneyToCents,
  centsToMoney,
  type CommitmentPeriod,
  type CommitmentSummary,
  type CommitmentPreviewResponse,
  type ChangeCommitmentRequest,
} from "../../services/api/commitmentsApi";
import CommitmentPreviewReview from "./CommitmentPreviewReview";
import {
  getMemberPayments,
  getMemberPaymentAllocations,
  type PaymentRecord,
  type MemberPaymentAllocation,
} from "../../services/api/paymentsApi";
import CommitmentFormModal from "./CommitmentFormModal";
import PeriodsYearGrid from "./PeriodsYearGrid";
import { ApiError } from "../../services/api/api";
type DashboardContext = {
  openPayment: (memberId?: number) => void;
};
const money = (value: string | number) =>
  `${Number(value).toLocaleString("en-EG", { maximumFractionDigits: 2 })} ج.م`;
const frequencyLabels: Record<CommitmentFrequency, string> = {
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي (كل 3 شهور)",
  HALF_YEARLY: "نصف سنوي (كل 6 شهور)",
  YEARLY: "سنوي",
};




const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));



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
  const [allocations, setAllocations] = useState<
  MemberPaymentAllocation[]
>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commitmentModalOpen, setCommitmentModalOpen] = useState(false);
  const [savingCommitment, setSavingCommitment] = useState(false);
const [commitmentPreview, setCommitmentPreview] =
  useState<CommitmentPreviewResponse | null>(null);
const [periods, setPeriods] = useState<CommitmentPeriod[]>([]);
const [commitmentSummary, setCommitmentSummary] =
  useState<CommitmentSummary | null>(null);
const [pendingCommitmentChange, setPendingCommitmentChange] =
  useState<ChangeCommitmentRequest | null>(null);
const [reloadKey, setReloadKey] = useState(0);

// Reload member financial data after a payment is created, edited, or deleted.
useEffect(() => {
  const handlePaymentChanged = (event: Event) => {
    const detail = (event as CustomEvent<{ memberId?: number }>).detail;

    if (!detail?.memberId || detail.memberId === id) {
      setReloadKey((key) => key + 1);
    }
  };

  const events = [
    "amanah:payment-created",
    "amanah:payment-updated",
    "amanah:payment-deleted",
  ];

  events.forEach((eventName) =>
    window.addEventListener(eventName, handlePaymentChanged),
  );

  return () => {
    events.forEach((eventName) =>
      window.removeEventListener(eventName, handlePaymentChanged),
    );
  };
}, [id]);

useEffect(() => {
  if (!Number.isInteger(id) || id <= 0) {
    setError("معرف العضو غير صحيح");
    setLoading(false);
    return;
  }

  let active = true;

  const loadMemberDetails = async () => {
    // أول تحميل فقط يعرض شاشة التحميل، وإعادة التحميل تتم بصمت
    if (reloadKey === 0) setLoading(true);
    setError("");

    try {
   const [
  memberData,
  commitmentData,
  paymentData,
  periodsData,
  summaryData,
  allocationsData,
] = await Promise.all([
  getMember(id),
  getCommitmentHistory(id),
  getAllMemberPayments(id),
  getMemberCommitmentPeriods(id),
  getMemberCommitmentSummary(id),
  getMemberPaymentAllocations(id),
]);

      if (!active) return;

      setMember(memberData);
      setCommitments(commitmentData);
      setPayments(paymentData);
      setPeriods(periodsData);
      setCommitmentSummary(summaryData);
      setAllocations(allocationsData);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "تعذر تحميل تفاصيل العضو";

      if (active) {
        setError(message);
        toast.error(message);
      }
    } finally {
      if (active) setLoading(false);
    }
  };

  loadMemberDetails();

  return () => {
    active = false;
  };
}, [id, reloadKey]);

const totalPaidCents = payments.reduce(
  (sum, payment) => sum + moneyToCents(payment.Amount),
  0,
);

const totalPaid = centsToMoney(totalPaidCents);

const outstanding = commitmentSummary?.totalOutstanding ?? "0.00";

const totalOverdue = commitmentSummary?.totalOverdue ?? "0.00";

const currentCommitment =
  commitmentSummary?.currentCommitment ??
  commitments
    .filter((item) => {
      const today = new Date();
      const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const start = item.EffectiveFrom.slice(0, 10);
      const end = item.EffectiveTo?.slice(0, 10);

      return start <= todayKey && (!end || end >= todayKey);
    })
    .sort((a, b) =>
      b.EffectiveFrom.localeCompare(a.EffectiveFrom),
    )[0] ?? null;


  // const saveCommitment = async (values: {
  //   MonthlyAmount: number;
  //   EffectiveFrom: string;
  // }) => {
  //   if (!currentCommitment) {
  //     toast.error("لا يوجد التزام حالي لتعديله");
  //     return;
  //   }

  //   setSavingCommitment(true);

  //   try {
  //     await changeCommitment(currentCommitment.Id, values);

  //     const updatedHistory = await getCommitmentHistory(id);
  //     setCommitments(updatedHistory);

  //     setCommitmentModalOpen(false);
  //     toast.success("تم تحديث الالتزام الشهري بنجاح");
  //   } catch (err: unknown) {
  //     const message =
  //       err instanceof Error ? err.message : "تعذر تحديث الالتزام الشهري";

  //     toast.error(message);
  //   } finally {
  //     setSavingCommitment(false);
  //   }
  // };
 
const closeModal = () => {
  if (savingCommitment) return;

  setCommitmentModalOpen(false);
  setCommitmentPreview(null);
  setPendingCommitmentChange(null);
};

const handleCommitmentPreview = async (values: {
  AmountPerPeriod: number;
  Frequency: CommitmentFrequency;
  EffectiveFrom: string;
}) => {
  if (!currentCommitment) {
    toast.error("لا يوجد التزام حالي لتعديله");
    return;
  }

  setSavingCommitment(true);

  try {
    const request: ChangeCommitmentRequest = {
      AmountPerPeriod: values.AmountPerPeriod,
      Frequency: values.Frequency,
      EffectiveStartDate: values.EffectiveFrom,
    };

    const preview = await previewCommitmentChange(
      currentCommitment.Id,
      request,
    );

    setPendingCommitmentChange(request);
    setCommitmentPreview(preview);

    toast.success("تم إعداد معاينة التغيير المالي");
  } catch (err: unknown) {
    toast.error(
      err instanceof Error
        ? err.message
        : "تعذر معاينة تغيير الالتزام",
    );
  } finally {
    setSavingCommitment(false);
  }
};

const handleConfirmCommitment = async () => {
  if (
    !currentCommitment ||
    !pendingCommitmentChange ||
    !commitmentPreview
  ) {
    return;
  }

  setSavingCommitment(true);

  try {
    await confirmCommitmentChange(currentCommitment.Id, {
      ...pendingCommitmentChange,
      previewToken: commitmentPreview.previewToken,
    });

   const [
  updatedHistory,
  updatedPayments,
  updatedPeriods,
  updatedSummary,
  updatedAllocations,
] = await Promise.all([
  getCommitmentHistory(id),
  getAllMemberPayments(id),
  getMemberCommitmentPeriods(id),
  getMemberCommitmentSummary(id),
  getMemberPaymentAllocations(id),
]);

    setCommitments(updatedHistory);
    setPayments(updatedPayments);
    setPeriods(updatedPeriods);
    setCommitmentSummary(updatedSummary);

    setCommitmentModalOpen(false);
    setCommitmentPreview(null);
    setPendingCommitmentChange(null);
    setAllocations(updatedAllocations);

    toast.success("تم تحديث الالتزام وإعادة توزيع المدفوعات بنجاح");
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      setCommitmentPreview(null);
      setPendingCommitmentChange(null);

      toast.error(
        "تغيرت البيانات بعد المعاينة. يرجى إجراء معاينة جديدة ومراجعتها.",
      );
    } else {
      toast.error(
        err instanceof Error
          ? err.message
          : "تعذر تأكيد تغيير الالتزام",
      );
    }
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
         <div className="stat-label">قيمة الالتزام لكل فترة</div>

<div className="stat-value">
  {currentCommitment
    ? money(currentCommitment.AmountPerPeriod)
    : "—"}
</div>

{currentCommitment && (
  <div className="stat-label">
    {frequencyLabels[currentCommitment.Frequency]}
  </div>
)}
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
      <PeriodsYearGrid periods={periods} allocations={allocations} />
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
    .map((allocation) => dateLabel(allocation.PeriodMonth))
    .join(" - ")}
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
      <p style={{ fontSize: 15 }}>
        {commitments.length} تغييرات مسجلة
      </p>
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
            <th>المبلغ لكل فترة</th>
            <th>تكرار الالتزام</th>
            <th>ساري من</th>
            <th>ساري حتى</th>
            <th>الحالة</th>
          </tr>
        </thead>

        <tbody>
          {commitments
            .slice()
            .sort((a, b) =>
              b.EffectiveFrom.localeCompare(a.EffectiveFrom)
            )
            .map((item) => {
              const today = new Date();

const todayKey = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

const start = item.EffectiveFrom.slice(0, 10);
const end = item.EffectiveTo?.slice(0, 10);

const isCurrent =
  start <= todayKey && (!end || end >= todayKey);

const isFuture = start > todayKey;

              return (
                <tr key={item.Id}>
                  <td className="amount-cell">
                    {money(item.AmountPerPeriod)}
                  </td>

                  <td>
                    {frequencyLabels[item.Frequency]}
                  </td>

                  <td>
                    {dateLabel(item.EffectiveFrom)}
                  </td>

                  <td>
                    {item.EffectiveTo
                      ? dateLabel(item.EffectiveTo)
                      : "مستمر"}
                  </td>

                  <td>
                    <span
                      className={isCurrent
  ? "الالتزام الحالي"
  : isFuture
    ? "التزام مستقبلي"
    : "سابق"}
                    >
                      <i />
                      {isCurrent ? "الالتزام الحالي" : "سابق"}
                    </span>
                  </td>
                </tr>
              );
            })}

          {!commitments.length && (
            <tr>
              <td colSpan={5}>
                لا يوجد سجل التزامات.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</section>


{commitmentModalOpen && currentCommitment && (
  !commitmentPreview ? (
    <CommitmentFormModal
      currentAmount={currentCommitment.AmountPerPeriod}
      currentFrequency={currentCommitment.Frequency}
      effectiveFrom={currentCommitment.EffectiveFrom}
      joiningDate={member.JoiningDate}
      saving={savingCommitment}
      onClose={closeModal}
      onSubmit={handleCommitmentPreview}
    />
  ) : (
    <div className="modal-backdrop">
      <section className="payment-modal member-form-modal">
        <header className="modal-header">
          <div>
            <div className="eyebrow">إدارة الالتزامات</div>
            <h2>مراجعة التغيير المالي</h2>
          </div>
          <button
            className="icon-button"
            onClick={closeModal}
            disabled={savingCommitment}
          >
            <X size={19} />
          </button>
        </header>

    <div className="modal-body member-form-body">
  <CommitmentPreviewReview preview={commitmentPreview} />
</div>

        <footer className="modal-footer">
          <button
            className="button button-secondary"
            onClick={closeModal}
            disabled={savingCommitment}
          >
            إلغاء
          </button>

          <button
            className="button button-primary"
            onClick={handleConfirmCommitment}
            disabled={savingCommitment}
          >
            <CheckCircle2 size={16} />
            {savingCommitment ? "جارٍ التأكيد..." : "تأكيد التغيير"}
          </button>
        </footer>
      </section>
    </div>
  )
)}

    </>
  );
}