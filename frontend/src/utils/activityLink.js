// نوع العنصر في سجل الحركة → المسار اللي يودّيك لمكانه في البرنامج (لو متاح)
export function resolveActivityLink(log) {
  const { entityType, entityId } = log;
  switch (entityType) {
    case 'Item': return '/items';
    case 'Category': return `/categories/${entityId}`;
    case 'Warehouse': return `/warehouses/${entityId}`;
    case 'Client': return `/clients/${entityId}`;
    case 'Event': return `/events/${entityId}`;
    case 'IssueVoucher': return '/issue-vouchers-log';
    case 'ReturnVoucher': return '/return-vouchers-log';
    case 'CustodyTransfer': return '/custody-transfers-log';
    case 'LossRecord': return '/loss';
    case 'EmailRecipient': return '/email-notifications';
    case 'Role': return '/roles';
    default: return null;
  }
}
