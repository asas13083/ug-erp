const prisma = require('../lib/prisma');

/**
 * يحسب حالة تسوية عدد كبير من الحفلات دفعة واحدة (3 استعلامات بس، مش لكل حفلة لوحدها).
 * يرجّع Map: eventId -> 'settled' | 'pending' | 'none'
 *  - 'none'    : لسه معملش صرف خالص للحفلة دي
 *  - 'pending' : فيه كمية لسه برا (مش راجعة ولا متسجلة فاقد)
 *  - 'settled' : كل اللي خرج اتحسب (رجع سليم / تالف / اتسجل فاقد)
 */
async function computeBulkSettlementStatuses(eventIds) {
  if (eventIds.length === 0) return new Map();

  const [issueLines, returnLines, lossLines, custodyOutLines, custodyInLines] = await Promise.all([
    prisma.issueVoucherItem.findMany({
      where: { voucher: { eventId: { in: eventIds }, status: 'CONFIRMED' } },
      select: { quantity: true, voucher: { select: { eventId: true } } },
    }),
    prisma.returnVoucherItem.findMany({
      where: { voucher: { eventId: { in: eventIds }, status: 'CONFIRMED' } },
      select: { returnedQuantity: true, damagedQuantity: true, voucher: { select: { eventId: true } } },
    }),
    prisma.lossRecord.findMany({
      where: { eventId: { in: eventIds }, status: 'CONFIRMED' },
      select: { quantity: true, eventId: true },
    }),
    prisma.custodyTransferItem.findMany({
      where: { transfer: { fromEventId: { in: eventIds }, status: 'CONFIRMED' } },
      select: { quantity: true, transfer: { select: { fromEventId: true } } },
    }),
    prisma.custodyTransferItem.findMany({
      where: { transfer: { toEventId: { in: eventIds }, status: 'CONFIRMED' } },
      select: { quantity: true, transfer: { select: { toEventId: true } } },
    }),
  ]);

  const issuedMap = new Map();
  issueLines.forEach((l) => {
    const id = l.voucher.eventId;
    issuedMap.set(id, (issuedMap.get(id) || 0) + l.quantity);
  });
  // عهدة داخلة من حفلة تانية = بتتحسب "خرجت" على الحفلة دي برضو
  custodyInLines.forEach((l) => {
    const id = l.transfer.toEventId;
    issuedMap.set(id, (issuedMap.get(id) || 0) + l.quantity);
  });

  const accountedMap = new Map();
  returnLines.forEach((l) => {
    const id = l.voucher.eventId;
    accountedMap.set(id, (accountedMap.get(id) || 0) + l.returnedQuantity + l.damagedQuantity);
  });
  lossLines.forEach((l) => {
    accountedMap.set(l.eventId, (accountedMap.get(l.eventId) || 0) + l.quantity);
  });
  // عهدة خارجة لحفلة تانية = بتتحسب "اتحسبت" (زي المرتجع تماماً) على الحفلة المصدر
  custodyOutLines.forEach((l) => {
    const id = l.transfer.fromEventId;
    accountedMap.set(id, (accountedMap.get(id) || 0) + l.quantity);
  });

  const statusMap = new Map();
  eventIds.forEach((id) => {
    const issued = issuedMap.get(id) || 0;
    const accounted = accountedMap.get(id) || 0;
    if (issued === 0) statusMap.set(id, 'none');
    else if (accounted >= issued) statusMap.set(id, 'settled');
    else statusMap.set(id, 'pending');
  });

  return statusMap;
}

/**
 * يجمّع كل أذون الصرف والمرتجع والفاقد الخاصة بحفلة معينة في صف واحد لكل صنف —
 * بدل ما تشوف كل إذن لوحده، تشوف "الصنف الفلاني: خرج كذا، رجع كذا، فاقد كذا".
 * بياخد event بعد ما يكون محمّل بالعلاقات: issueVouchers, returnVouchers, lossRecords
 */
