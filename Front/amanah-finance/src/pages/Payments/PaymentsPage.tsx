
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { moneyToCents, centsToMoney } from "../../services/api/commitmentsApi";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import { money } from "../../utils/formatters";
import {
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  type PaymentRecord,
  type PaginationMeta,
} from "../../services/api/paymentsApi";

export default function PaymentsPage({ onAdd }: { onAdd: () => void }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editReceiptNumber, setEditReceiptNumber] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    // Wait until the user finishes typing
    if (search.trim() !== debouncedSearch) {
      return;
    }

    const loadPayments = async () => {
      setLoading(true);

      try {
        const response = await getPayments({
          page,
          limit,
          search: debouncedSearch || undefined,
        });

        if (!cancelled) {
          setPayments(response.data);
          setMeta(response.meta);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "تعذر تحميل المدفوعات",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPayments();

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, debouncedSearch, refreshKey]);


 const totalAmountCents = payments.reduce(
  (sum, payment) => sum + moneyToCents(payment.Amount),
  0,
);

const totalAmount = centsToMoney(totalAmountCents);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));

  const formatMonth = (date: string) =>
    new Intl.DateTimeFormat("ar-EG", {
      month: "long",
      year: "numeric",
    }).format(new Date(date));

  const getPaymentMethod = (method: string) => {
    switch (method) {
      case "CASH":
        return "نقداً";
      case "INSTAPAY":
        return "إنستاباي";
      default:
        return method;
    }
  };

  const openPaymentDetails = async (id: number) => {
    try {
      const payment = await getPaymentById(id);
      setSelectedPayment(payment);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحميل تفاصيل الدفعة",
      );
    }
  };

  const openPaymentEditor = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setEditReceiptNumber(payment.ReceiptNumber ?? "");
    setEditPaymentMethod(payment.PaymentMethod);
    setEditAmount(String(payment.Amount));
  };

  const savePaymentChanges = async () => {
    if (!editingPayment) return;

    const amount = Number(editAmount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !/^\\d+(\\.\\d{1,2})?$/.test(editAmount.trim())
    ) {
      toast.error("يرجى إدخال مبلغ أكبر من صفر وبحد أقصى منزلتين عشريتين");
      return;
    }

    const body: { ReceiptNumber?: string; PaymentMethod?: string; Amount?: number } = {};
    const nextReceipt = editReceiptNumber.trim();
    if (!nextReceipt) {
      toast.error("يرجى إدخال رقم الإيصال");
      return;
    }
    if (nextReceipt !== editingPayment.ReceiptNumber) body.ReceiptNumber = nextReceipt;
    if (editPaymentMethod !== editingPayment.PaymentMethod) body.PaymentMethod = editPaymentMethod;
    if (amount !== Number(editingPayment.Amount)) body.Amount = amount;

    if (Object.keys(body).length === 0) {
      setEditingPayment(null);
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updatePayment(editingPayment.Id, body);
      setPayments((current) => current.map((payment) =>
        payment.Id === updated.Id
          ? { ...payment, ...updated, Member: updated.Member ?? payment.Member,
              Allocations: updated.Allocations ?? payment.Allocations }
          : payment
      ));
      setSelectedPayment((current) => current?.Id === updated.Id
        ? { ...current, ...updated, Member: updated.Member ?? current.Member,
            Allocations: updated.Allocations ?? current.Allocations }
        : current
      );
      setEditingPayment(null);
      setRefreshKey((key) => key + 1);
      window.dispatchEvent(new CustomEvent("amanah:payment-updated", {
        detail: { memberId: updated.MemberId },
      }));
      toast.success("تم تحديث الدفعة وإعادة تحميل التوزيعات بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الدفعة");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
  const confirmed = window.confirm(
  `هل أنت متأكد من حذف العضو "${payment.Member?.FullName ?? "غير معروف"}"؟`,
);
    if (!confirmed) return;

    setDeletingPaymentId(payment.Id);
    try {
      await deletePayment(payment.Id);
      setPayments((current) => current.filter((item) => item.Id !== payment.Id));
      setSelectedPayment((current) => current?.Id === payment.Id ? null : current);
      setRefreshKey((key) => key + 1);
      window.dispatchEvent(new CustomEvent("amanah:payment-deleted", {
        detail: { memberId: payment.MemberId },
      }));
      toast.success("تم حذف الدفعة بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الدفعة");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="السجل المالي"
        title="إدارة المدفوعات"
        description="متابعة جميع الدفعات والمعاملات المالية المسجلة."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            تسجيل دفعة جديدة
          </button>
        }
      />

      <div className="payment-summary-grid">
        <div className="summary-card">
          <span style={{ fontSize: 15, fontWeight: 'bold' }}>إجمالي المبالغ المعروضة</span>
          <strong>{money(totalAmount)}</strong>
          <small>مجموع الدفعات في الصفحة الحالية</small>
        </div>

        <div className="summary-card">
          <span style={{ fontSize: 15, fontWeight: 'bold' }}>عدد العمليات المعروضة</span>
          <strong>{payments.length}</strong>
          <small>عدد العمليات في الصفحة الحالية</small>
        </div>

        <div className="summary-card">
          <span style={{ fontSize: 15, fontWeight: 'bold' }}>نتائج البحث</span>
          <strong>{meta.total}</strong>
          <small>عدد العمليات المطابقة للبحث</small>
        </div>
      </div>
      <section className="filter-panel payment-filters">
        <div className="search-field">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم العضو أو رقم الإيصال..."
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="مسح البحث"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* <div className="filter-row">
          <span className="filter-chip selected">
            <SlidersHorizontal size={12} />
            كل المدفوعات
          </span>
        </div> */}
      </section>

      <section className="members-section">
        <div className="list-heading">
          <div>
            <h2>سجل المدفوعات</h2>
            <p style={{ fontSize: 15 }}>جميع العمليات المالية المسجلة</p>
          </div>
        </div>

        <div className="panel members-table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>اسم العضو</th>
                  <th>المبلغ</th>
                  <th >تاريخ الدفع</th>
                  <th>طريقة الدفع</th>
                  <th>رقم الإيصال</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {loading && payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      جارٍ تحميل المدفوعات...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      لا توجد مدفوعات لعرضها
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.Id}>
                      <td>
                        <strong>{payment.Member?.FullName ?? "—"}</strong>
                      </td>

                      <td className="amount-cell">
                        {money(Number(payment.Amount))}
                      </td>

                      <td className="font-bold text-[#554A61]">{formatDate(payment.PaymentDate)}</td>

                      <td>
                        {getPaymentMethod(payment.PaymentMethod)}
                      </td>

                      <td className="id-cell">
                        {payment.ReceiptNumber}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="row-action"
                          title="عرض التفاصيل"
                          onClick={() =>
                            openPaymentDetails(payment.Id)
                          }
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          className="row-action"
                          title="تعديل الدفعة"
                          onClick={() => openPaymentEditor(payment)}
                          disabled={deletingPaymentId === payment.Id}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="row-action"
                          title="حذف الدفعة نهائيًا"
                          onClick={() => void handleDeletePayment(payment)}
                          disabled={deletingPaymentId === payment.Id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="button button-secondary"
              disabled={!meta.hasPreviousPage || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              السابق
            </button>

            <span>
              صفحة {meta.page} من {meta.totalPages}
            </span>

            <button
              type="button"
              className="button button-secondary"
              disabled={!meta.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </section>

      {/* Payment Details */}
      {selectedPayment && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPayment(null);
            }
          }}
        >
          <section
            className="payment-modal"
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <div>
                <div className="eyebrow">تفاصيل المعاملة</div>
                <h2>بيانات الدفعة</h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedPayment(null)}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className="modal-body">
              <div className="allocation-box">
                <div style={{ fontSize: 15 }} className="allocation-row">
                  <span>اسم العضو</span>
                  <b>{selectedPayment.Member.FullName}</b>
                </div>

                <div style={{ fontSize: 15 }} className="allocation-row">
                  <span>رقم الإيصال</span>
                  <b>{selectedPayment.ReceiptNumber}</b>
                </div>

                <div style={{ fontSize: 15 }} className="allocation-row">
                  <span>المبلغ</span>
                  <b>{money(Number(selectedPayment.Amount))}</b>
                </div>

                <div style={{ fontSize: 15 }} className="allocation-row">
                  <span>تاريخ الدفع</span>
                  <b>{formatDate(selectedPayment.PaymentDate)}</b>
                </div>

                <div style={{ fontSize: 15 }} className="allocation-row">
                  <span>طريقة الدفع</span>
                  <b>{getPaymentMethod(selectedPayment.PaymentMethod)}</b>
                </div>

                {selectedPayment.Notes && (
                  <div style={{ fontSize: 15 }} className="allocation-row">
                    <span>ملاحظات</span>
                    <b>{selectedPayment.Notes}</b>
                  </div>
                )}

                <div style={{ fontSize: 20 }} className="section-label">
                  توزيع الدفعة
                </div>

                {selectedPayment.Allocations.map((allocation) => (
                  <div style={{ fontSize: 15 }} className="allocation-row" key={allocation.Id}>
                    <span>{formatMonth(allocation.PeriodMonth)}</span>
                    <b>{money(Number(allocation.AllocatedAmount))}</b>
                  </div>
                ))}
              </div>
            </div>

            <footer className="modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedPayment(null)}
              >
                إغلاق
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Edit Payment */}
      {editingPayment && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !savingEdit) setEditingPayment(null);
        }}>
          <section className="payment-modal" role="dialog" aria-modal="true">
            <header className="payment-edit-header">
              <div className="payment-edit-heading">
                <span className="payment-edit-eyebrow">المدفوعات / تعديل معاملة</span>
                <h2>تعديل الدفعة</h2>
                <p>حدّث بيانات الإيصال أو طريقة الدفع أو قيمة الدفعة</p>
              </div>
              <button
                type="button"
                className="payment-edit-close"
                onClick={() => setEditingPayment(null)}
                disabled={savingEdit}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className="payment-edit-body">
              <div className="payment-edit-fields">
                <label className="payment-edit-field">
                  <span>رقم الإيصال</span>
                  <input
                    value={editReceiptNumber}
                    onChange={(e) => setEditReceiptNumber(e.target.value)}
                    disabled={savingEdit}
                    placeholder="أدخل رقم الإيصال"
                    dir="auto"
                  />
                </label>

                <label className="payment-edit-field">
                  <span>طريقة الدفع</span>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    disabled={savingEdit}
                  >
                    <option value="CASH">نقدًا</option>
                    <option value="INSTAPAY">إنستاباي</option>
                  </select>
                </label>

                <label className="payment-edit-field payment-edit-amount-field">
                  <span>المبلغ (ج.م)</span>
                  <div className="payment-edit-amount-wrap">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      disabled={savingEdit}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                    <span>ج.م</span>
                  </div>
                </label>
              </div>

              <div className="payment-edit-notice">
                <span className="payment-edit-notice-icon">i</span>
                <p>عند تغيير المبلغ، سيعيد النظام توزيع مدفوعات العضو بالكامل وتحديث الرصيد والتوزيعات تلقائيًا.</p>
              </div>
            </div>

            <footer className="payment-edit-footer">
              <button
                type="button"
                className="payment-edit-cancel"
                onClick={() => setEditingPayment(null)}
                disabled={savingEdit}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="payment-edit-save"
                onClick={() => void savePaymentChanges()}
                disabled={savingEdit}
              >
                <Save size={17} />
                {savingEdit ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}