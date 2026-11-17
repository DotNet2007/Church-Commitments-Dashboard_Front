import { useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { CommitmentFrequency } from "../../services/api/membersApi";

type Props = {
  currentAmount: string | number;
  currentFrequency: CommitmentFrequency;
  effectiveFrom: string;
  joiningDate: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: {
    AmountPerPeriod: number;
    Frequency: CommitmentFrequency;
    EffectiveFrom: string;
  }) => void;
};

const frequencies: { value: CommitmentFrequency; label: string }[] = [
  { value: "MONTHLY", label: "شهري" },
  { value: "QUARTERLY", label: "كل 3 شهور" },
  { value: "HALF_YEARLY", label: "كل 6 شهور" },
  { value: "YEARLY", label: "سنوي" },
];

export default function CommitmentFormModal({
  currentAmount,
  currentFrequency,
  joiningDate,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState(String(currentAmount));
  const [frequency, setFrequency] =
    useState<CommitmentFrequency>(currentFrequency);
const minimumStartMonth = joiningDate.slice(0, 7);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
 const nextMonthValue = [
    nextMonth.getFullYear(),
    String(nextMonth.getMonth() + 1).padStart(2, "0"),
  ].join("-");
  const defaultStartMonth = [
    nextMonth.getFullYear(),
    String(nextMonth.getMonth() + 1).padStart(2, "0"),
  ].join("-");

  const [startMonth, setStartMonth] = useState(
    nextMonthValue < minimumStartMonth ? minimumStartMonth : nextMonthValue,
  );
  const hasChanges =
  Number(amount) !== Number(currentAmount) ||
  frequency !== currentFrequency;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amountPerPeriod = Number(amount);

    if (
      !Number.isFinite(amountPerPeriod) ||
      amountPerPeriod <= 0 ||
      !startMonth
    ) {
      return;
    }

    onSubmit({
      AmountPerPeriod: amountPerPeriod,
      Frequency: frequency,
      EffectiveFrom: `${startMonth}-01`,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="payment-modal member-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commitment-form-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">إدارة الالتزامات</div>
            <h2 id="commitment-form-title">تعديل الالتزام</h2>
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

        <form onSubmit={submit}>
          <div className="modal-body member-form-body">
            <div className="member-form-grid">
              <label>
                <span className="field-label">قيمة الالتزام لكل فترة *</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>

              <label>
                <span className="field-label">تكرار الالتزام *</span>
                <select
                  required
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value as CommitmentFrequency)
                  }
                >
                  {frequencies.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="field-label">يبدأ تطبيق الالتزام من *</span>
               <input
  required
  type="month"
  min={minimumStartMonth}
  value={startMonth}
  onChange={(event) => setStartMonth(event.target.value)}
/>
              </label>
            </div>

            <p style={{ fontSize: 15 }} className="member-form-hint">
              المبلغ المدخل هو إجمالي المبلغ المستحق لكل فترة، وليس المبلغ
              الشهري. سيتم الاحتفاظ بسجل الالتزامات السابقة وإعادة تقييم
              التوزيعات المالية المتأثرة قبل التأكيد.
            </p>
          </div>

          <footer className="modal-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="button button-primary"
            disabled={
  saving ||
  !startMonth ||
  startMonth < minimumStartMonth ||
  !Number.isFinite(Number(amount)) ||
  Number(amount) <= 0
}
            >
              <CheckCircle2 size={16} />
              {saving ? "جارٍ التحضير..." : "معاينة التغيير"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}