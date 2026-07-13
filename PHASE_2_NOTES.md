# UG Production House ERP — المرحلة 2: Backend

## إيه اللي اتبنى؟

Backend كامل (Express + Prisma + PostgreSQL) بمنطق حقيقي مش مجرد CRUD سطحي:

| الميزة | فين اتنفذت |
|---|---|
| تسجيل الدخول + صلاحيات الأدوار (JWT) | `middleware/auth.js`, `controllers/auth.controller.js` |
| خصم/إضافة المخزون بأمان | `services/stockService.js` |
| **منع تعارض حجز نفس الصنف لحفلتين متداخلتين** | `checkReservationConflict()` في `stockService.js` |
| إذن صرف (يخصم المخزون + يحرر الحجز تلقائياً) | `controllers/issueVoucher.controller.js` |
| إذن مرتجع (سليم/تالف/مفقود → فاقد تلقائي) | `controllers/returnVoucher.controller.js` |
| نقل بين المخازن | `controllers/stockTransfer.controller.js` |
| جرد دوري وتسوية الفروقات | `controllers/stockCount.controller.js` |
| سجل حركة تلقائي لكل عملية | `services/activityLogger.js` |
| طابور إيميل (Offline-safe) + إرسال دوري | `services/emailService.js` |
| لوحة تحكم مجمّعة (إحصائيات + تنبيهات نقص) | `controllers/dashboard.controller.js` |

كل الـ Routes محمية بـ JWT، وكل عملية كتابة محدد لها الأدوار المسموح لها (مثال: حذف صنف Admin/Manager بس، تسجيل الدخول مفتوح للكل).

## التشغيل محلياً (على جهازك، للتجربة الأولى)

```bash
cd backend
npm install                        # تثبيت المكتبات (يحتاج إنترنت)
cp .env.example .env                # ثم عدّل القيم الحقيقية جوه .env
npx prisma migrate dev --name init  # ينشئ الجداول فعلياً في PostgreSQL
npx prisma db seed                  # ينشئ حساب أدمن أولي وبيانات مرجعية
npm run dev                         # يشغّل السيرفر مع إعادة تشغيل تلقائي عند أي تعديل
```

بعد كده السيرفر شغّال على: `http://localhost:4000`

**بيانات الدخول الأولى:**
- يوزر: `admin`
- باسورد: `Admin@12345`
⚠️ لازم تغيّرها فوراً بعد أول دخول (هنضيف شاشة تغيير الباسورد في الفرونت إند).

## الرفع على سيرفر سحابي (زي ما اتفقنا)

الخطوات العامة (هتختلف بالتفصيل حسب مين هتختار — Railway، Render، DigitalOcean، إلخ):

1. تنشئ قاعدة بيانات PostgreSQL سحابية (أغلب الشركات بتديك واحدة جاهزة عند تسجيل حساب)
2. تاخد رابط الاتصال (Connection String) وتحطه في `DATABASE_URL`
3. ترفع مجلد `backend` كامل على الاستضافة
4. تشغّل نفس أوامر `migrate` و `seed` مرة واحدة بس (أول مرة)
5. الاستضافة بتدّيلك رابط زي `https://ug-erp-backend.onrender.com` — ده اللي هيكلم الفرونت إند بيه
6. تحط الرابط ده في إعدادات الفرونت إند بدل `localhost`

## المرحلة القادمة

الفرونت إند (React) اللي هيتكلم مع الـ API ده فعلياً بدل البيانات الوهمية اللي في `prototype.html`، بحيث لما تضغط "حفظ" فعلاً يتخصم من المخزون الحقيقي.

هل تحب أختار لك منصة استضافة محددة وأوريك خطوات مضبوطة بالتفصيل (رفع فعلي)، ولا نكمل الفرونت إند الأول؟
