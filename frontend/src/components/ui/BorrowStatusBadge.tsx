import type { Borrow } from '../../types';
import { isOverdue } from '../../utils/aggregate';
import { borrowStatusLabel } from '../../utils/labels';
import StatusBadge from './StatusBadge';

export default function BorrowStatusBadge({ borrow }: { borrow: Borrow }) {
  if (isOverdue(borrow)) {
    return <StatusBadge tone="red">已逾期</StatusBadge>;
  }
  if (borrow.status === 'BORROWED') {
    return <StatusBadge tone="amber">{borrowStatusLabel(borrow.status)}</StatusBadge>;
  }
  if (borrow.status === 'RETURNED') {
    return <StatusBadge tone="green">{borrowStatusLabel(borrow.status)}</StatusBadge>;
  }
  return <StatusBadge tone="gray">{borrowStatusLabel(borrow.status)}</StatusBadge>;
}
