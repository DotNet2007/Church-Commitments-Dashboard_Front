import { useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";

type Props = {
  currentAmount: string | number;
  effectiveFrom: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: { MonthlyAmount: number; EffectiveFrom: string }) => void;
};

export default function CommitmentFormModal({
  currentAmount,
  effectiveFrom,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState(String(currentAmount));
const minimumStartMonth = (() => {
  const now = new Date();
  const nextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  return `${nextMonth.getFullYear()}-${String(
    nextMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
})();

const [startMonth, setStartMonth] = useState(minimumStartMonth);

const submit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const monthlyAmount = Number(amount);

  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
    return;
  }

  if (!startMonth || startMonth < minimumStartMonth) {
    return;
  }

  onSubmit({
    MonthlyAmount: monthlyAmount,
    EffectiveFrom: `${startMonth}-01`,
  });
};

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
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
            <h2 id="commitment-form-title">تعديل الالتزام الشهري</h2>
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
                <span className="field-label">قيمة الالتزام الجديدة *</span>
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
              سيتم الاحتفاظ بسجل الالتزامات السابقة، وتطبيق القيمة الجديدة
              بدايةً من الشهر المحدد.
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
              {saving ? "جارٍ الحفظ..." : "حفظ الالتزام"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
