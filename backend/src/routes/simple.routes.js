const buildCrudRouter = require('../utils/buildCrudRouter');

const categoryRouter = buildCrudRouter('category', 'تصنيف', { searchFields: ['name'], module: 'categories', entityType: 'Category', openListToAnyUser: true });
const clientRouter = buildCrudRouter('client', 'عميل', {
  searchFields: ['name', 'company', 'phone'],
  module: 'clients',
  entityType: 'Client',
  include: { events: { orderBy: { startDate: 'desc' } } },
  openListToAnyUser: true,
});
const supplierRouter = buildCrudRouter('supplier', 'مورد', { searchFields: ['name', 'company'], module: 'suppliers', entityType: 'Supplier', openListToAnyUser: true });
const emailRecipientRouter = buildCrudRouter('emailRecipient', 'مستقبِل إيميل', {
  searchFields: ['name', 'email'],
  module: 'emailNotifications',
  entityType: 'EmailRecipient',
});
const eventPurposeRouter = buildCrudRouter('eventPurpose', 'غرض', { searchFields: ['name'], module: 'accounts', entityType: 'EventPurpose' });
const eventCostItemTemplateRouter = buildCrudRouter('eventCostItemTemplate', 'اسم بند', { searchFields: ['name'], module: 'accounts', entityType: 'EventCostItemTemplate' });

module.exports = { categoryRouter, clientRouter, supplierRouter, emailRecipientRouter, eventPurposeRouter, eventCostItemTemplateRouter };
