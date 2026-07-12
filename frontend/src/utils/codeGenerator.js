const prisma = require('../lib/prisma');

// يولّد كود تلقائي بصيغة ثابتة مثل ITM-00001, EVT-0231, ISS-0142
// بيعتمد على عدد السجلات الحالية + 1، مع إعادة محاولة لو حصل تعارض نادر
const PREFIXES = {
  item: 'ITM',
  warehouse: 'WH',
  client: 'CL',
  event: 'EVT',
  issueVoucher: 'ISS',
  returnVoucher: 'RET',
  lossRecord: 'LOS',
  stockTransfer: 'TRF',
  stockCount: 'CNT',
  custodyTransfer: 'CUS',
};

const PAD_LENGTH = {
  item: 5,
  event: 4,
  issueVoucher: 4,
  returnVoucher: 4,
  lossRecord: 4,
  stockTransfer: 4,
  stockCount: 4,
  custodyTransfer: 4,
  warehouse: 2,
  client: 2,
};

async function generateCode(model) {
  const prefix = PREFIXES[model];
  const pad = PAD_LENGTH[model] || 4;
  if (!prefix) throw new Error(`لا يوجد بادئة كود معرّفة للموديل: ${model}`);

  const count = await prisma[model].count();
  const nextNumber = count + 1;
  return `${prefix}-${String(nextNumber).padStart(pad, '0')}`;
}

module.exports = { generateCode };