function buildEventItemSummary(event) {
  const map = new Map(); // itemId -> { itemId, itemName, unit, issued, returnedGood, damaged, lost, sources }

  function ensure(item) {
    if (!map.has(item.id)) {
      map.set(item.id, { itemId: item.id, itemName: item.name, unit: item.unit, issued: 0, returnedGood: 0, damaged: 0, lost: 0, transferredOut: 0, sources: [] });
    }
    return map.get(item.id);
  }

  // بنجمّع "مصدر" كل صنف (طلع من إيه مخزن، أو جه بنقل عهدة من إيه حفلة) —
  // مفيد وقت ما تختار صنف من قايمة "لسه برا" تعرف يعني إيه بالظبط جاي منين
  function addSource(item, type, name, quantity) {
    if (quantity <= 0) return;
    const row = ensure(item);
    const existing = row.sources.find((s) => s.type === type && s.name === name);
    if (existing) existing.quantity += quantity;
    else row.sources.push({ type, name, quantity });
  }

  event.issueVouchers.filter((v) => v.status !== 'CANCELLED').forEach((v) =>
    v.items.forEach((i) => {
      ensure(i.item).issued += i.quantity;
      addSource(i.item, 'warehouse', v.warehouse?.name || '—', i.quantity);
    })
  );
  event.returnVouchers.filter((v) => v.status !== 'CANCELLED').forEach((v) =>
    v.items.forEach((i) => {
      const row = ensure(i.item);
      row.returnedGood += i.returnedQuantity;
      row.damaged += i.damagedQuantity;
    })
  );
  event.lossRecords.filter((l) => l.status !== 'CANCELLED').forEach((l) => { ensure(l.item).lost += l.quantity; });

  // عهدة خرجت من الحفلة دي لحفلة تانية = بتتحسب "اتحسبت" (زي المرتجع)
  (event.custodyTransfersOut || []).filter((t) => t.status !== 'CANCELLED').forEach((t) => t.items.forEach((i) => { ensure(i.item).transferredOut += i.quantity; }));
  // عهدة دخلت من حفلة تانية = بتتحسب "خرجت" على الحفلة دي (زي إذن صرف جديد)
  (event.custodyTransfersIn || []).filter((t) => t.status !== 'CANCELLED').forEach((t) =>
    t.items.forEach((i) => {
      ensure(i.item).issued += i.quantity;
      addSource(i.item, 'custody', t.fromEvent?.name || '—', i.quantity);
    })
  );

  return Array.from(map.values()).map((row) => {
    const accounted = row.returnedGood + row.damaged + row.lost + row.transferredOut;
    const pending = Math.max(row.issued - accounted, 0);
    return { ...row, pending, settled: row.issued > 0 && pending === 0 };
  });
}

module.exports = { computeBulkSettlementStatuses, buildEventItemSummary };

/**
 * يحسب "لسه برا" الحقيقي لكل صنف من منظور مخزن معين — بيتتبّع الحفلة اللي
 * المخزن صرف لها، ويشوف حالتها الحقيقية (بعد أي مرتجع أو نقل عهدة لأي
 * مكان)، مش بس "هل رجع لنفس المخزن ده تحديداً؟". لو الصنف رجع لمخزن تاني
 * أو اتنقل عهدة وسُوّي هناك، المخزن الأصلي بيبطّل يشوفه "لسه برا" — لأنه
 * فعلاً رجع لمنظومة المخازن، مش لازم يرجع لنفس المكان بالظبط.
 */
