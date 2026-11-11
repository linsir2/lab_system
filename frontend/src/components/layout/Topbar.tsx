interface TopbarProps {
  breadcrumb: string;
  title: string;
  subtitle: string;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export default function Topbar({ breadcrumb, title, subtitle }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-text">
        <p className="breadcrumb">{breadcrumb}</p>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      <div className="topbar-status">
        <span className="status-pill">
          <i />
          系统运行正常
        </span>
        <span className="today">{todayLabel()}</span>
      </div>
    </header>
  );
}
