import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import type {
  MemberRecord,
  CommitmentFrequency,
} from "../../services/api/membersApi";
import { toast } from "sonner";
export interface MemberFormValues {
  FullName: string;
  Phone: string;
  JoiningDate: string;
  Notes: string;
  AmountPerPeriod: string;
  Frequency: CommitmentFrequency;
  EffectiveFrom: string;
}

type Props = {
  member?: MemberRecord | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => void;
};

const today = new Date();

const dateValue = (value?: string) => (value ? value.slice(0, 10) : "");

const todayValue = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

export default function MemberFormModal({
  member,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MemberFormValues>({
    FullName: "",
    Phone: "",
    JoiningDate: todayValue,
    Notes: "",
    AmountPerPeriod: "",
    Frequency: "MONTHLY",
    EffectiveFrom: todayValue,
  });

  useEffect(() => {
    if (!member) {
      setValues({
        FullName: "",
        Phone: "",
        JoiningDate: todayValue,
        Notes: "",
        AmountPerPeriod: "",
        Frequency: "MONTHLY",
        EffectiveFrom: todayValue,
      });
      return;
    }

    const latest = [...(member.Commitments ?? [])].sort(
      (a, b) =>
        new Date(b.EffectiveFrom).getTime() -
        new Date(a.EffectiveFrom).getTime(),
    )[0];

    setValues({
      FullName: member.FullName,
      Phone: member.Phone ?? "",
      JoiningDate: dateValue(member.JoiningDate),
      Notes: member.Notes ?? "",
      AmountPerPeriod: latest ? String(latest.AmountPerPeriod) : "",
      Frequency: latest?.Frequency ?? "MONTHLY",
      EffectiveFrom: latest ? dateValue(latest.EffectiveFrom) : todayValue,
    });
  }, [member]);

  const set = (key: keyof MemberFormValues, value: string) => {
    setValues((old) => ({
      ...old,
      [key]: value,
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!member) {
      const amountText = values.AmountPerPeriod.trim();

      if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
        toast.error("أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين");
        return;
      }

      const [whole, decimal = ""] = amountText.split(".");
      const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));

      if (!Number.isSafeInteger(cents) || cents <= 0) {
        toast.error("قيمة الالتزام غير صحيحة");
        return;
      }
    }
    onSubmit(values);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="payment-modal member-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-form-title"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">دليل الأعضاء</div>
            <h2 id="member-form-title">
              {member ? "تعديل بيانات العضو" : "إضافة عضو جديد"}
            </h2>
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
                <span className="field-label">اسم العضو *</span>
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={values.FullName}
                  onChange={(e) => set("FullName", e.target.value)}
                  placeholder="الاسم بالكامل"
                />
              </label>

              <label>
                <span className="field-label">رقم الهاتف</span>
                <input
                  maxLength={30}
                  value={values.Phone}
                  onChange={(e) => set("Phone", e.target.value)}
                  placeholder="رقم الهاتف"
                />
              </label>

              <label>
                <span className="field-label">تاريخ الانضمام *</span>
                <input
                  required
                  type="date"
                  value={values.JoiningDate}
                  onChange={(e) => set("JoiningDate", e.target.value)}
                />
              </label>

              {!member && (
                <>
                  <label>
                    <span className="field-label">
                      قيمة الالتزام لكل فترة *
                    </span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="10000000000000000"
                      step="0.01"
                      value={values.AmountPerPeriod}
                      onChange={(e) => set("AmountPerPeriod", e.target.value)}
                      placeholder="500"
                    />
                  </label>

                  <label>
                    <span className="field-label">دورية الالتزام *</span>
                    <select
                      required
                      value={values.Frequency}
                      onChange={(e) =>
                        set("Frequency", e.target.value as CommitmentFrequency)
                      }
                    >
                      <option value="MONTHLY">شهري</option>
                      <option value="QUARTERLY">ربع سنوي</option>
                      <option value="HALF_YEARLY">نصف سنوي</option>
                      <option value="YEARLY">سنوي</option>
                    </select>
                  </label>

                  <label>
                    <span className="field-label">بداية الالتزام *</span>
                    <input
                      required
                      type="date"
                      value={values.EffectiveFrom}
                      onChange={(e) => set("EffectiveFrom", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            <label className="member-notes-field">
              <span className="field-label">ملاحظات</span>
              <textarea
                maxLength={500}
                rows={3}
                value={values.Notes}
                onChange={(e) => set("Notes", e.target.value)}
                placeholder="ملاحظات اختيارية..."
              />
            </label>

            {member && (
              <p style={{ fontSize: 15 }} className="member-form-hint">
                تعديل بيانات العضو لا يغيّر الالتزام أو سجل الالتزامات.
              </p>
            )}
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
              disabled={saving}
            >
              <CheckCircle2 size={16} />
              {saving
                ? "جارٍ الحفظ..."
                : member
                  ? "حفظ التعديلات"
                  : "إضافة العضو"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
