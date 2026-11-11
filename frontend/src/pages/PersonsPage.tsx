import { useMemo, useState } from 'react';

import { deletePerson, listPersons } from '../api/persons';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { useResource } from '../hooks/useResource';
import type { Person, PersonRole, PersonStatus } from '../types';
import { PERSON_ROLE_LABEL, PERSON_STATUS_LABEL, personRoleLabel, personStatusLabel } from '../utils/labels';
import PersonFormModal from './PersonFormModal';

const ROLES = Object.keys(PERSON_ROLE_LABEL) as PersonRole[];
const STATUSES = Object.keys(PERSON_STATUS_LABEL) as PersonStatus[];

export default function PersonsPage() {
  const [role, setRole] = useState<PersonRole | ''>('');
  const [status, setStatus] = useState<PersonStatus | ''>('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload } = useResource(
    () => listPersons({ role: role || undefined, status: status || undefined }),
    [role, status],
  );

  const rows = useMemo(() => {
    const list = data ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return list;
    }
    return list.filter((person) => person.name.toLowerCase().includes(normalized));
  }, [data, keyword]);

  const columns: Column<Person>[] = [
    { key: 'id', header: 'ID', width: '80px', render: (person) => person.id },
    { key: 'name', header: '姓名', render: (person) => <span className="name-cell">{person.name}</span> },
    { key: 'role', header: '角色', render: (person) => personRoleLabel(person.role) },
    {
      key: 'status',
      header: '状态',
      render: (person) => (
        <StatusBadge tone={person.status === 'ACTIVE' ? 'green' : 'gray'}>
          {personStatusLabel(person.status)}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      render: (person) => (
        <div className="cell-actions">
          <button type="button" className="link-button" onClick={() => setEditing(person)}>
            编辑
          </button>
          <button type="button" className="link-button danger" onClick={() => setDeleting(person)}>
            删除
          </button>
        </div>
      ),
    },
  ];

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deletePerson(deleting.id);
      setDeleting(null);
      reload();
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : '删除失败');
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError(null);
  };

  return (
    <section className="panel">
      <div className="page-toolbar">
        <div className="filters">
          <input
            className="input search"
            placeholder="搜索姓名"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value as PersonRole | '')}
            aria-label="按角色筛选"
          >
            <option value="">全部角色</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {PERSON_ROLE_LABEL[value]}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as PersonStatus | '')}
            aria-label="按状态筛选"
          >
            <option value="">全部状态</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {PERSON_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn primary" onClick={() => setEditing(null)}>
          新建人员
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <Spinner label="正在加载人员" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(person) => person.id}
          emptyText="没有符合条件的人员"
        />
      )}

      {editing !== undefined ? (
        <PersonFormModal
          open
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="删除人员"
        message={`确定删除「${deleting?.name ?? ''}」吗？若存在未归还借用，网关会拒绝删除。`}
        confirmText="删除"
        submitting={deleteBusy}
        error={deleteError}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
