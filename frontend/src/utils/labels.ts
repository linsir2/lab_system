import type { BorrowStatus, PersonRole, PersonStatus } from '../types';

export const PERSON_ROLE_LABEL: Record<PersonRole, string> = {
  STUDENT: '学生',
  TEACHER: '教师',
  STAFF: '职员',
  ADMIN: '管理员',
  VISITOR: '访客',
};

export const PERSON_STATUS_LABEL: Record<PersonStatus, string> = {
  ACTIVE: '正常',
  INACTIVE: '停用',
};

export const BORROW_STATUS_LABEL: Record<BorrowStatus, string> = {
  BORROWED: '借用中',
  RETURNED: '已归还',
  CANCELLED: '已取消',
};

export function personRoleLabel(role: PersonRole): string {
  return PERSON_ROLE_LABEL[role] ?? role;
}

export function personStatusLabel(status: PersonStatus): string {
  return PERSON_STATUS_LABEL[status] ?? status;
}

export function borrowStatusLabel(status: BorrowStatus): string {
  return BORROW_STATUS_LABEL[status] ?? status;
}
