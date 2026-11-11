import { useState } from 'react';
import type { FormEvent } from 'react';

import { createBorrow } from '../api/borrows';
import ErrorBanner from '../components/ui/ErrorBanner';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import { useMutation } from '../hooks/useMutation';
import type { Material, Person } from '../types';
import { toIsoFromLocal } from '../utils/date';

interface BorrowFormModalProps {
  open: boolean;
  persons: Person[];
  materials: Material[];
  onClose: () => void;
  onSaved: () => void;
}

export default function BorrowFormModal({
  open,
  persons,
  materials,
  onClose,
  onSaved,
}: BorrowFormModalProps) {
  const activePersons = persons.filter((person) => person.status === 'ACTIVE');
  const [personId, setPersonId] = useState(activePersons[0] ? String(activePersons[0].id) : '');
  const [materialId, setMaterialId] = useState(materials[0] ? String(materials[0].id) : '');
  const [quantity, setQuantity] = useState('1');
  const [dueTime, setDueTime] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation(createBorrow);
  const selectedMaterial = materials.find((material) => String(material.id) === materialId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!personId) {
      setFieldError('请选择借用人');
      return;
    }
    if (!materialId || !selectedMaterial) {
      setFieldError('请选择物资');
      return;
    }
    const parsedQuantity = Number(quantity);
    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > selectedMaterial.quantity
    ) {
      setFieldError(`数量必须是 1 到 ${selectedMaterial.quantity} 的整数`);
      return;
    }
    const due = new Date(dueTime);
    if (!dueTime || Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      setFieldError('应还时间必须晚于当前时间');
      return;
    }

    setFieldError(null);
    const result = await mutation.run({
      personId: Number(personId),
      materialId: Number(materialId),
      quantity: parsedQuantity,
      dueTime: toIsoFromLocal(dueTime),
    });
    if (result) {
      onSaved();
    }
  };

  return (
    <Modal
      open={open}
      title="新建借用"
      subtitle="借用成功后会自动扣减库存"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={mutation.submitting}>
            取消
          </button>
          <button type="submit" form="borrow-form" className="btn primary" disabled={mutation.submitting}>
            {mutation.submitting ? '创建中…' : '创建借用'}
          </button>
        </>
      }
    >
      <form id="borrow-form" className="form-grid" onSubmit={submit}>
        {mutation.error ? <ErrorBanner message={mutation.error} /> : null}
        <FormField label="借用人" htmlFor="borrow-person" error={fieldError}>
          <select
            id="borrow-person"
            className="select"
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
          >
            {activePersons.length === 0 ? <option value="">暂无可用人员</option> : null}
            {activePersons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="物资" htmlFor="borrow-material">
          <select
            id="borrow-material"
            className="select"
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
          >
            {materials.length === 0 ? <option value="">暂无物资</option> : null}
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}（库存 {material.quantity}）
              </option>
            ))}
          </select>
        </FormField>
        <div className="form-row">
          <FormField
            label="借用数量"
            htmlFor="borrow-quantity"
            hint={selectedMaterial ? `当前库存 ${selectedMaterial.quantity}` : undefined}
          >
            <input
              id="borrow-quantity"
              className="input"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </FormField>
          <FormField label="应还时间" htmlFor="borrow-due">
            <input
              id="borrow-due"
              className="input"
              type="datetime-local"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
