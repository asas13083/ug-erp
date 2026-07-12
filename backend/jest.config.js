module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 20000, // بعض الاختبارات بتعمل عمليات فعلية على قاعدة البيانات
  verbose: true,
};
