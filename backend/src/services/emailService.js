const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');

const LOGO_PATH = path.join(__dirname, '../assets/ug-logo.jpg');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS بيتفعل تلقائياً على بورت 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: {
      // برامج حماية زي Kaspersky/Avast بتستبدل شهادة الأمان بشهادة بتاعتها هي
      // وقت فحص الاتصال المشفر، فالتحقق الصارم بيفشل. تعطيله هنا دايماً
      // (بدل الاعتماد على متغير بيئة ممكن يتنسى) بيحل المشكلة تلقائياً.
      rejectUnauthorized: false,
    },
  });
  return transporter;
}

const MAX_ATTEMPTS = 5;

/**
 * تفحص طابور الإيميل (EmailQueue) وتحاول ترسل أي رسالة PENDING.
 * لو فشلت (مفيش نت مثلاً)، بتزود عداد المحاولات وتسيبها PENDING لحد
 * ما توصل الحد الأقصى، وقتها بتتحول لـ FAILED.
 */
async function processEmailQueue() {
  const pending = await prisma.emailQueue.findMany({
    where: { status: 'PENDING' },
    take: 20, // ندفعة صغيرة كل مرة عشان منحملش السيرفر
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) return;

  const recipients = await prisma.emailRecipient.findMany({ where: { isActive: true, deletedAt: null } });
  const toList = recipients.map((r) => r.email);

  if (toList.length === 0) return; // مفيش مستقبلين، سيبها في الطابور لحد ما يتضاف حد

  for (const mail of pending) {
    try {
      const attachments = [{ filename: 'logo.jpg', path: LOGO_PATH, cid: 'uglogo' }];
      if (mail.reportType && mail.reportDate) {
        try {
          const { generateReportPdf } = require('./pdfService');
          const pdfBuffer = await generateReportPdf(mail.reportType, mail.reportDate);
          attachments.push({ filename: `تقرير-${mail.reportDate}.pdf`, content: pdfBuffer });
        } catch (pdfErr) {
          console.error('⚠️ تعذر توليد مرفق الـ PDF (هيتبعت الإيميل من غير مرفق):', pdfErr.message);
        }
      }

      await getTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to: toList.join(','),
        subject: mail.subject,
        html: mail.body,
        attachments,
      });
      await prisma.emailQueue.update({
        where: { id: mail.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      console.error(`❌ فشل إرسال الإيميل "${mail.subject}":`, err.message);
      const attempts = mail.attempts + 1;
      await prisma.emailQueue.update({
        where: { id: mail.id },
        data: {
          attempts,
          lastError: err.message,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        },
      });
    }
  }
}

/** تشغّل فحص الطابور كل فترة زمنية محددة (افتراضياً كل دقيقة) */
function startEmailQueueWorker() {
  const interval = Number(process.env.EMAIL_QUEUE_INTERVAL_MS) || 60000;
  setInterval(() => {
    processEmailQueue().catch((err) => console.error('خطأ في معالجة طابور الإيميل:', err.message));
  }, interval);
  console.log(`✓ خدمة إرسال الإيميل شغّالة (فحص كل ${interval / 1000} ثانية)`);
}

module.exports = { processEmailQueue, startEmailQueueWorker };
