import type { ReactNode } from 'react';

interface MetricCardProps {
  accent: 'blue' | 'purple' | 'orange' | 'green';
  icon: ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  hint: ReactNode;
}

export default function MetricCard({ accent, icon, label, value, unit, hint }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span className={`metric-icon ${accent}`}>{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <p className="metric-value">
        {value}
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </p>
      <p className="metric-hint">{hint}</p>
    </article>
  );
}