async function computeWarehouseStillOut(warehouseId, itemIds) {
  const rawResult = new Map(); // itemId -> { quantity, eventIds: Set }
  if (itemIds.length === 0) return rawResult;

  // 1) اللي المخزن ده تحديداً صرفه، لكل صنف ولكل حفلة
  const issuedFromHere = await prisma.issueVoucherItem.findMany({
    where: { itemId: { in: itemIds }, voucher: { warehouseId, status: 'CONFIRMED' } },
    select: { itemId: true, quantity: true, voucher: { select: { eventId: true } } },
  });
  if (issuedFromHere.length === 0) return rawResult;

  // 2) نجيب كل حركة الصنف ده في النظام كله (مش بس الحفلات المعروفة الأول)
  // — لأن نقل العهدة ممكن يوصل الكمية لحفلات تانية بعيدة عن أي حفلة صرفنالها
  // مباشرة، ولازم نلحقها لحد ما نلاقي "رجوع فعلي لمخزن" أو "فاقد"
  const [allIssueLines, allReturnLines, allLossLines, allCustodyLines] = await Promise.all([
    prisma.issueVoucherItem.findMany({
      where: { itemId: { in: itemIds }, voucher: { status: 'CONFIRMED' } },
      select: { itemId: true, quantity: true, voucher: { select: { eventId: true } } },
    }),
    prisma.returnVoucherItem.findMany({
      where: { itemId: { in: itemIds }, voucher: { status: 'CONFIRMED' } },
      select: { itemId: true, returnedQuantity: true, damagedQuantity: true, voucher: { select: { eventId: true } } },
    }),
    prisma.lossRecord.findMany({
      where: { itemId: { in: itemIds }, status: 'CONFIRMED', eventId: { not: null } },
      select: { itemId: true, quantity: true, eventId: true },
    }),
    prisma.custodyTransferItem.findMany({
      where: { itemId: { in: itemIds }, transfer: { status: 'CONFIRMED' } },
      select: { itemId: true, quantity: true, transfer: { select: { fromEventId: true, toEventId: true } } },
    }),
  ]);

  const issuedByItemEvent = new Map(); // "itemId|eventId" -> كل اللي دخل الحفلة (صرف مباشر + عهدة داخلة)
  allIssueLines.forEach((l) => {
    const key = `${l.itemId}|${l.voucher.eventId}`;
    issuedByItemEvent.set(key, (issuedByItemEvent.get(key) || 0) + l.quantity);
  });
  const accountedByItemEvent = new Map(); // "itemId|eventId" -> اللي "خلص" فعلياً (رجع لمخزن أو اتسجل فاقد) — مش نقل عهدة
  allReturnLines.forEach((l) => {
    const key = `${l.itemId}|${l.voucher.eventId}`;
    accountedByItemEvent.set(key, (accountedByItemEvent.get(key) || 0) + l.returnedQuantity + l.damagedQuantity);
  });
  allLossLines.forEach((l) => {
    const key = `${l.itemId}|${l.eventId}`;
    accountedByItemEvent.set(key, (accountedByItemEvent.get(key) || 0) + l.quantity);
  });
  const custodyOutByItemEvent = new Map(); // "itemId|fromEventId" -> [{ toEventId, quantity }]
  allCustodyLines.forEach((l) => {
    const key = `${l.itemId}|${l.transfer.fromEventId}`;
    issuedByItemEvent.set(key, issuedByItemEvent.get(key) || 0); // نضمن المفتاح موجود حتى لو مفيش صرف مباشر هنا
    if (!custodyOutByItemEvent.has(key)) custodyOutByItemEvent.set(key, []);
    custodyOutByItemEvent.get(key).push({ toEventId: l.transfer.toEventId, quantity: l.quantity });
    const inKey = `${l.itemId}|${l.transfer.toEventId}`;
    issuedByItemEvent.set(inKey, (issuedByItemEvent.get(inKey) || 0) + l.quantity);
  });

  // "نسبة اللي لسه معلّق" في حفلة معينة = (كل اللي دخلها - اللي خلص فعلياً) ÷ كل اللي دخلها.
  // النسبة دي واحدة بغض النظر مين صرف، عشان لو أكتر من مخزن صرفوا لنفس
  // الحفلة، كل مخزن ياخد نصيبه بالتناسب من غير ما نخصم نفس المرتجع مرتين.
  function pendingRatio(itemId, eventId) {
    const key = `${itemId}|${eventId}`;
    const issued = issuedByItemEvent.get(key) || 0;
    if (issued <= 0) return 0;
    const accounted = accountedByItemEvent.get(key) || 0;
    return Math.max(issued - accounted, 0) / issued;
  }

  // بنتتبّع نصيب المخزن ده من كل كمية، عن طريق أي عدد نقلات عهدة، لحد ما
  // نلاقي "رجوع فعلي لمخزن" أو "فاقد" — قبل كده تفضل "لسه برا" في المخزن الأصلي.
  // وكل مرة نوصل لحفلة "نهائية" (لسه برا فيها فعلاً، مش اتنقلت عهدة لمكان
  // تاني) بنسجّلها في eventIdsSet عشان نقدر نعرف "برا في كام حفلة" لكل صنف
  function traceStillOut(itemId, eventId, incomingShare, eventIdsSet, depth = 0) {
    if (incomingShare <= 0 || depth > 20) return 0;
    const pending = incomingShare * pendingRatio(itemId, eventId);
    if (pending <= 0) return 0;

    const key = `${itemId}|${eventId}`;
    const outgoing = custodyOutByItemEvent.get(key) || [];
    if (outgoing.length === 0) {
      eventIdsSet.add(eventId);
      return pending; // مفيش نقل عهدة من هنا، لسه برا فعلاً في الحفلة دي
    }

    const totalOutgoingQty = outgoing.reduce((s, t) => s + t.quantity, 0) || 1;
    let stillOut = 0;
    outgoing.forEach((t) => {
      const forwardShare = pending * (t.quantity / totalOutgoingQty);
      stillOut += traceStillOut(itemId, t.toEventId, forwardShare, eventIdsSet, depth + 1);
    });
    return stillOut;
  }

  issuedFromHere.forEach((l) => {
    if (!rawResult.has(l.itemId)) rawResult.set(l.itemId, { quantity: 0, eventIds: new Set() });
    const entry = rawResult.get(l.itemId);
    const traced = traceStillOut(l.itemId, l.voucher.eventId, l.quantity, entry.eventIds);
    entry.quantity += Math.round(traced);
  });

  // نجيب أسماء كل الحفلات دي مرة واحدة (بدل ما كل صنف يطلب اسمها لوحده)
  const allEventIds = [...new Set(Array.from(rawResult.values()).flatMap((v) => [...v.eventIds]))];
  const eventsInfo = allEventIds.length
    ? await prisma.event.findMany({ where: { id: { in: allEventIds } }, select: { id: true, name: true, number: true } })
    : [];
  const eventMap = new Map(eventsInfo.map((e) => [e.id, e]));

  const result = new Map();
  rawResult.forEach((v, itemId) => {
    result.set(itemId, {
      quantity: v.quantity,
      eventsCount: v.eventIds.size,
      events: [...v.eventIds].map((id) => eventMap.get(id)).filter(Boolean),
    });
  });

  return result;
}

module.exports.computeWarehouseStillOut = computeWarehouseStillOut;
