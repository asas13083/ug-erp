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
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import IssueVouchersListPage from './pages/IssueVouchersListPage';
import ReturnVouchersListPage from './pages/ReturnVouchersListPage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import ClientDetailPage from './pages/ClientDetailPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import BackupPage from './pages/BackupPage';
import DamagedItemsPage from './pages/DamagedItemsPage';
import PeriodReportPage from './pages/PeriodReportPage';
import ProfilePage from './pages/ProfilePage';
import StockTransferPage from './pages/StockTransferPage';
import StockCountPage from './pages/StockCountPage';
import AccountsPage from './pages/AccountsPage';
import EventCostDetailPage from './pages/EventCostDetailPage';
import AccountsComparisonPage from './pages/AccountsComparisonPage';
import EventPurposesPage from './pages/EventPurposesPage';
import EventCostItemTemplatesPage from './pages/EventCostItemTemplatesPage';
import LogsPage from './pages/LogsPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import EventsCalendarPage from './pages/EventsCalendarPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import TrashPage from './pages/TrashPage';
import CustodyTransferPage from './pages/CustodyTransferPage';
import CustodyTransfersListPage from './pages/CustodyTransfersListPage';
import TransportLogPage from './pages/TransportLogPage';
import UserDetailPage from './pages/UserDetailPage';
import ItemDetailPage from './pages/ItemDetailPage';

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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="items" element={<ProtectedRoute module="items"><ItemsPage /></ProtectedRoute>} />
        <Route path="items/:id" element={<ProtectedRoute module="items"><ItemDetailPage /></ProtectedRoute>} />
        <Route path="warehouses" element={<ProtectedRoute module="warehouses"><WarehousesPage /></ProtectedRoute>} />
        <Route path="warehouses/:id" element={<ProtectedRoute module="warehouses"><WarehouseDetailPage /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute module="categories"><CategoriesPage /></ProtectedRoute>} />
        <Route path="accounts" element={<ProtectedRoute module="accounts"><AccountsPage /></ProtectedRoute>} />
        <Route path="accounts/comparison" element={<ProtectedRoute module="accounts"><AccountsComparisonPage /></ProtectedRoute>} />
        <Route path="accounts/:eventId" element={<ProtectedRoute module="accounts"><EventCostDetailPage /></ProtectedRoute>} />
        <Route path="event-purposes" element={<ProtectedRoute module="accounts" action="edit"><EventPurposesPage /></ProtectedRoute>} />
        <Route path="event-cost-item-templates" element={<ProtectedRoute module="accounts" action="edit"><EventCostItemTemplatesPage /></ProtectedRoute>} />
        <Route path="stock-transfer" element={<ProtectedRoute module="warehouses" action="edit"><StockTransferPage /></ProtectedRoute>} />
        <Route path="stock-count" element={<ProtectedRoute module="warehouses" action="edit"><StockCountPage /></ProtectedRoute>} />
        <Route path="categories/:id" element={<ProtectedRoute module="categories"><CategoryDetailPage /></ProtectedRoute>} />
        <Route path="clients" element={<ProtectedRoute module="clients"><ClientsPage /></ProtectedRoute>} />
        <Route path="clients/:id" element={<ProtectedRoute module="clients"><ClientDetailPage /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute module="events"><EventsPage /></ProtectedRoute>} />
        <Route path="events-calendar" element={<ProtectedRoute module="events"><EventsCalendarPage /></ProtectedRoute>} />
        <Route path="events/:id" element={<ProtectedRoute module="events"><EventDetailPage /></ProtectedRoute>} />
        <Route path="issue" element={<ProtectedRoute module="issueVouchers" action="create"><IssueVoucherPage /></ProtectedRoute>} />
        <Route path="issue-vouchers-log" element={<ProtectedRoute module="issueVouchers"><IssueVouchersListPage /></ProtectedRoute>} />
        <Route path="return" element={<ProtectedRoute module="returnVouchers" action="create"><ReturnVoucherPage /></ProtectedRoute>} />
        <Route path="return-vouchers-log" element={<ProtectedRoute module="returnVouchers"><ReturnVouchersListPage /></ProtectedRoute>} />
        <Route path="loss" element={<ProtectedRoute module="lossRecords"><LossPage /></ProtectedRoute>} />
        <Route path="damaged" element={<ProtectedRoute module="damagedItems"><DamagedItemsPage /></ProtectedRoute>} />
        <Route path="custody-transfer" element={<ProtectedRoute module="custodyTransfers" action="create"><CustodyTransferPage /></ProtectedRoute>} />
        <Route path="custody-transfers-log" element={<ProtectedRoute module="custodyTransfers"><CustodyTransfersListPage /></ProtectedRoute>} />
        <Route path="transport-log" element={<ProtectedRoute module="issueVouchers"><TransportLogPage /></ProtectedRoute>} />
        <Route path="log" element={<ProtectedRoute module="activityLog"><ActivityLogPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
        <Route path="period-report" element={<ProtectedRoute module="reports"><PeriodReportPage /></ProtectedRoute>} />
        <Route path="email-notifications" element={<ProtectedRoute module="emailNotifications"><EmailNotificationsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute module="users"><UsersPage /></ProtectedRoute>} />
        <Route path="users/:id" element={<ProtectedRoute module="users"><UserDetailPage /></ProtectedRoute>} />
        <Route path="roles" element={<ProtectedRoute module="users"><RolesPage /></ProtectedRoute>} />
        <Route path="backups" element={<ProtectedRoute module="settings"><BackupPage /></ProtectedRoute>} />
        <Route path="logs" element={<ProtectedRoute module="settings"><LogsPage /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute module="suppliers"><SuppliersPage /></ProtectedRoute>} />
        <Route path="suppliers/:id" element={<ProtectedRoute module="suppliers"><SupplierDetailPage /></ProtectedRoute>} />
        <Route path="company-settings" element={<ProtectedRoute module="settings"><CompanySettingsPage /></ProtectedRoute>} />
        <Route path="trash" element={<ProtectedRoute module="settings"><TrashPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
