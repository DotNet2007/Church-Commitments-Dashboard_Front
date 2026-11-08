
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import { money } from "../../utils/formatters";
import {
  getPayments,
  getPaymentById,
  updatePaymentReceipt,
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
  const [receiptPayment, setReceiptPayment] =
    useState<PaymentRecord | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [savingReceipt, setSavingReceipt] = useState(false);

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
  }, [page, limit, search, debouncedSearch]);


  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.Amount),
    0,
  );

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

  const openReceiptEditor = (payment: PaymentRecord) => {
    setReceiptPayment(payment);
    setReceiptNumber(payment.ReceiptNumber);
  };

  const saveReceiptNumber = async () => {
    if (!receiptPayment) return;

    const value = receiptNumber.trim();

    if (!value) {
      toast.error("يرجى إدخال رقم الإيصال");
      return;
    }

    if (value === receiptPayment.ReceiptNumber) {
      setReceiptPayment(null);
      return;
    }

    setSavingReceipt(true);

    try {
      const updatedPayment = await updatePaymentReceipt(
        receiptPayment.Id,
        value,
      );

      setPayments((current) =>
        current.map((payment) =>
          payment.Id === updatedPayment.Id
            ? {
              ...payment,
              ...updatedPayment,

              // Preserve member information if PATCH doesn't return it
              Member: updatedPayment.Member ?? payment.Member,

              // Preserve allocations if PATCH doesn't return them
              Allocations:
                updatedPayment.Allocations ?? payment.Allocations,
            }
            : payment,
        ),
      );

      setReceiptPayment(null);
      toast.success("تم تحديث رقم الإيصال بنجاح");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث رقم الإيصال",
      );
    } finally {
      setSavingReceipt(false);
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
                          title="تصحيح رقم الإيصال"
                          onClick={() => openReceiptEditor(payment)}
                        >
                          <Pencil size={14} />
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

      {/* Edit Receipt Number */}
      {receiptPayment && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingReceipt) {
              setReceiptPayment(null);
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
                <div className="eyebrow">تعديل بيانات الإيصال</div>
                <h2>تصحيح رقم الإيصال</h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setReceiptPayment(null)}
                disabled={savingReceipt}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className="modal-body">
              <label>
                <span className="field-label">رقم الإيصال الجديد</span>
                <input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  disabled={savingReceipt}
                  placeholder="أدخل رقم الإيصال"
                />
              </label>

              <p style={{ fontSize: 15 }} className="member-form-hint">
                سيتم تصحيح رقم الإيصال فقط، ولن يتم تغيير المبلغ أو بيانات
                الدفعة المالية.
              </p>
            </div>

            <footer className="modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setReceiptPayment(null)}
                disabled={savingReceipt}
              >
                إلغاء
              </button>

              <button
                type="button"
                className="button button-primary"
                onClick={saveReceiptNumber}
                disabled={savingReceipt}
              >
                <CheckCircle2 size={16} />
                {savingReceipt ? "جارٍ الحفظ..." : "حفظ التعديل"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}