const pad = (value: number) => String(value).padStart(2, '0');

function parse(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) {
    return '—';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) {
    return '—';
  }
  return `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

export function isToday(iso: string | null | undefined, now: Date = new Date()): boolean {
  const date = parse(iso);
  if (!date) {
    return false;
  }
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function toLocalDateTimeInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
