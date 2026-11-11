import { useState } from 'react';
import type { FormEvent } from 'react';

import { createPerson, updatePerson } from '../api/persons';
import ErrorBanner from '../components/ui/ErrorBanner';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import { useMutation } from '../hooks/useMutation';
import type { Person, PersonRole, PersonStatus } from '../types';
import { PERSON_ROLE_LABEL, PERSON_STATUS_LABEL } from '../utils/labels';

interface PersonFormModalProps {
  open: boolean;
  initial: Person | null;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES = Object.keys(PERSON_ROLE_LABEL) as PersonRole[];
const STATUSES = Object.keys(PERSON_STATUS_LABEL) as PersonStatus[];

export default function PersonFormModal({ open, initial, onClose, onSaved }: PersonFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<PersonRole>(initial?.role ?? 'STUDENT');
  const [status, setStatus] = useState<PersonStatus>(initial?.status ?? 'ACTIVE');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const create = useMutation(createPerson);
  const update = useMutation(updatePerson);
  const submitting = create.submitting || update.submitting;
  const mutationError = create.error ?? update.error;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFieldError('请输入姓名');
      return;
    }
    setFieldError(null);
    const body = { name: name.trim(), role, status };
    const result = initial ? await update.run(initial.id, body) : await create.run(body);
    if (result) {
      onSaved();
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? '编辑人员' : '新建人员'}
      subtitle={initial ? `人员 ID：${initial.id}` : '填写人员基础信息'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
            取消
          </button>
          <button type="submit" form="person-form" className="btn primary" disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <form id="person-form" className="form-grid" onSubmit={submit}>
        {mutationError ? <ErrorBanner message={mutationError} /> : null}
        <FormField label="姓名" htmlFor="person-name" error={fieldError}>
          <input
            id="person-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：张三"
            autoFocus
          />
        </FormField>
        <div className="form-row">
          <FormField label="角色" htmlFor="person-role">
            <select
              id="person-role"
              className="select"
              value={role}
              onChange={(event) => setRole(event.target.value as PersonRole)}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {PERSON_ROLE_LABEL[value]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="状态" htmlFor="person-status">
            <select
              id="person-status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as PersonStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PERSON_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
