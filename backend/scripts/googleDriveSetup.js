/**
 * سكريبت إعداد جوجل درايف — يتشغّل مرة واحدة بس، أول مرة تظبّط الرفع
 * التلقائي للنسخ الاحتياطية. بيفتحلك صفحة تسجيل دخول جوجل، وبعد ما توافق،
 * بيديك "Refresh Token" — نص طويل تحطه في ملف .env مرة واحدة، وبعدها
 * النظام هيقدر يرفع نسخ احتياطية على جوجل درايف بتاعك للأبد من غير ما
 * تحتاج تسجّل دخول تاني خالص.
 *
 * طريقة التشغيل:
 *   cd backend
 *   node scripts/googleDriveSetup.js
 *
 * (الخطوات التفصيلية اللي قبل تشغيل السكريبت ده موجودة في الرسالة اللي
 * بعتهالك — لازم الأول تاخد Client ID و Client Secret من Google Cloud Console)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:4321/oauth-callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('محتاج تحط GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في ملف .env الأول (من Google Cloud Console).');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // ده اللي بيخلي جوجل يديك Refresh Token (مش access token بس)
  prompt: 'consent', // يجبر جوجل يورّيك شاشة الموافقة تاني حتى لو سبق ووافقت، عشان نضمن نلاقي refresh token
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n1) افتح الرابط ده في المتصفح وسجّل دخول بنفس الإيميل اللي عايز الرفع يحصل عليه:\n');
console.log(authUrl);
console.log('\n2) بعد ما توافق، السكريبت هياخد الكود تلقائياً ويطلعلك الـ Refresh Token هنا...\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth-callback')) return;

  const url = new URL(req.url, `http://localhost:4321`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.end('حصل خطأ — مفيش كود في الرابط. جرب تاني.');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.end('تمام! رجع لبرنامج الـ Terminal وشوف الـ Refresh Token هناك. تقدر تقفل التبويب ده دلوقتي.');
    console.log('✓ نجح! ده الـ Refresh Token بتاعك — انسخه وحطه في ملف .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
    if (!tokens.refresh_token) {
      console.log(
        '⚠ جوجل ما رجعش Refresh Token — غالباً لأنك سبق ووافقت قبل كده. روح https://myaccount.google.com/permissions ' +
          'واسحب الصلاحية من التطبيق، وبعدين شغّل السكريبت تاني.'
      );
    }
  } catch (err) {
    console.error('حصل خطأ أثناء استبدال الكود بالتوكن:', err.message);
    res.end('حصل خطأ — شوف رسالة الخطأ في الـ Terminal.');
  } finally {
    server.close(() => process.exit(0));
  }
});

server.listen(4321, () => {
  console.log('(في انتظار الموافقة على الرابط اللي فوق...)\n');
});
