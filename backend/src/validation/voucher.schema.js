const { z } = require('zod');

// عنصر الصنف داخل أي إذن — لازم كمية أكبر من صفر، مش أي رقم
const itemLineSchema = z.object({
  itemId: z.string().trim().min(1, 'الصنف مطلوب'),
  quantity: z.number({ invalid_type_error: 'الكمية لازم تكون رقم' }).positive('الكمية لازم تكون أكبر من صفر'),
});

// سيارة النقل: نوعها + عددها (بدل تكرار نفس النوع في أكتر من سطر)
const vehicleSchema = z.object({
  type: z.string().trim().min(1, 'نوع السيارة مطلوب'),
  count: z.number({ invalid_type_error: 'العدد لازم يكون رقم' }).int().positive('العدد لازم يكون أكبر من صفر'),
});
const vehiclesSchema = z.array(vehicleSchema).optional().nullable();

const issueVoucherSchema = z.object({
  warehouseId: z.string().trim().min(1, 'المخزن مطلوب'),
  eventId: z.string().trim().min(1, 'الحفلة مطلوبة'),
  recipientName: z.string().trim().min(1, 'اسم المستلم مطلوب'),
  notes: z.string().trim().optional().nullable(),
  vehicles: vehiclesSchema,
  handedByUserId: z.string().trim().optional().nullable(),
  receivedByUserId: z.string().trim().optional().nullable(),
  items: z.array(itemLineSchema).min(1, 'لازم صنف واحد على الأقل'),
});

// عنصر المرتجع فيه تفاصيل أكتر (سليم/تالف)، والقيم دي لازم تكون صفر أو أكبر (مش سالبة)
const returnItemLineSchema = z.object({
  itemId: z.string().trim().min(1, 'الصنف مطلوب'),
  issuedQuantity: z.number({ invalid_type_error: 'الكمية لازم تكون رقم' }).nonnegative('لازم يكون رقم غير سالب'),
  returnedQuantity: z.number({ invalid_type_error: 'الكمية لازم تكون رقم' }).nonnegative('لازم يكون رقم غير سالب'),
  damagedQuantity: z.number({ invalid_type_error: 'الكمية لازم تكون رقم' }).nonnegative('لازم يكون رقم غير سالب').optional().default(0),
});

const returnVoucherSchema = z.object({
  eventId: z.string().trim().min(1, 'الحفلة مطلوبة'),
  warehouseId: z.string().trim().min(1, 'المخزن مطلوب'),
  notes: z.string().trim().optional().nullable(),
  vehicles: vehiclesSchema,
  handedByUserId: z.string().trim().optional().nullable(),
  receivedByUserId: z.string().trim().optional().nullable(),
  items: z.array(returnItemLineSchema).min(1, 'لازم صنف واحد على الأقل'),
});

const custodyTransferSchema = z
  .object({
    fromEventId: z.string().trim().min(1, 'الحفلة المصدر مطلوبة'),
    toEventId: z.string().trim().min(1, 'الحفلة المستقبِلة مطلوبة'),
    receiverName: z.string().trim().min(1, 'اسم المستلم مطلوب'),
    notes: z.string().trim().optional().nullable(),
    vehicles: vehiclesSchema,
    handedByUserId: z.string().trim().optional().nullable(),
    receivedByUserId: z.string().trim().optional().nullable(),
    items: z.array(itemLineSchema).min(1, 'لازم صنف واحد على الأقل'),
  })
  .refine((data) => data.fromEventId !== data.toEventId, {
    message: 'الحفلة المصدر والمستقبِلة لازم يكونوا مختلفين',
    path: ['toEventId'],
  });

module.exports = { issueVoucherSchema, returnVoucherSchema, custodyTransferSchema };
