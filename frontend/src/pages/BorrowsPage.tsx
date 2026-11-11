import { useEffect, useMemo, useState } from 'react';

import {
  cancelBorrow,
  getBorrowDetail,
  listBorrows,
  returnBorrow,
} from '../api/borrows';
import { listMaterials } from '../api/materials';
import { listPersons } from '../api/persons';
import BorrowStatusBadge from '../components/ui/BorrowStatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import ErrorBanner from '../components/ui/ErrorBanner';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import { useResource } from '../hooks/useResource';
import type { Borrow, BorrowDetail, BorrowStatus } from '../types';
import { formatDate, formatDateTime } from '../utils/date';
import { BORROW_STATUS_LABEL } from '../utils/labels';
import BorrowDetailModal from './BorrowDetailModal';
import BorrowFormModal from './BorrowFormModal';

const PAGE_SIZE = 10;
const STATUSES = Object.keys(BORROW_STATUS_LABEL) as BorrowStatus[];

type PendingAction = { borrow: Borrow; action: 'return' | 'cancel' } | null;

export default function BorrowsPage() {
  const [personFilter, setPersonFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    open: boolean;
    loading: boolean;
    error: string | null;
    data: BorrowDetail | null;
  }>({ open: false, loading: false, error: null, data: null });

  const { data, loading, error, reload } = useResource(async () => {
    const [persons, materials, borrows] = await Promise.all([
      listPersons(),
      listMaterials(),
      listBorrows({
        personId: personFilter ? Number(personFilter) : undefined,
        materialId: materialFilter ? Number(materialFilter) : undefined,
        status: statusFilter || undefined,
      }),
    ]);
    return { persons, materials, borrows };
  }, [personFilter, materialFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [personFilter, materialFilter, statusFilter]);

  const personById = useMemo(
    () => new Map((data?.persons ?? []).map((person) => [person.id, person])),
    [data],
  );
  const materialById = useMemo(
    () => new Map((data?.materials ?? []).map((material) => [material.id, material])),
    [data],
  );

  const borrows = data?.borrows ?? [];
  const pageCount = Math.max(1, Math.ceil(borrows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = borrows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const openDetail = async (id: number) => {
    setDetail({ open: true, loading: true, error: null, data: null });
    try {
      const result = await getBorrowDetail(id);
      setDetail({ open: true, loading: false, error: null, data: result });
    } catch (reason) {
      setDetail({
        open: true,
        loading: false,
        error: reason instanceof Error ? reason.message : '详情加载失败',
        data: null,
      });
    }
  };

  const confirmAction = async () => {
    if (!pending) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      if (pending.action === 'return') {
        await returnBorrow(pending.borrow.id);
      } else {
        await cancelBorrow(pending.borrow.id);
      }
      setPending(null);
      reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '操作失败');
    } finally {
      setActionBusy(false);
    }
  };

  const columns: Column<Borrow>[] = [
    { key: 'id', header: 'ID', width: '70px', render: (borrow) => borrow.id },
    {
      key: 'person',
      header: '借用人',
      render: (borrow) => personById.get(borrow.personId)?.name ?? '已删除人员',
    },
    {
      key: 'material',
      header: '物资',
      render: (borrow) => materialById.get(borrow.materialId)?.name ?? '已删除物资',
    },
    { key: 'quantity', header: '数量', render: (borrow) => borrow.quantity },
    { key: 'borrowTime', header: '借出时间', render: (borrow) => formatDateTime(borrow.borrowTime) },
    { key: 'dueTime', header: '应还日期', render: (borrow) => formatDate(borrow.dueTime) },
    { key: 'status', header: '状态', render: (borrow) => <BorrowStatusBadge borrow={borrow} /> },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      render: (borrow) => (
        <div className="cell-actions">
          <button type="button" className="link-button" onClick={() => openDetail(borrow.id)}>
            详情
          </button>
          {borrow.status === 'BORROWED' ? (
            <>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setActionError(null);
                  setPending({ borrow, action: 'return' });
                }}
              >
                归还
              </button>
              <button
                type="button"
                className="link-button danger"
                onClick={() => {
                  setActionError(null);
                  setPending({ borrow, action: 'cancel' });
                }}
              >
                取消
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="panel">
      <div className="page-toolbar">
        <div className="filters">
          <select
            className="select"
            value={personFilter}
            onChange={(event) => setPersonFilter(event.target.value)}
            aria-label="按人员筛选"
          >
            <option value="">全部人员</option>
            {(data?.persons ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={materialFilter}
            onChange={(event) => setMaterialFilter(event.target.value)}
            aria-label="按物资筛选"
          >
            <option value="">全部物资</option>
            {(data?.materials ?? []).map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BorrowStatus | '')}
            aria-label="按状态筛选"
          >
            <option value="">全部状态</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {BORROW_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => setCreating(true)}
          disabled={loading || !data}
        >
          新建借用
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <Spinner label="正在加载借用记录" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(borrow) => borrow.id}
            emptyText="没有符合条件的借用记录"
          />
          <Pagination
            page={current}
            pageSize={PAGE_SIZE}
            total={borrows.length}
            onChange={setPage}
          />
        </>
      )}

      {data && creating ? (
        <BorrowFormModal
          open
          persons={data.persons}
          materials={data.materials}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      ) : null}

      <BorrowDetailModal
        open={detail.open}
        loading={detail.loading}
        error={detail.error}
        detail={detail.data}
        onClose={() => setDetail({ open: false, loading: false, error: null, data: null })}
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending?.action === 'return' ? '归还借用' : '取消借用'}
        message={
          pending?.action === 'return'
            ? `确认归还「${materialById.get(pending.borrow.materialId)?.name ?? ''}」${pending.borrow.quantity} 件吗？`
            : `确认取消这条借用吗？取消后会恢复库存。`
        }
        confirmText={pending?.action === 'return' ? '确认归还' : '确认取消'}
        danger={pending?.action === 'cancel'}
        submitting={actionBusy}
        error={actionError}
        onCancel={() => {
          setPending(null);
          setActionError(null);
        }}
        onConfirm={confirmAction}
      />
    </section>
  );
}
