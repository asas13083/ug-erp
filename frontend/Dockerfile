# ============ بناء الفرونت إند (ملفات ثابتة بس، مفيش سيرفر Node هنا) ============
FROM node:20-slim AS build

# رابط الـAPI بيتحدد وقت البناء (Vite بيدمجه جوه الملفات الثابتة نفسها).
# الافتراضي "/api" — بيشتغل تلقائي لو Nginx بيقدّم الفرونت إند والباك إند
# على نفس الدومين (شوف nginx/default.conf) — مفيش داعي تغيّره غالباً.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ============ التقديم النهائي عن طريق Nginx ============
# إعداد Nginx نفسه (default.conf) بيتوصّل كـ volume من docker-compose.yml،
# مش منسوخ هنا — عشان تقدر تغيّره من غير ما تبني الصورة تاني كل مرة
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
