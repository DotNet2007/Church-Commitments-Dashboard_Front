import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Eye,
  FileText,
  Folder,
  FolderTree,
  Plus,
  Power,
  RotateCcw,
  RefreshCw,
  Search,
  Pencil,
  Wallet,
} from "lucide-react";
import PageTitle from "../../components/common/PageTitle";
import type { AccountRecord } from "../../services/api/accountsApi";

interface AccountTreeNode {
  account: AccountRecord;
  children: AccountTreeNode[];
}

const typeLabel = (type: AccountRecord["AccountType"]) =>
  type === "INCOME"
    ? "إيرادات"
    : type === "EXPENSE"
      ? "مصروفات"
      : "نقدية / بنك";

function buildAccountTree(accounts: AccountRecord[]): AccountTreeNode[] {
  const nodes = new Map<number, AccountTreeNode>();
  accounts.forEach((account) =>
    nodes.set(account.Id, { account, children: [] }),
  );

  const roots: AccountTreeNode[] = [];
  nodes.forEach((node) => {
    const parentId = node.account.ParentAccountId;
    const parent = parentId == null ? undefined : nodes.get(parentId);
    if (parent && parent.account.Id !== node.account.Id)
      parent.children.push(node);
    else roots.push(node);
  });

  const sortNodes = (items: AccountTreeNode[]) => {
    items.sort((a, b) =>
      a.account.AccountCode.localeCompare(b.account.AccountCode, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);

  // Preserve records whose parent is not present in the current API response.
  const visited = new Set<number>();
  const collect = (items: AccountTreeNode[]) =>
    items.forEach((item) => {
      if (visited.has(item.account.Id)) return;
      visited.add(item.account.Id);
      collect(item.children);
    });
  collect(roots);
  nodes.forEach((node) => {
    if (!visited.has(node.account.Id)) {
      roots.push(node);
      visited.add(node.account.Id);
    }
  });
  return roots;
}

function filterAccountTree(
  nodes: AccountTreeNode[],
  query: string,
  typeFilter: string,
): AccountTreeNode[] {
  return nodes.flatMap((node) => {
    const { account } = node;
    const matchesType =
      typeFilter === "ALL" || account.AccountType === typeFilter;
    const matchesQuery =
      !query ||
      [account.AccountCode, account.AccountName, String(account.Id)].some(
        (value) => value.toLocaleLowerCase().includes(query),
      );
    const matchingChildren = filterAccountTree(
      node.children,
      query,
      typeFilter,
    );

    if (matchesType && (matchesQuery || matchingChildren.length > 0)) {
      const children =
        matchesQuery && query
          ? filterAccountTree(node.children, "", typeFilter)
          : matchingChildren;
      return [{ ...node, children }];
    }
    if (matchingChildren.length > 0)
      return [{ ...node, children: matchingChildren }];
    return [];
  });
}

function countTreeNodes(nodes: AccountTreeNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countTreeNodes(node.children),
    0,
  );
}

function AccountTreeItem({
  node,
  expandedIds,
  forceExpanded,
  onToggle,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  node: AccountTreeNode;
  expandedIds: Set<number>;
  forceExpanded: boolean;
  onToggle: (id: number) => void;
  onView: (account: AccountRecord) => void;
  onEdit: (account: AccountRecord) => void;
  onDeactivate: (account: AccountRecord) => void;
  onReactivate: (account: AccountRecord) => void;
}) {
  const { account, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = forceExpanded || expandedIds.has(account.Id);
  const isSystemAccount = account.IsSystemAccount;
  const cannotDeactivate =
    isSystemAccount || ["1001", "1004"].includes(account.AccountCode);

  return (
    <div
      className="account-tree-node"
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      <div
        className={`account-tree-row ${!account.IsActive ? "is-inactive" : ""}`}
      >
        <div className="account-tree-main">
          <button
            className={`account-tree-toggle ${hasChildren ? "" : "is-leaf"}`}
            type="button"
            onClick={() => hasChildren && onToggle(account.Id)}
            disabled={!hasChildren}
            aria-label={
              hasChildren
                ? isExpanded
                  ? "طي الحسابات الفرعية"
                  : "توسيع الحسابات الفرعية"
                : "حساب تفصيلي"
            }
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronLeft size={16} />
              )
            ) : (
              <span className="account-tree-toggle-spacer" />
            )}
          </button>
          <span
            className={`account-tree-kind-icon ${account.IsGroup ? "group" : "detail"}`}
          >
            {account.IsGroup ? <Folder size={17} /> : <FileText size={16} />}
          </span>
          <div className="account-tree-identity">
            <div className="account-tree-title-line">
              <strong className="account-code" dir="ltr">
                {account.AccountCode}
              </strong>
              <button
                className="account-name-button"
                type="button"
                onClick={() => onView(account)}
              >
                {account.AccountName}
              </button>
              {isSystemAccount && (
                <span className="account-system-tag">نظام</span>
              )}
            </div>
            <div className="account-tree-meta">
              <span
                className={`account-type-tag ${account.AccountType.toLowerCase()}`}
              >
                {typeLabel(account.AccountType)}
              </span>
              <span className="account-tree-classification">
                {account.IsGroup ? "مجموعة" : "تفصيلي"}
              </span>
              {account.IsGroup &&
                (account._count?.Children ?? children.length) > 0 && (
                  <span className="account-tree-child-count">
                    {account._count?.Children ?? children.length} حساب فرعي
                  </span>
                )}
              <span
                className={`account-status ${account.IsActive ? "active" : "inactive"}`}
              >
                {account.IsActive ? "نشط" : "غير نشط"}
              </span>
            </div>
          </div>
        </div>
        <div className="account-row-actions">
          {/* <button
            className="icon-button"
            type="button"
            title="عرض التفاصيل"
            onClick={() => onView(account)}
          >
            <Eye size={15} />
          </button> */}
          <button
            className="icon-button"
            type="button"
            title={isSystemAccount ? "حساب نظام: التعديل غير مسموح" : "تعديل"}
            disabled={isSystemAccount}
            onClick={() => onEdit(account)}
          >
            <Pencil size={14} />
          </button>
          {account.IsActive ? (
            <button
              className="icon-button account-deactivate-button"
              type="button"
              title={cannotDeactivate ? "لا يمكن إلغاء تفعيل هذا الحساب" : "إلغاء التفعيل"}
              disabled={cannotDeactivate}
              onClick={() => onDeactivate(account)}
            >
              <Power size={14} />
            </button>
          ) : (
            <button
              className="icon-button account-reactivate-button"
              type="button"
              title="إعادة تفعيل الحساب"
              onClick={() => onReactivate(account)}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="account-tree-children" role="group">
          {children.map((child) => (
            <AccountTreeItem
              key={child.account.Id}
              node={child}
              expandedIds={expandedIds}
              forceExpanded={forceExpanded}
              onToggle={onToggle}
              onView={onView}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountsPage({
  accounts,
  allAccounts,
  loading,
  error,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  includeInactive,
  setIncludeInactive,
  onAdd,
  onEdit,
  onView,
  onDeactivate,
  onReactivate,
  onRetry,
}: {
  accounts: AccountRecord[];
  allAccounts: AccountRecord[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  includeInactive: boolean;
  setIncludeInactive: (value: boolean) => void;
  onAdd: () => void;
  onEdit: (account: AccountRecord) => void;
  onView: (account: AccountRecord) => void;
  onDeactivate: (account: AccountRecord) => void;
  onReactivate: (account: AccountRecord) => void;
  onRetry: () => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const activeCount = allAccounts.filter((account) => account.IsActive).length;
  const inactiveCount = allAccounts.length - activeCount;
  const incomeCount = allAccounts.filter(
    (account) => account.AccountType === "INCOME",
  ).length;
  const expenseCount = allAccounts.filter(
    (account) => account.AccountType === "EXPENSE",
  ).length;

  const tree = useMemo(
    () =>
      filterAccountTree(
        buildAccountTree(accounts),
        search.trim().toLocaleLowerCase(),
        typeFilter,
      ),
    [accounts, search, typeFilter],
  );

  useEffect(() => {
    setExpandedIds(
      new Set(
        accounts
          .filter(
            (account) => account.IsGroup && account.ParentAccountId == null,
          )
          .map((account) => account.Id),
      ),
    );
  }, [accounts]);

  const toggleNode = (id: number) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expandAll = () =>
    setExpandedIds(
      new Set(
        accounts
          .filter((account) => account.IsGroup)
          .map((account) => account.Id),
      ),
    );
  const collapseAll = () => setExpandedIds(new Set());
  const visibleCount = countTreeNodes(tree);
  const forceExpanded = Boolean(search.trim());

  return (
    <>
      <PageTitle
        eyebrow="الإدارة المالية"
        title="دليل الحسابات"
        description="إدارة الحسابات المالية وتصنيف الإيرادات والمصروفات."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> إضافة حساب
          </button>
        }
      />
      <section className="account-stats-grid">
        <article className="account-stat-card">
          <span className="account-stat-icon">
            <FolderTree size={18} />
          </span>
          <div>
            <small>إجمالي الحسابات</small>
            <strong>{allAccounts.length}</strong>
          </div>
        </article>
        <article className="account-stat-card">
          <span className="account-stat-icon income">
            <Wallet size={18} />
          </span>
          <div>
            <small>حسابات الإيرادات</small>
            <strong>{incomeCount}</strong>
          </div>
        </article>
        <article className="account-stat-card">
          <span className="account-stat-icon expense">
            <Wallet size={18} />
          </span>
          <div>
            <small>حسابات المصروفات</small>
            <strong>{expenseCount}</strong>
          </div>
        </article>
        <article className="account-stat-card">
          <span className="account-stat-icon status">
            <Power size={18} />
          </span>
          <div>
            <small>نشط / غير نشط</small>
            <strong>
              {activeCount} / {inactiveCount}
            </strong>
          </div>
        </article>
      </section>
      <section className="filter-panel account-filter-panel">
        <div className="search-field account-search-field">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بكود الحساب أو الاسم..."
          />
        </div>
        <div className="account-filter-controls">
          <div className="filter-row">
            {[
              ["ALL", "الكل"],
              ["INCOME", "الإيرادات"],
              ["EXPENSE", "المصروفات"],
              ["CASH_BANK", "النقدية والبنوك"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`filter-chip ${typeFilter === value ? "selected" : ""}`}
                onClick={() => setTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="account-inactive-toggle">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
            <span>عرض الحسابات غير النشطة</span>
          </label>
        </div>
      </section>
      <section className="members-section">
        <div className="list-heading account-tree-heading">
          <div>
            <h2>الحسابات حسب الهيكل</h2>
            <p>
              {visibleCount} حساب ظاهر من {allAccounts.length}
            </p>
          </div>
          <div className="account-tree-toolbar">
            <button className="text-link" type="button" onClick={expandAll}>
              توسيع الكل
            </button>
            <button className="text-link" type="button" onClick={collapseAll}>
              طي الكل
            </button>
            <button className="text-link" type="button" onClick={onRetry}>
              <RefreshCw size={13} /> تحديث
            </button>
          </div>
        </div>
        <div className="panel account-tree-panel">
          {loading && (
            <div className="empty-state">جاري تحميل دليل الحسابات...</div>
          )}
          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="button button-secondary" onClick={onRetry}>
                إعادة المحاولة
              </button>
            </div>
          )}
          {!loading && !error && tree.length === 0 && (
            <div className="empty-state">
              لا توجد حسابات مطابقة للبحث أو التصفية.
            </div>
          )}
          {!loading && !error && tree.length > 0 && (
            <div
              className="account-tree"
              role="tree"
              aria-label="الهيكل الشجري للحسابات"
            >
              {tree.map((node) => (
                <AccountTreeItem
                  key={node.account.Id}
                  node={node}
                  expandedIds={expandedIds}
                  forceExpanded={forceExpanded}
                  onToggle={toggleNode}
                  onView={onView}
                  onEdit={onEdit}
                  onDeactivate={onDeactivate}
                  onReactivate={onReactivate}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
