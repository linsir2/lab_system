import { useMemo, useState } from 'react';

import { deleteMaterial, listMaterials } from '../api/materials';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import { useResource } from '../hooks/useResource';
import type { Material } from '../types';
import MaterialFormModal from './MaterialFormModal';

export default function MaterialsPage() {
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<Material | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload } = useResource(() => listMaterials(), []);

  const rows = useMemo(() => {
    const list = data ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return list;
    }
    return list.filter((material) => material.name.toLowerCase().includes(normalized));
  }, [data, keyword]);

  const columns: Column<Material>[] = [
    { key: 'id', header: 'ID', width: '80px', render: (material) => material.id },
    { key: 'name', header: '名称', render: (material) => <span className="name-cell">{material.name}</span> },
    { key: 'quantity', header: '当前库存', render: (material) => material.quantity },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      render: (material) => (
        <div className="cell-actions">
          <button type="button" className="link-button" onClick={() => setEditing(material)}>
            编辑
          </button>
          <button type="button" className="link-button danger" onClick={() => setDeleting(material)}>
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
      await deleteMaterial(deleting.id);
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
            placeholder="搜索物资名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <button type="button" className="btn primary" onClick={() => setEditing(null)}>
          新建物资
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <Spinner label="正在加载物资" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(material) => material.id}
          emptyText="暂无物资"
        />
      )}

      {editing !== undefined ? (
        <MaterialFormModal
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
        title="删除物资"
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
