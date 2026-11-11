import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    to: '/',
    label: '总览',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
  },
  {
    to: '/persons',
    label: '人员管理',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </>
    ),
  },
  {
    to: '/materials',
    label: '物资管理',
    icon: (
      <>
        <rect x="4" y="7" width="16" height="14" rx="3" />
        <path d="M8 7V4h8v3M9 13h6M9 17h6" />
      </>
    ),
  },
  {
    to: '/borrows',
    label: '借用记录',
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 12h7M9 16h7" />
      </>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 18v-7h4v7m4 0V6h4v12m4 0v-4h3v4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>
          <strong>LabFlow</strong>
          <small>实验室资源管理</small>
        </span>
      </div>

      <p className="nav-caption">工作台</p>
      <nav className="nav" aria-label="主导航">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="avatar">管</span>
        <span>
          <strong>实验室管理员</strong>
          <small>系统管理</small>
        </span>
      </div>
    </aside>
  );
}
