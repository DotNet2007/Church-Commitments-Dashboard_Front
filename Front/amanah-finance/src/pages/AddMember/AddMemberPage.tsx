
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  UserPlus,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createMember } from "../../services/api/membersApi";
import type { CommitmentFrequency } from "../../services/api/membersApi";

export default function AddMemberPage() {
  const navigate = useNavigate();

  const today = new Date();

  const todayValue = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [values, setValues] = useState({
    FullName: "",
    Phone: "",
    JoiningDate: todayValue,
    Notes: "",
    AmountPerPeriod: "",
    Frequency: "MONTHLY" as CommitmentFrequency,
    EffectiveFrom: todayValue,
  });

  const [saving, setSaving] = useState(false);

  const set = (
    key: keyof typeof values,
    value: string
  ) => {
    setValues((old) => ({
      ...old,
      [key]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

const amountText = values.AmountPerPeriod.trim();

if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
  toast.error("أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين");
  return;
}

const amountInCents = Math.round(Number(amountText) * 100);

if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
  toast.error("قيمة الالتزام غير صحيحة");
  return;
}

const amount = amountInCents / 100;

  if (
  !values.EffectiveFrom ||
  Number.isNaN(Date.parse(`${values.EffectiveFrom}T00:00:00`))
) {
  toast.error("يرجى تحديد تاريخ بداية التزام صحيح");
  return;
}

    setSaving(true);

    try {
      await createMember({
        FullName: values.FullName.trim(),
        Phone: values.Phone.trim() || undefined,
        JoiningDate: values.JoiningDate,
        Notes: values.Notes.trim() || undefined,
        AmountPerPeriod: amount,
        Frequency: values.Frequency,
        EffectiveFrom: values.EffectiveFrom,
      });

      toast.success("تم إضافة العضو والالتزام الأول بنجاح");

      navigate("/members", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر إضافة العضو";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-member-page" dir="rtl">
      <div className="page-heading">
        <div>
          <div className="eyebrow">دليل الأعضاء</div>
          <h1>إضافة عضو جديد</h1>
          <p>
            تسجيل بيانات عضو جديد وإضافة قيمة الالتزام ودوريته.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => navigate("/members")}
        >
          <ArrowRight size={17} />
          العودة للأعضاء
        </button>
      </div>

      <section className="add-member-card">
        <div className="add-member-card-header">
          <div className="add-member-icon">
            <UserPlus size={23} />
          </div>

          <div>
            <h2>بيانات العضو</h2>
            <p>أدخل البيانات المطلوبة لإضافة العضو.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="add-member-form-body">
            <div className="member-form-grid">
              <label>
                <span className="field-label">اسم العضو *</span>
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={values.FullName}
                  onChange={(e) =>
                    set("FullName", e.target.value)
                  }
                  placeholder="الاسم بالكامل"
                />
              </label>

              <label>
                <span className="field-label">رقم الهاتف</span>
                <input
                  maxLength={30}
                  value={values.Phone}
                  onChange={(e) =>
                    set("Phone", e.target.value)
                  }
                  placeholder="رقم الهاتف"
                />
              </label>

              <label>
                <span className="field-label">تاريخ الانضمام *</span>
                <input
                  required
                  type="date"
                  value={values.JoiningDate}
                  onChange={(e) =>
                    set("JoiningDate", e.target.value)
                  }
                />
              </label>

              <label>
                <span className="field-label">قيمة الالتزام لكل فترة *</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  max="10000000000000000"
                  step="0.01"
                  value={values.AmountPerPeriod}
                  onChange={(e) =>
                    set("AmountPerPeriod", e.target.value)
                  }
                  placeholder="500"
                />
              </label>

              <label>
                <span className="field-label">دورية الالتزام *</span>
                <select
                  required
                  value={values.Frequency}
                  onChange={(e) =>
                    set(
                      "Frequency",
                      e.target.value as CommitmentFrequency
                    )
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
    type="month"
    value={values.EffectiveFrom.slice(0, 7)}
    onChange={(e) =>
      set("EffectiveFrom", e.target.value ? `${e.target.value}-01` : "")
    }
  />
</label>
            </div>

            <label className="add-member-notes">
              <span className="field-label">ملاحظات</span>
              <textarea
                className="form-input"
                maxLength={500}
                rows={4}
                value={values.Notes}
                onChange={(e) =>
                  set("Notes", e.target.value)
                }
                placeholder="ملاحظات اختيارية..."
              />
            </label>
          </div>

          <div className="add-member-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => navigate("/members")}
              disabled={saving}
            >
              <X size={17} />
              إلغاء
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={saving}
            >
              <CheckCircle2 size={17} />
              {saving ? "جارٍ الحفظ..." : "إضافة العضو"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
