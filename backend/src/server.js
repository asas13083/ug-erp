require('dotenv').config();
const app = require('./app');
const { startEmailQueueWorker } = require('./services/emailService');
const { startBackupScheduler } = require('./services/backupService');
const { startReportEmailScheduler } = require('./services/reportEmailService');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n✓ UG Production House ERP — Backend شغّال على البورت ${PORT}`);
  console.log(`✓ البيئة: ${process.env.NODE_ENV || 'development'}\n`);
  startEmailQueueWorker();
  startBackupScheduler();
  startReportEmailScheduler();
});
