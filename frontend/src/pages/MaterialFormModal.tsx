import { useState } from 'react';
import type { FormEvent } from 'react';

import { createMaterial, updateMaterial } from '../api/materials';
import ErrorBanner from '../components/ui/ErrorBanner';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import { useMutation } from '../hooks/useMutation';
import type { Material } from '../types';

interface MaterialFormModalProps {
  open: boolean;
  initial: Material | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function MaterialFormModal({ open, initial, onClose, onSaved }: MaterialFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 0));
  const [fieldError, setFieldError] = useState<string | null>(null);

  const create = useMutation(createMaterial);
  const update = useMutation(updateMaterial);
  const submitting = create.submitting || update.submitting;
  const mutationError = create.error ?? update.error;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(quantity);
    if (!name.trim()) {
      setFieldError('请输入物资名称');
      return;
    }
    if (!Number.isInteger(parsed) || parsed < 0) {
      setFieldError('库存必须是不小于 0 的整数');
      return;
    }
    setFieldError(null);
    const body = { name: name.trim(), quantity: parsed };
    const result = initial ? await update.run(initial.id, body) : await create.run(body);
    if (result) {
      onSaved();
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? '编辑物资' : '新建物资'}
      subtitle={initial ? `物资 ID：${initial.id}` : '填写物资名称与当前库存'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
            取消
          </button>
          <button type="submit" form="material-form" className="btn primary" disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <form id="material-form" className="form-grid" onSubmit={submit}>
        {mutationError ? <ErrorBanner message={mutationError} /> : null}
        <FormField label="物资名称" htmlFor="material-name" error={fieldError}>
          <input
            id="material-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：示波器"
            autoFocus
          />
        </FormField>
        <FormField label="当前库存" htmlFor="material-quantity" hint="库存为管理员维护的绝对值">
          <input
            id="material-quantity"
            className="input"
            type="number"
            min={0}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
