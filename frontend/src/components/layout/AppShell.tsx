import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_META: Record<string, { breadcrumb: string; title: string; subtitle: string }> = {
  '/': {
    breadcrumb: '工作台 / 总览',
    title: '实验室资源总览',
    subtitle: '查看人员、物资与借用情况',
  },
  '/persons': {
    breadcrumb: '工作台 / 人员管理',
    title: '人员管理',
    subtitle: '维护实验室人员与角色状态',
  },
  '/materials': {
    breadcrumb: '工作台 / 物资管理',
    title: '物资管理',
    subtitle: '维护物资名称与当前库存',
  },
  '/borrows': {
    breadcrumb: '工作台 / 借用记录',
    title: '借用记录',
    subtitle: '查看、创建、归还与取消借用',
  },
};

export default function AppShell() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] ?? {
    breadcrumb: '工作台',
    title: '页面不存在',
    subtitle: '请从左侧导航选择一个页面',
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar {...meta} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
