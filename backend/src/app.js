const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFoundHandler } = require('./utils/errors');

const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const eventRoutes = require('./routes/event.routes');
const issueVoucherRoutes = require('./routes/issueVoucher.routes');
const returnVoucherRoutes = require('./routes/returnVoucher.routes');
const custodyTransferRoutes = require('./routes/custodyTransfer.routes');
const transportLogRoutes = require('./routes/transportLog.routes');
const lossRecordRoutes = require('./routes/lossRecord.routes');
const stockTransferRoutes = require('./routes/stockTransfer.routes');
const stockCountRoutes = require('./routes/stockCount.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const uploadRoutes = require('./routes/upload.routes');
const reportsRoutes = require('./routes/reports.routes');
const rolesRoutes = require('./routes/roles.routes');
const backupRoutes = require('./routes/backup.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const emailReportsRoutes = require('./routes/emailReports.routes');
const searchRoutes = require('./routes/search.routes');
const companySettingsRoutes = require('./routes/companySettings.routes');
const { categoryRouter, clientRouter, supplierRouter, emailRecipientRouter, eventPurposeRouter, eventCostItemTemplateRouter } = require('./routes/simple.routes');
const eventCostRoutes = require('./routes/eventCost.routes');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // معطّل جزئياً عشان صور اللوجو تتحمل في تبويبات تانية
// ملحوظة أمان مهمة: مينفعش نستخدم origin: '*' مع credentials:true — المتصفح
// بيرفض أي طلب فيه كوكيز لو الـorigin مفتوح للكل، فلازم نحدد رابط الفرونت
// إند بالظبط دايماً (من .env)، ولو مش متحدد بنستخدم localhost كافتراضي وقت التطوير بس
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
// سجل كل طلب HTTP بيوصل للسيرفر — بيتسجل في نفس ملفات السجل المنظّم (combined.log)
// عشان لو حصلت مشكلة، تقدر تشوف "السياق" اللي حصلت فيه (مين طلب إيه قبلها بالظبط)
app.use(
  morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// تقديم ملفات الرفع (صور الأصناف/العملاء/المستخدمين) — محمي بتسجيل الدخول،
// مش متاح لأي حد على الإنترنت يعرف أو يخمّن اسم الملف. المتصفح بيبعت الكوكيز
// تلقائياً مع أي طلب صورة <img>، فمفيش أي تغيير محتاج في الفرونت إند
const { requireAuth: requireAuthForUploads } = require('./middleware/auth');
app.use(
  '/uploads',
  requireAuthForUploads,
  express.static(path.join(__dirname, '../uploads'), {
    dotfiles: 'deny', // يمنع الوصول لأي ملف مخفي زي .gitkeep بالغلط
  })
);

// حماية من محاولات تسجيل الدخول المتكررة (Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10,
  message: { success: false, message: 'محاولات دخول كثيرة جداً، حاول مرة أخرى بعد 15 دقيقة' },
});
app.use('/api/auth/login', loginLimiter);

// حد عام لباقي الـAPI — يمنع أي استخدام مفرط (تصدير PDF/Excel بشكل متكرر، سكريبتات...)
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 دقايق
  max: 300, // 300 طلب لكل مستخدم/IP كل 5 دقايق — سخي بما يكفي للاستخدام العادي
  message: { success: false, message: 'عدد طلبات كبير جداً في وقت قصير، حاول تاني بعد شوية' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// فحص صحة السيرفر (يُستخدم لمراقبة الاستضافة)
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/categories', categoryRouter);
app.use('/api/clients', clientRouter);
app.use('/api/supplier-deliveries', require('./routes/supplierDelivery.routes'));
app.use('/api/suppliers', require('./routes/supplierProfile.routes'));
app.use('/api/suppliers', supplierRouter);
app.use('/api/email-recipients', emailRecipientRouter);
app.use('/api/event-purposes', eventPurposeRouter);
app.use('/api/event-cost-item-templates', eventCostItemTemplateRouter);
app.use('/api/event-costs', eventCostRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/issue-vouchers', issueVoucherRoutes);
app.use('/api/return-vouchers', returnVoucherRoutes);
app.use('/api/custody-transfers', custodyTransferRoutes);
app.use('/api/transport-log', transportLogRoutes);
app.use('/api/loss-records', lossRecordRoutes);
app.use('/api/stock-transfers', stockTransferRoutes);
app.use('/api/stock-counts', stockCountRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/logs', require('./routes/logs.routes'));
app.use('/api/notifications', notificationsRoutes);
app.use('/api/email-reports', emailReportsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/company-settings', companySettingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
