import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Eye, Pencil, Plus, RefreshCw, Search, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PageTitle from "../../components/common/PageTitle";
import { getAccounts, type AccountRecord } from "../../services/api/accountsApi";
import { ApiError } from "../../services/api/api";
import {
  createExpense, createRevenue, deleteExpense, deleteRevenue, getExpense, getExpenses,
  getRevenue, getRevenues, updateExpense, updateRevenue,
  type ExpenseRecord, type RevenueRecord, type PaymentMethod, type RevenueTransactionType,
  type PaginationMeta, type JournalEntry,
} from "../../services/api/transactionsApi";

type Kind = "expenses" | "revenues";
type Transaction = ExpenseRecord | RevenueRecord;

const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
const dateLabel = (value: string) => new Date(value).toLocaleDateString("ar-EG");
const cents = (value: string | number) => Math.round(Number(value || 0) * 100);
const isExpense = (kind: Kind): kind is "expenses" => kind === "expenses";

type FormState = {
  date: string; categoryId: string; subcategoryId: string; description: string; receiptNumber: string;
  total: string; paymentMethod: PaymentMethod; cash: string; bank: string;
  transactionType: RevenueTransactionType; accountId: string; receiptStart: string; receiptEnd: string;
};
const emptyForm = (): FormState => ({
  date: today(), categoryId: "", subcategoryId: "", description: "", receiptNumber: "",
  total: "", paymentMethod: "CASH", cash: "", bank: "", transactionType: "INDIVIDUAL",
  accountId: "", receiptStart: "", receiptEnd: "",
});

function initialForm(kind: Kind, record?: Transaction): FormState {
  const form = emptyForm();
  if (!record) return form;
  form.date = record.TransactionDate.slice(0, 10);
  form.description = record.Description ?? "";
  form.total = String(record.TotalAmount);
  form.cash = String(record.CashAmount);
  form.bank = String(record.BankAmount);
  if (isExpense(kind)) {
    const expense = record as ExpenseRecord;
    form.categoryId = String(expense.CategoryId);
    form.subcategoryId = expense.SubcategoryId ? String(expense.SubcategoryId) : "";
    form.receiptNumber = expense.ReceiptNumber ?? "";
    form.paymentMethod = expense.PaymentMethod;
  } else {
    const revenue = record as RevenueRecord;
    form.accountId = String(revenue.AccountId);
    form.transactionType = revenue.TransactionType;
    form.receiptNumber = revenue.ReceiptNumber == null ? "" : String(revenue.ReceiptNumber);
    form.receiptStart = revenue.ReceiptRangeStart == null ? "" : String(revenue.ReceiptRangeStart);
    form.receiptEnd = revenue.ReceiptRangeEnd == null ? "" : String(revenue.ReceiptRangeEnd);
  }
  return form;
}

