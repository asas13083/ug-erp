# ============ صورة الباك إند ============
FROM node:20-slim

# مكتبات النظام اللي محتاجينها: openssl لـ Prisma، chromium لـ Puppeteer (تصدير PDF)،
# وpostgresql-client عشان pg_dump/psql (النسخ الاحتياطي والاسترجاع) يشتغلوا
# نضيف مستودع PostgreSQL الرسمي عشان ناخد نسخة pg_dump/psql رقم 18 بالظبط —
# لازم تطابق نسخة قاعدة البيانات نفسها (postgres:18-alpine في docker-compose.yml).
# ca-certificates لازم تتثبّت الأول قبل أي حاجة بتستخدم https، وإلا curl
# بيرفض يتحقق من الشهادات ويفشل التحميل.
RUN apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release --no-install-recommends \
    && update-ca-certificates \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    postgresql-client-18 \
    tar \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# نقول لـ Puppeteer يستخدم الـ chromium اللي ثبّتناه بدل ما ينزّل نسخته الخاصة
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npx prisma generate

EXPOSE 4000

# migrate deploy (تطبيق التحديثات بأمان على قاعدة بيانات حقيقية) قبل ما السيرفر يشتغل
CMD npx prisma migrate deploy && node src/server.js
