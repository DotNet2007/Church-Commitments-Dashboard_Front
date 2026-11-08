import { useMemo , useState } from "react";
import { CheckCircle2, CreditCard, Search, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import type { MemberRecord } from "../../services/api/membersApi";
import {
  createPayment,
  type PaymentRecord,
} from "../../services/api/paymentsApi";
import { money } from "../../utils/formatters";

type Props = {
  members: MemberRecord[];
  initialMemberId?: number;
  onClose: () => void;
  onSuccess?: (payment: PaymentRecord) => void;
};

export default function NewPaymentModal({
  members,
  initialMemberId,
  onClose,
  onSuccess,
}: Props) {
 const [selectedMember, setSelectedMember] = useState(
  String(initialMemberId ?? members[0]?.Id ?? "")
);

const initialMember = members.find(
  (member) => String(member.Id) === String(initialMemberId)
);

const [memberSearch, setMemberSearch] = useState(
  initialMember?.FullName ?? ""
);


const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

const filteredMembers = useMemo(() => {
  const query = memberSearch.trim().toLocaleLowerCase();

  if (!query) return members;

  return members.filter((member) => {
    const name = member.FullName.toLocaleLowerCase();
    const id = String(member.Id);

    return name.includes(query) || id.includes(query);
  });
}, [members, memberSearch]);
  const activeMember = members.find(
    (member) => String(member.Id) === selectedMember,
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
  "CASH" | "INSTAPAY"
>("CASH");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PaymentRecord | null>(null);

  const save = async () => {
    const memberId = Number(selectedMember);
    const amount = Number(paymentAmount);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      toast.error("يرجى اختيار عضو صحيح");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (!paymentDate) {
      toast.error("يرجى تحديد تاريخ الدفع");
      return;
    }

    if (!reference.trim()) {
      toast.error("يرجى إدخال رقم الإيصال");
      return;
    }

    setSaving(true);

    try {
      const payment = await createPayment(memberId, {
        ReceiptNumber: reference.trim(),
        Amount: amount,
        PaymentDate: paymentDate,
       PaymentMethod: paymentMethod,
        ...(notes.trim() ? { Notes: notes.trim() } : {}),
      });

      setResult(payment);
      onSuccess?.(payment);
      toast.success("تم تسجيل الدفعة وتوزيعها بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  const formatMonth = (value: string) =>
    new Intl.DateTimeFormat("ar-EG", {
      month: "long",
      year: "numeric",
    }).format(new Date(value));

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">معاملة مالية جديدة</div>
            <h2 id="payment-title">تسجيل دفعة جديدة</h2>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </header>

        <div className="modal-body">
          {!result ? (
            <>
              <label className="field-label">اختيار العضو</label>

             <div
  className="member-select searchable-member-select"
  onBlur={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setMemberDropdownOpen(false);
    }
  }}
>
  <Search size={17} className="member-search-icon" />

  <input
    type="text"
    value={memberSearch}
    placeholder="اكتبي اسم العضو أو رقمه..."
    disabled={saving}
    autoComplete="off"
    onFocus={() => setMemberDropdownOpen(true)}
    onChange={(e) => {
      setMemberSearch(e.target.value);
      setSelectedMember("");
      setMemberDropdownOpen(true);
    }}
    onKeyDown={(e) => {
      if (e.key === "Escape") {
        setMemberDropdownOpen(false);
      }

      if (e.key === "Enter" && filteredMembers.length > 0) {
        e.preventDefault();

        const member = filteredMembers[0];

        setSelectedMember(String(member.Id));
        setMemberSearch(member.FullName);
        setMemberDropdownOpen(false);
      }
    }}
  />

  {memberSearch && (
    <button
      type="button"
      className="member-search-clear"
      onClick={() => {
        setMemberSearch("");
        setSelectedMember("");
        setMemberDropdownOpen(true);
      }}
      disabled={saving}
      aria-label="مسح البحث"
    >
      <X size={15} />
    </button>
  )}

  {activeMember && (
    <span style={{ fontSize: 15 }} className="member-code">
      {activeMember.Id}
    </span>
  )}

  {memberDropdownOpen && !saving && (
    <div className="member-search-dropdown">

      {filteredMembers.length > 0 ? (
        filteredMembers.map((member) => (
         <button
  key={member.Id}
  type="button"
  className={`member-search-option ${
    selectedMember === String(member.Id) ? "selected" : ""
  }`}
  onClick={() => {
    setSelectedMember(String(member.Id));
    setMemberSearch(member.FullName);
    setMemberDropdownOpen(false);
  }}
>
  <span>{member.FullName}</span>
</button>
        ))
      ) : (
        <div className="member-search-empty">
          لا توجد نتائج مطابقة
        </div>
      )}

    </div>
  )}
</div>

              <div className="form-two">
                <label>
                  <span className="field-label">المبلغ المستلم (ج.م)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="1500"
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className="field-label">تاريخ الدفع</span>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="section-label">طريقة الدفع</div>

<div className="method-options">
  <button style={{ fontSize: 15}}
    type="button"
    className={`method ${paymentMethod === "CASH" ? "active" : ""}`}
    onClick={() => setPaymentMethod("CASH")}
    disabled={saving}
    aria-pressed={paymentMethod === "CASH"}
  >
    <CreditCard size={16} />
    نقدًا
  </button>

  <button style={{ fontSize: 15}}
    type="button"
    className={`method ${paymentMethod === "INSTAPAY" ? "active" : ""}`}
    onClick={() => setPaymentMethod("INSTAPAY")}
    disabled={saving}
    aria-pressed={paymentMethod === "INSTAPAY"}
  >
    <Smartphone size={16} />
    إنستاباي
  </button>
</div>

              <div className="form-two">
                <label>
                  <span className="field-label">رقم الإيصال</span>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="مثال: RCP-2026-006"
                    disabled={saving}
                  />
                </label>

                <label>
                  <span className="field-label">ملاحظات (اختياري)</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظة..."
                    disabled={saving}
                  />
                </label>
              </div>

              <p style={{ fontSize: 15 }} className="member-form-hint">
                سيتم توزيع المبلغ تلقائياً على الالتزامات المستحقة بواسطة
                النظام.
              </p>
            </>
          ) : (
            <div className="allocation-box">
              <strong>تم تسجيل الدفعة بنجاح</strong>

              <div className="allocation-row">
                <span>رقم الإيصال</span>
                <b>{result.ReceiptNumber}</b>
              </div>

              <div className="allocation-row">
                <span>إجمالي المبلغ</span>
                <b>{money(Number(result.Amount))}</b>
              </div>

              <div className="section-label">التوزيع الفعلي للدفعة</div>

              {result.Allocations.map((allocation) => (
                <div className="allocation-row" key={allocation.Id}>
                  <span>{formatMonth(allocation.PeriodMonth)}</span>
                  <b>{money(Number(allocation.AllocatedAmount))}</b>
                </div>
              ))}

              <div className="allocation-total">
                <strong>إجمالي الموزع</strong>
                <b>
                  {money(
                    result.Allocations.reduce(
                      (sum, item) => sum + Number(item.AllocatedAmount),
                      0,
                    ),
                  )}
                </b>
              </div>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={saving}
          >
            {result ? "إغلاق" : "إلغاء"}
          </button>

          {!result && (
            <button
              type="button"
              className="button button-primary"
              onClick={save}
              disabled={saving || members.length === 0}
            >
              <CheckCircle2 size={16} />
              {saving ? "جارٍ التسجيل..." : "تأكيد تسجيل الدفعة"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