function PaymentFields({ form, setForm, revenue }: {
  form: FormState; setForm: (next: FormState) => void; revenue: boolean;
}) {
  const update = (key: "cash" | "bank", value: string) => {
    const next = { ...form, [key]: value };
    if (form.paymentMethod === "CASH" && !revenue) next.bank = "0";
    if (form.paymentMethod === "BANK" && !revenue) next.cash = "0";
    setForm(next);
  };
  const total = Number(form.total || 0);
  return (
    <div className="transaction-payment-fields">
      {!revenue && (
        <label className="transaction-field">
          <span>طريقة الدفع <b>*</b></span>
          <select value={form.paymentMethod} onChange={(e) => {
            const method = e.target.value as PaymentMethod;
            setForm({ ...form, paymentMethod: method, cash: method === "BANK" ? "0" : method === "SPLIT" ? form.cash : form.total, bank: method === "CASH" ? "0" : method === "SPLIT" ? form.bank : form.total });
          }}>
            <option value="CASH">نقدي</option><option value="BANK">تحويل بنكي</option><option value="SPLIT">نقدي + بنك</option>
          </select>
        </label>
      )}
      <div className="transaction-field">
        <label htmlFor="transaction-cash">المبلغ النقدي <b>*</b></label>
        <input id="transaction-cash" type="number" min="0" step="0.01" value={form.cash} disabled={!revenue && form.paymentMethod === "BANK"} onChange={(e) => update("cash", e.target.value)} />
      </div>
      <div className="transaction-field">
        <label htmlFor="transaction-bank">المبلغ البنكي <b>*</b></label>
        <input id="transaction-bank" type="number" min="0" step="0.01" value={form.bank} disabled={!revenue && form.paymentMethod === "CASH"} onChange={(e) => update("bank", e.target.value)} />
      </div>
      <div className="transaction-payment-total">
        <span>إجمالي النقدي + البنك</span>
        <strong>{money((Number(form.cash || 0) + Number(form.bank || 0)).toFixed(2))} ج.م</strong>
        <small className={cents(form.cash) + cents(form.bank) === cents(total) ? "is-valid" : "is-invalid"}>
          {cents(form.cash) + cents(form.bank) === cents(total) ? "المبالغ متطابقة مع الإجمالي" : "يجب أن يساوي مجموعهما إجمالي العملية"}
        </small>
      </div>
    </div>
  );
}

