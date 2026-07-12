import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import WarehousesPage from './pages/WarehousesPage';
import EventsPage from './pages/EventsPage';
import IssueVoucherPage from './pages/IssueVoucherPage';
import ReturnVoucherPage from './pages/ReturnVoucherPage';
import LossPage from './pages/LossPage';
import ActivityLogPage from './pages/ActivityLogPage';
import CategoriesPage from './pages/CategoriesPage';
import ClientsPage from './pages/ClientsPage';
import ReportsPage from './pages/ReportsPage';
import EmailNotificationsPage from './pages/EmailNotificationsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route
          path="issue"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STORE_KEEPER']}>
              <IssueVoucherPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="return"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STORE_KEEPER']}>
              <ReturnVoucherPage />
            </ProtectedRoute>
          }
        />
        <Route path="loss" element={<LossPage />} />
        <Route path="log" element={<ActivityLogPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="email-notifications"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <EmailNotificationsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
