const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'مطلوب'),
  password: z.string().min(1, 'مطلوب'),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3, 'لازم يكون 3 حروف على الأقل'),
  password: z.string().min(6, 'لازم يكون 6 حروف على الأقل'),
  fullName: z.string().trim().min(2, 'الاسم مطلوب'),
  roleId: z.string().trim().min(1, 'الدور مطلوب'),
  phone: z.string().trim().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'مطلوب'),
  newPassword: z.string().min(6, 'كلمة السر الجديدة لازم تكون 6 حروف على الأقل'),
});

module.exports = { loginSchema, createUserSchema, changePasswordSchema };
