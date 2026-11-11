import { Link } from 'react-router-dom';

import { listBorrows } from '../api/borrows';
import { listMaterials } from '../api/materials';
import { listPersons } from '../api/persons';
import BorrowStatusBadge from '../components/ui/BorrowStatusBadge';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import MetricCard from '../components/ui/MetricCard';
import Spinner from '../components/ui/Spinner';
import { useResource } from '../hooks/useResource';
import type { RecentBorrowRow } from '../utils/aggregate';
import { buildOverview } from '../utils/aggregate';
import { formatDate } from '../utils/date';

const columns: Column<RecentBorrowRow>[] = [
  { key: 'person', header: '借用人', render: (row) => row.personName },
  { key: 'material', header: '物资名称', render: (row) => row.materialName },
  { key: 'quantity', header: '数量', render: (row) => row.borrow.quantity },
  { key: 'due', header: '应还日期', render: (row) => formatDate(row.borrow.dueTime) },
  { key: 'status', header: '状态', render: (row) => <BorrowStatusBadge borrow={row.borrow} /> },
];

export default function OverviewPage() {
  const { data, loading, error, reload } = useResource(async () => {
    const [persons, materials, borrows] = await Promise.all([
      listPersons(),
      listMaterials(),
      listBorrows(),
    ]);
    return { persons, materials, borrows };
  }, []);

  if (error) {
    return (
      <div>
        <ErrorBanner message={error} />
        <button type="button" className="btn ghost" onClick={reload}>
          重新加载
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return <Spinner label="正在加载总览" />;
  }

  const overview = buildOverview(data.persons, data.materials, data.borrows);
  const { metrics, recent, stockRows } = overview;

  return (
    <div>
      <section className="metric-grid">
        <MetricCard
          accent="blue"
          label="在册人员"
          value={metrics.personCount}
          unit="人"
          hint={<span className="metric-hint green">正常使用 {metrics.activePersonCount} 人</span>}
          icon={
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          }
        />
        <MetricCard
          accent="purple"
          label="物资种类"
          value={metrics.materialKinds}
          unit="类"
          hint={`库存总量 ${metrics.stockTotal} 件`}
          icon={
            <svg viewBox="0 0 24 24">
              <rect x="4" y="7" width="16" height="14" rx="3" />
              <path d="M8 7V4h8v3M9 13h6M9 17h6" />
            </svg>
          }
        />
        <MetricCard
          accent="orange"
          label="借用中"
          value={metrics.activeBorrows}
          unit="笔"
          hint={<span className="metric-hint amber">待归还记录</span>}
          icon={
            <svg viewBox="0 0 24 24">
              <rect x="5" y="4" width="14" height="17" rx="3" />
              <path d="M9 4V2h6v2M9 11h6M9 15h4" />
            </svg>
          }
        />
        <MetricCard
          accent="green"
          label="今日归还"
          value={metrics.returnedToday}
          unit="笔"
          hint="按时归还记录"
          icon={
            <svg viewBox="0 0 24 24">
              <path d="M4 12l5 5 11-12" />
            </svg>
          }
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">最近借用记录</h2>
            <Link className="panel-link" to="/borrows">
              查看全部 ›
            </Link>
          </div>
          <DataTable
            columns={columns}
            rows={recent}
            rowKey={(row) => row.borrow.id}
            emptyText="暂无借用记录"
          />
          <div className="pagination">
            <span>显示最近 5 条记录</span>
            <span>共 {data.borrows.length} 条</span>
          </div>
        </section>

        <div className="dashboard-right">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">库存概况</h2>
              <span className="panel-note">剩余库存</span>
            </div>
            {stockRows.length === 0 ? (
              <EmptyState text="暂无物资" />
            ) : (
              stockRows.map((row) => {
                const percent = row.total > 0 ? Math.round((row.quantity / row.total) * 100) : 0;
                return (
                  <div className="stock-row" key={row.id}>
                    <div className="stock-meta">
                      <span>{row.name}</span>
                      <span className="stock-value">
                        {row.quantity} <span>/ {row.total}</span>
                      </span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">系统说明</h2>
            </div>
            <ul className="note-list">
              <li>借用记录支持归还与取消</li>
              <li>有未归还记录时保护人员和物资</li>
              <li>库存随借出、归还自动更新</li>
            </ul>
            <hr className="note-divider" />
            <p className="note-foot">实验室资源管理系统 · LabFlow</p>
          </section>
        </div>
      </div>
    </div>
  );
}
