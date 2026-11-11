import { Link, Route, Routes } from 'react-router-dom';

import AppShell from './components/layout/AppShell';
import BorrowsPage from './pages/BorrowsPage';
import MaterialsPage from './pages/MaterialsPage';
import OverviewPage from './pages/OverviewPage';
import PersonsPage from './pages/PersonsPage';

function NotFoundPage() {
  return (
    <section className="panel">
      <div className="empty-state">
        <span className="empty-dot" />
        <p>页面不存在</p>
        <Link className="panel-link" to="/">
          返回总览
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="persons" element={<PersonsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="borrows" element={<BorrowsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
