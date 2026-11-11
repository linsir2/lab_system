import BorrowStatusBadge from '../components/ui/BorrowStatusBadge';
import ErrorBanner from '../components/ui/ErrorBanner';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import type { BorrowDetail } from '../types';
import { formatDateTime } from '../utils/date';
import { personRoleLabel } from '../utils/labels';

interface BorrowDetailModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: BorrowDetail | null;
  onClose: () => void;
}

export default function BorrowDetailModal({
  open,
  loading,
  error,
  detail,
  onClose,
}: BorrowDetailModalProps) {
  return (
    <Modal
      open={open}
      title="借用详情"
      subtitle={detail ? `借用 ID：${detail.borrow.id}` : undefined}
      onClose={onClose}
      width={560}
      footer={
        <button type="button" className="btn ghost" onClick={onClose}>
          关闭
        </button>
      }
    >
      {loading ? <Spinner label="正在加载详情" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {detail ? (
        <div className="detail-grid">
          <div className="detail-item">
            <span>借用人</span>
            <strong>
              {detail.person.deleted ? '已删除人员' : detail.person.name}
              {detail.person.role && !detail.person.deleted ? (
                <em>（{personRoleLabel(detail.person.role)}）</em>
              ) : null}
            </strong>
          </div>
          <div className="detail-item">
            <span>物资</span>
            <strong>{detail.material.deleted ? '已删除物资' : detail.material.name}</strong>
          </div>
          <div className="detail-item">
            <span>数量</span>
            <strong>{detail.borrow.quantity}</strong>
          </div>
          <div className="detail-item">
            <span>状态</span>
            <strong>
              <BorrowStatusBadge borrow={detail.borrow} />
            </strong>
          </div>
          <div className="detail-item">
            <span>借出时间</span>
            <strong>{formatDateTime(detail.borrow.borrowTime)}</strong>
          </div>
          <div className="detail-item">
            <span>应还时间</span>
            <strong>{formatDateTime(detail.borrow.dueTime)}</strong>
          </div>
          <div className="detail-item">
            <span>归还时间</span>
            <strong>{formatDateTime(detail.borrow.returnTime)}</strong>
          </div>
          <div className="detail-item">
            <span>逾期天数</span>
            <strong>{detail.overdueDays} 天</strong>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
