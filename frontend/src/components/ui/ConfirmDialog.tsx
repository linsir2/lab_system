import ErrorBanner from './ErrorBanner';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  danger = true,
  submitting = false,
  error = null,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
            取消
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? '处理中…' : confirmText}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
      {error ? <ErrorBanner message={error} /> : null}
    </Modal>
  );
}