function TransactionModal({ kind, record, accounts, saving, onClose, onSave }: {
  kind: Kind; record: Transaction | null; accounts: AccountRecord[]; saving: boolean;
  onClose: () => void; onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState(() => initialForm(kind, record ?? undefined));
  const [validation, setValidation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const revenue = !isExpense(kind);
  const activeAccounts = accounts.filter((account) => account.IsActive);
  const incomeAccounts = activeAccounts.filter((account) => account.AccountType === "INCOME" && !account.IsGroup);
  const expenseAccounts = activeAccounts.filter((account) => account.AccountType === "EXPENSE");
  const selectedCategory = expenseAccounts.find((account) => account.Id === Number(form.categoryId));
  const subcategories = selectedCategory
    ? expenseAccounts.filter((account) => account.ParentAccountId === selectedCategory.Id && !account.IsGroup)
    : [];
  const categoryHasChildren = subcategories.length > 0;
  const canSelectCategory = (account: AccountRecord) =>
    account.IsGroup ? activeAccounts.some((child) => child.ParentAccountId === account.Id) : true;

  useEffect(() => {
    if (form.paymentMethod === "CASH" && !revenue) setForm((current) => ({ ...current, bank: "0" }));
    if (form.paymentMethod === "BANK" && !revenue) setForm((current) => ({ ...current, cash: "0" }));
  }, [form.paymentMethod, revenue]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const total = Number(form.total);
    if (!form.date) return setValidation("تاريخ العملية مطلوب.");
    if (revenue && form.date > today()) return setValidation("لا يمكن تسجيل إيراد بتاريخ مستقبلي.");
    if (!Number.isFinite(total) || total <= 0 || !/^\d+(\.\d{1,2})?$/.test(form.total)) return setValidation("أدخل إجماليًا أكبر من صفر وبحد أقصى منزلتين عشريتين.");
    if (!form.description.trim() && form.description.length > 500) return setValidation("الوصف يجب ألا يتجاوز 500 حرف.");
    if (form.description.length > 500) return setValidation("الوصف يجب ألا يتجاوز 500 حرف.");
    if (cents(form.cash) < 0 || cents(form.bank) < 0 || cents(form.cash) + cents(form.bank) !== cents(total)) return setValidation("يجب أن يكون مجموع النقدي والبنك مساويًا للإجمالي.");
    if (revenue) {
      if (!form.accountId || !incomeAccounts.some((a) => a.Id === Number(form.accountId))) return setValidation("اختر حساب إيرادات نشطًا وتفصيليًا.");
      if (form.transactionType === "INDIVIDUAL") {
        if ((Number(form.cash) > 0) === (Number(form.bank) > 0)) return setValidation("الإيراد الفردي يجب أن يكون نقديًا فقط أو بنكيًا فقط.");
        if (form.receiptNumber && (!Number.isInteger(Number(form.receiptNumber)) || Number(form.receiptNumber) <= 0)) return setValidation("رقم الإيصال الفردي يجب أن يكون رقمًا صحيحًا موجبًا.");
      } else {
        if (form.receiptNumber) return setValidation("الإيصال المجمع يستخدم نطاق إيصالات وليس رقم إيصال فردي.");
        const start = Number(form.receiptStart), end = Number(form.receiptEnd);
        if ((form.receiptStart || form.receiptEnd) && (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start)) return setValidation("أدخل بداية ونهاية صحيحتين لنطاق الإيصالات.");
      }
    } else {
      if (!selectedCategory) return setValidation("اختر تصنيف المصروف.");
      if (categoryHasChildren && !form.subcategoryId) return setValidation("اختر التصنيف الفرعي.");
      if (!categoryHasChildren && selectedCategory.IsGroup) return setValidation("هذا التصنيف مجموعة ولا يحتوي على حساب تفصيلي نشط.");
      if (form.receiptNumber.length > 50) return setValidation("رقم الإيصال يجب ألا يتجاوز 50 حرفًا.");
      if (form.paymentMethod === "SPLIT" && (Number(form.cash) <= 0 || Number(form.bank) <= 0)) return setValidation("في حالة الدفع المختلط يجب أن يكون المبلغان النقدي والبنكي أكبر من صفر.");
    }
    setValidation("");
    setSubmitting(true);
    try { await onSave(form); } finally { setSubmitting(false); }
  };

  return (
    <div className="transaction-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" dir="rtl">
        <header className="transaction-modal-header">
          <div><span className="eyebrow">{revenue ? "الإيرادات" : "المصروفات"}</span><h2 id="transaction-form-title">{record ? "تعديل العملية" : revenue ? "تسجيل إيراد جديد" : "تسجيل مصروف جديد"}</h2><p>أدخل بيانات العملية بدقة، وسيقوم النظام بإنشاء القيد المحاسبي تلقائيًا.</p></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving}><X size={20}/></button>
        </header>
        <form onSubmit={submit}>
          <div className="transaction-form-grid">
            {revenue && <label className="transaction-field transaction-field-full"><span>نوع الإيراد <b>*</b></span><select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as RevenueTransactionType, receiptNumber: "", receiptStart: "", receiptEnd: "" })}><option value="INDIVIDUAL">فردي</option><option value="BATCH">مجمع</option></select></label>}
            <label className="transaction-field"><span>التاريخ <b>*</b></span><input type="date" value={form.date} max={revenue ? today() : undefined} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
            <label className="transaction-field"><span>{revenue ? "حساب الإيرادات" : "تصنيف المصروف"} <b>*</b></span>
              <select value={revenue ? form.accountId : form.categoryId} onChange={(e) => setForm({ ...form, ...(revenue ? { accountId: e.target.value } : { categoryId: e.target.value, subcategoryId: "" }) })}>
                <option value="">اختر الحساب</option>
                {(revenue ? incomeAccounts : expenseAccounts.filter((a) => !(a.IsGroup && a.ParentAccountId === null) && canSelectCategory(a))).map((a) => <option key={a.Id} value={a.Id}>{a.AccountCode} — {a.AccountName}</option>)}
              </select>
            </label>
            {!revenue && categoryHasChildren && <label className="transaction-field"><span>التصنيف الفرعي <b>*</b></span><select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}><option value="">اختر التصنيف الفرعي</option>{subcategories.map((a) => <option key={a.Id} value={a.Id}>{a.AccountCode} — {a.AccountName}</option>)}</select></label>}
            <label className="transaction-field"><span>إجمالي المبلغ (ج.م) <b>*</b></span><input type="number" min="0.01" step="0.01" value={form.total} onChange={(e) => {
              const totalValue = e.target.value;
              setForm((current) => ({ ...current, total: totalValue, ...(!revenue && current.paymentMethod === "CASH" ? { cash: totalValue } : {}), ...(!revenue && current.paymentMethod === "BANK" ? { bank: totalValue } : {}) }));
            }} placeholder="0.00"/></label>
            {revenue && form.transactionType === "INDIVIDUAL" && <label className="transaction-field"><span>رقم الإيصال <small>(اختياري)</small></span><input type="number" min="1" step="1" value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}/></label>}
            {revenue && form.transactionType === "BATCH" && <>
              <label className="transaction-field"><span>بداية نطاق الإيصالات</span><input type="number" min="1" step="1" value={form.receiptStart} onChange={(e) => setForm({ ...form, receiptStart: e.target.value })}/></label>
              <label className="transaction-field"><span>نهاية نطاق الإيصالات</span><input type="number" min="1" step="1" value={form.receiptEnd} onChange={(e) => setForm({ ...form, receiptEnd: e.target.value })}/></label>
            </>}
            {!revenue && <label className="transaction-field"><span>رقم الإيصال</span><input maxLength={50} value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}/></label>}
            <label className="transaction-field transaction-field-full"><span>الوصف</span><textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب وصفًا مختصرًا للعملية..."/><small>{form.description.length}/500</small></label>
          </div>
          <PaymentFields form={form} setForm={setForm} revenue={revenue}/>
          {validation && <p className="transaction-validation">{validation}</p>}
          <footer className="transaction-modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={submitting || saving}>إلغاء</button>
            <button type="submit" className="button button-primary" disabled={submitting || saving}>{submitting || saving ? "جارٍ الحفظ..." : record ? "حفظ التعديلات" : "حفظ العملية"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function JournalHistory({ entries }: { entries?: JournalEntry[] }) {
  if (!entries?.length) return <p className="transaction-muted">لا يوجد سجل قيود محاسبية متاح لهذه العملية.</p>;
  return <div className="transaction-journal-list">{entries.map((entry, index) => (
    <article className="transaction-journal-entry" key={entry.Id ?? index}>
      <strong>قيد محاسبي {entry.EntryNumber ? `#${entry.EntryNumber}` : `#${entry.Id ?? index + 1}`}</strong>
      {entry.TransactionDate && <span>{dateLabel(entry.TransactionDate)}</span>}
      {entry.Lines?.length ? <div className="transaction-journal-lines">{entry.Lines.map((line, lineIndex) => <div key={line.Id ?? lineIndex}><span>{line.AccountName ?? `حساب ${line.AccountId ?? ""}`}</span><span>مدين: {money(line.Debit as string | number)} — دائن: {money(line.Credit as string | number)}</span></div>)}</div> : null}
    </article>
  ))}</div>;
}

export default function TransactionsPage({ kind }: { kind: Kind }) {
  const expense = isExpense(kind);
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [details, setDetails] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const title = expense ? "المصروفات" : "الإيرادات";

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try { setAccounts(await getAccounts()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل دليل الحسابات"); }
    finally { setAccountsLoading(false); }
  }, []);

  const loadItems = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const filters = {
        page: targetPage, limit: 20, sortOrder: "desc" as const,
        ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}),
        ...(accountFilter ? expense ? { categoryId: Number(accountFilter) } : { accountId: Number(accountFilter) } : {}),
        ...(expense && subcategoryFilter ? { subcategoryId: Number(subcategoryFilter) } : {}),
        ...(expense && paymentFilter ? { paymentMethod: paymentFilter as PaymentMethod } : {}),
        ...(!expense && typeFilter ? { transactionType: typeFilter as RevenueTransactionType } : {}),
      };
      const result = expense ? await getExpenses(filters) : await getRevenues(filters);
      setItems(result.data);
      setMeta(result.meta);
      setPage(result.meta.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `تعذر تحميل ${title}`);
    } finally { setLoading(false); }
  }, [page, dateFrom, dateTo, accountFilter, subcategoryFilter, paymentFilter, typeFilter, expense, title]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadItems(1); }, [dateFrom, dateTo, accountFilter, subcategoryFilter, paymentFilter, typeFilter, expense]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const accountName = expense ? (item as ExpenseRecord).Category?.AccountName : (item as RevenueRecord).Account?.AccountName;
      return [String(item.Id), item.Description ?? "", accountName ?? "", String(item.TotalAmount), expense ? (item as ExpenseRecord).ReceiptNumber ?? "" : String((item as RevenueRecord).ReceiptNumber ?? "")].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [items, search, expense]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = async (item: Transaction) => {
    try {
      const full = expense ? await getExpense(item.Id) : await getRevenue(item.Id);
      setEditing(full); setModalOpen(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل العملية"); }
  };
  const openDetails = async (item: Transaction) => {
    try { setDetails(expense ? await getExpense(item.Id) : await getRevenue(item.Id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل التفاصيل"); }
  };
  const save = async (form: FormState) => {
    setSaving(true);
    try {
      if (expense) {
        const body = {
          TransactionDate: form.date, CategoryId: Number(form.categoryId),
          SubcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
          Description: form.description.trim() || null, ReceiptNumber: form.receiptNumber.trim() || null,
          TotalAmount: Number(form.total), PaymentMethod: form.paymentMethod,
          CashAmount: Number(form.cash), BankAmount: Number(form.bank),
        };
        if (editing) await updateExpense(editing.Id, body); else await createExpense(body);
      } else {
        const body = {
          TransactionType: form.transactionType, AccountId: Number(form.accountId),
          TransactionDate: form.date, Description: form.description.trim() || null,
          TotalAmount: Number(form.total), CashAmount: Number(form.cash), BankAmount: Number(form.bank),
          ...(form.transactionType === "INDIVIDUAL"
            ? { ReceiptNumber: form.receiptNumber ? Number(form.receiptNumber) : null, ReceiptRangeStart: null, ReceiptRangeEnd: null }
            : { ReceiptNumber: null, ...(form.receiptStart && form.receiptEnd ? { ReceiptRangeStart: Number(form.receiptStart), ReceiptRangeEnd: Number(form.receiptEnd) } : { ReceiptRangeStart: null, ReceiptRangeEnd: null }) }),
        };
        if (editing) await updateRevenue(editing.Id, body); else await createRevenue(body);
      }
      toast.success(editing ? "تم تحديث العملية بنجاح" : "تم تسجيل العملية بنجاح");
      setModalOpen(false); setEditing(null);
      await loadItems(1);
    } catch (error) {
      if (!expense && error instanceof ApiError && error.status === 409) {
        toast.error("رقم الإيصال أو نطاق الإيصالات مستخدم بالفعل أو يتداخل مع إيصال/نطاق آخر.");
      } else {
        toast.error(error instanceof Error ? error.message : "تعذر حفظ العملية");
      }
    }
    finally { setSaving(false); }
  };
  const remove = async (item: Transaction) => {
    const label = `#${item.Id}`;
    if (!window.confirm(`هل تريد إلغاء ${expense ? "المصروف" : "الإيراد"} ${label}؟ سيتم الاحتفاظ بالسجل المحاسبي وعكس القيد تلقائيًا.`)) return;
    try {
      if (expense) await deleteExpense(item.Id); else await deleteRevenue(item.Id);
      toast.success("تم إلغاء العملية بنجاح.");
      await loadItems(page);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إلغاء العملية"); }
  };

  const accountOptions = accounts.filter((a) => a.IsActive && (expense ? a.AccountType === "EXPENSE" : a.AccountType === "INCOME" && !a.IsGroup));
  const subcategoryOptions = accounts.filter((a) => a.IsActive && a.AccountType === "EXPENSE" && !a.IsGroup && a.ParentAccountId !== null && (!accountFilter || a.ParentAccountId === Number(accountFilter)));
  const detailAccount = details ? expense ? (details as ExpenseRecord).Category : (details as RevenueRecord).Account : undefined;

  return <>
    <PageTitle eyebrow="الإدارة المالية" title={title} description={expense ? "تسجيل ومتابعة المصروفات وربطها بدليل الحسابات." : "تسجيل ومتابعة الإيرادات والإيصالات."} action={<button className="button button-primary" onClick={openCreate}><Plus size={16}/> {expense ? "إضافة مصروف" : "تسجيل إيراد"}</button>}/>
    <section className="transaction-summary-row">
      <article className="transaction-summary-card"><span>{expense ? "عدد المصروفات بالصفحة" : "عدد الإيرادات بالصفحة"}</span><strong>{items.length}</strong></article>
      <article className="transaction-summary-card"><span>إجمالي النتائج</span><strong>{meta.total}</strong></article>
      <article className="transaction-summary-card"><span>الصفحة الحالية</span><strong>{meta.page} / {Math.max(meta.totalPages, 1)}</strong></article>
    </section>
    <section className="filter-panel transaction-filter-panel">
      <div className="transaction-filter-grid">
        <label className="transaction-filter-search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في النتائج الحالية..."/></label>
        <label><CalendarDays size={15}/><input aria-label="من تاريخ" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)}/></label>
        <label><CalendarDays size={15}/><input aria-label="إلى تاريخ" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}/></label>
        <select aria-label={expense ? "تصفية حسب التصنيف" : "تصفية حسب حساب الإيرادات"} value={accountFilter} onChange={(e) => { setAccountFilter(e.target.value); if (expense) setSubcategoryFilter(""); }}><option value="">كل الحسابات</option>{accountOptions.map((a) => <option key={a.Id} value={a.Id}>{a.AccountCode} — {a.AccountName}</option>)}</select>
        {expense && <select aria-label="تصفية حسب التصنيف الفرعي" value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)}><option value="">كل التصنيفات الفرعية</option>{subcategoryOptions.map((a) => <option key={a.Id} value={a.Id}>{a.AccountCode} — {a.AccountName}</option>)}</select>}
        {expense ? <select aria-label="طريقة الدفع" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="">كل طرق الدفع</option><option value="CASH">نقدي</option><option value="BANK">بنكي</option><option value="SPLIT">مختلط</option></select> : <select aria-label="نوع الإيراد" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">كل الأنواع</option><option value="INDIVIDUAL">فردي</option><option value="BATCH">مجمع</option></select>}
        <button className="button button-secondary" type="button" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setAccountFilter(""); setSubcategoryFilter(""); setPaymentFilter(""); setTypeFilter(""); }}><RefreshCw size={15}/> إعادة ضبط</button>
      </div>
    </section>
    <section className="members-section">
      <div className="list-heading"><div><h2>سجل {title}</h2><p>{meta.total} عملية مسجلة</p></div><button className="text-link" type="button" onClick={() => void loadItems(page)}><RefreshCw size={14}/> تحديث</button></div>
      <div className="panel transaction-table-panel">
        {loading ? <div className="empty-state">جاري تحميل البيانات...</div> : visibleItems.length === 0 ? <div className="empty-state">لا توجد عمليات مطابقة للفلاتر الحالية.</div> :
          <div className="table-scroll"><table className="transaction-table"><thead><tr><th>رقم</th><th>التاريخ</th><th>{expense ? "التصنيف" : "حساب الإيراد"}</th>{expense ? <th>طريقة الدفع</th> : <th>النوع / الإيصالات</th>}<th>الإجمالي</th><th>نقدي</th><th>بنكي</th><th>الوصف</th><th>إجراءات</th></tr></thead>
            <tbody>{visibleItems.map((item) => {
              const exp = item as ExpenseRecord; const rev = item as RevenueRecord;
              const account = expense ? exp.Category : rev.Account;
              return <tr key={item.Id}>
                <td className="id-cell">#{item.Id}</td><td>{dateLabel(item.TransactionDate)}</td>
                <td><strong>{account?.AccountName ?? "—"}</strong><small className="transaction-code">{account?.AccountCode ?? ""}</small>{expense && exp.Subcategory?.AccountName && <small className="transaction-subcategory">{exp.Subcategory.AccountName}</small>}</td>
                <td>{expense ? exp.PaymentMethod === "CASH" ? "نقدي" : exp.PaymentMethod === "BANK" ? "بنكي" : "مختلط" : <>{rev.TransactionType === "INDIVIDUAL" ? "فردي" : "مجمع"}<small className="transaction-code">{rev.ReceiptCount != null ? `${rev.ReceiptCount} إيصال` : rev.ReceiptNumber ? `إيصال #${rev.ReceiptNumber}` : "—"}</small></>}</td>
                <td className="amount-cell">{money(item.TotalAmount)} ج.م</td><td>{money(item.CashAmount)}</td><td>{money(item.BankAmount)}</td><td className="transaction-description">{item.Description || "—"}</td>
                <td><div className="transaction-actions"><button title="التفاصيل" onClick={() => void openDetails(item)}><Eye size={16}/></button><button title="تعديل" onClick={() => void openEdit(item)}><Pencil size={15}/></button><button title="إلغاء العملية" className="danger" onClick={() => void remove(item)}><Trash2 size={15}/></button></div></td>
              </tr>;
            })}</tbody></table></div>}
      </div>
      <div className="transaction-pagination"><span>عرض {items.length} من {meta.total}</span><div><button disabled={!meta.hasPreviousPage || loading} onClick={() => void loadItems(page - 1)} aria-label="الصفحة السابقة"><ChevronRight size={17}/></button><strong>{meta.page} / {Math.max(meta.totalPages, 1)}</strong><button disabled={!meta.hasNextPage || loading} onClick={() => void loadItems(page + 1)} aria-label="الصفحة التالية"><ChevronLeft size={17}/></button></div></div>
    </section>

    {modalOpen && <TransactionModal kind={kind} record={editing} accounts={accounts} saving={saving || accountsLoading} onClose={() => { if (!saving) { setModalOpen(false); setEditing(null); } }} onSave={save}/>}
    {details && <div className="transaction-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetails(null); }}><section className="transaction-modal transaction-details-modal" role="dialog" aria-modal="true" dir="rtl">
      <header className="transaction-modal-header"><div><span className="eyebrow">تفاصيل العملية #{details.Id}</span><h2>{expense ? "تفاصيل المصروف" : "تفاصيل الإيراد"}</h2></div><button className="icon-button" onClick={() => setDetails(null)}><X size={20}/></button></header>
      <div className="transaction-details-grid">
        <div><span>التاريخ</span><strong>{dateLabel(details.TransactionDate)}</strong></div>
        <div><span>الحساب</span><strong>{detailAccount?.AccountName ?? "—"}</strong></div>
        {expense && <div><span>التصنيف الفرعي</span><strong>{(details as ExpenseRecord).Subcategory?.AccountName ?? "—"}</strong></div>}
        <div><span>الإجمالي</span><strong>{money(details.TotalAmount)} ج.م</strong></div>
        <div><span>نقدي</span><strong>{money(details.CashAmount)} ج.م</strong></div>
        <div><span>بنكي</span><strong>{money(details.BankAmount)} ج.م</strong></div>
        <div><span>الوصف</span><strong>{details.Description || "—"}</strong></div>
        {expense ? <div><span>رقم الإيصال</span><strong>{(details as ExpenseRecord).ReceiptNumber || "—"}</strong></div> : <div><span>الإيصالات</span><strong>{(details as RevenueRecord).ReceiptCount ?? (details as RevenueRecord).ReceiptNumber ?? "—"}</strong></div>}
      </div>
      <h3 className="transaction-history-title">السجل المحاسبي</h3>
      <JournalHistory entries={details.JournalEntries}/>
      <footer className="transaction-modal-actions"><button className="button button-secondary" onClick={() => setDetails(null)}>إغلاق</button></footer>
    </section></div>}
  </>;
}
