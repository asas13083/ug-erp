// قاموس الترجمة: كل مفتاح بيه النص بالعربي والإنجليزي.
// النص العربي نفسه هو المفتاح (سهل نلاقيه في الكود ونضيف عليه)، ولو مفيش
// ترجمة إنجليزية لنص معين، النظام بيرجع النص العربي كـ fallback بدل ما يبوّظ.
const translations = {
  // ============ القائمة الجانبية ============
  'UG Production House': { en: 'UG Production House' },
  'Inventory ERP': { en: 'Inventory ERP' },
  'لوحة التحكم': { en: 'Dashboard' },
  'الملف الشخصي': { en: 'My Profile' },
  'المخزون': { en: 'Inventory' },
  'الأصناف': { en: 'Items' },
  'المخازن': { en: 'Warehouses' },
  'التصنيفات': { en: 'Categories' },
  'النقل بين المخازن': { en: 'Warehouse Transfer' },
  'الجرد الدوري': { en: 'Stock Count' },
  'الحفلات والعملاء': { en: 'Events & Clients' },
  'العملاء': { en: 'Clients' },
  'الحفلات': { en: 'Events' },
  'تقويم الحفلات': { en: 'Events Calendar' },
  'الصرف والمرتجع': { en: 'Issue & Return' },
  'إذن صرف جديد': { en: 'New Issue Voucher' },
  'سجل أذون الصرف': { en: 'Issue Vouchers Log' },
  'إذن مرتجع جديد': { en: 'New Return Voucher' },
  'سجل أذون المرتجع': { en: 'Return Vouchers Log' },
  'الفاقد': { en: 'Lost Items' },
  'التالف': { en: 'Damaged Items' },
  'نقل عهدة بين الحفلات': { en: 'Custody Transfer Between Events' },
  'سجل نقل العهدة': { en: 'Custody Transfers Log' },
  'المتابعة والتقارير': { en: 'Monitoring & Reports' },
  'سجل الحركة': { en: 'Activity Log' },
  'التقارير': { en: 'Reports' },
  'تقرير يومي/شهري': { en: 'Daily/Monthly Report' },
  'إشعارات الإيميل': { en: 'Email Notifications' },
  'الإدارة': { en: 'Administration' },
  'المستخدمون': { en: 'Users' },
  'الأدوار والصلاحيات': { en: 'Roles & Permissions' },
  'النسخ الاحتياطي': { en: 'Backups' },
  'إعدادات الشركة': { en: 'Company Settings' },
  'سلة المهملات': { en: 'Trash' },
  'خروج': { en: 'Logout' },
  'تسجيل الخروج': { en: 'Logout' },

  // ============ لوحة التحكم ============
  'صباح الخير': { en: 'Good morning' },
  'مساء النور': { en: 'Good afternoon' },
  'مساء الخير': { en: 'Good evening' },
  'نظرة عامة على المخزون والعمليات': { en: 'Overview of inventory and operations' },
  'إجمالي الأصناف': { en: 'Total Items' },
  'المخازن النشطة': { en: 'Active Warehouses' },
  'حفلات مفتوحة': { en: 'Open Events' },
  'تنبيهات نقص مخزون': { en: 'Low Stock Alerts' },
  'دوس تشوف التفاصيل': { en: 'Tap to view details' },
  'كل الأصناف متوفرة': { en: 'All items are in stock' },
  'الحفلات القادمة': { en: 'Upcoming Events' },
  'التقويم الكامل': { en: 'Full Calendar' },
  'لا توجد حفلات قادمة مجدولة': { en: 'No upcoming events scheduled' },
  'تنبيهات نقص المخزون': { en: 'Low Stock Alerts' },
  'لا توجد تنبيهات حالياً': { en: 'No alerts at the moment' },
  'آخر العمليات': { en: 'Recent Activity' },
  'سجل الحركة الكامل': { en: 'Full Activity Log' },
  'لا توجد عمليات مسجّلة بعد': { en: 'No activity recorded yet' },
  'جاري التحميل...': { en: 'Loading...' },
  'تعذر تحميل الإحصائيات': { en: 'Failed to load statistics' },

  // ============ عناصر عامة مشتركة (تُستخدم في كل الصفحات تقريباً) ============
  'حفظ': { en: 'Save' },
  'إلغاء': { en: 'Cancel' },
  'تعديل': { en: 'Edit' },
  'حذف': { en: 'Delete' },
  'إضافة': { en: 'Add' },
  'بحث': { en: 'Search' },
  'بحث شامل...': { en: 'Search everywhere...' },
  'تصدير Excel': { en: 'Export Excel' },
  'تحميل PDF': { en: 'Download PDF' },
  'استرجاع': { en: 'Restore' },
  'حذف نهائي': { en: 'Delete Permanently' },
  'جاري الحفظ...': { en: 'Saving...' },
  'جاري التحميل': { en: 'Loading' },
  'مسح الفلتر': { en: 'Clear Filter' },
  'من': { en: 'From' },
  'إلى': { en: 'To' },
  'التاريخ': { en: 'Date' },
  'الحالة': { en: 'Status' },
  'الإجراءات': { en: 'Actions' },
  'إجراءات': { en: 'Actions' },
  'الاسم': { en: 'Name' },
  'ملاحظات (اختياري)': { en: 'Notes (optional)' },
  'النهاردة': { en: 'Today' },

  // ============ حالات الحفلة ============
  'مخطط لها': { en: 'Planned' },
  'جارية الآن': { en: 'Ongoing' },
  'مغلقة': { en: 'Closed' },
  'ملغاة': { en: 'Cancelled' },
  'الحد الأدنى': { en: 'Min. Qty' },

  // ============ فئات البحث الشامل ============
  'أصناف': { en: 'Items' },
  'حفلات': { en: 'Events' },
  'عملاء': { en: 'Clients' },
  'أذون صرف': { en: 'Issue Vouchers' },
  'أذون مرتجع': { en: 'Return Vouchers' },

  // ============ جرس الإشعارات ============
  'الآن': { en: 'Just now' },
  'منذ': { en: '' },
  'دقيقة': { en: 'min ago' },
  'ساعة': { en: 'hr ago' },
  'الإشعارات': { en: 'Notifications' },
  'آخر التحديثات': { en: 'Recent Updates' },
  'مفيش تحديثات لسه': { en: 'No updates yet' },
  'صرف': { en: 'Issue' },
  'مرتجع': { en: 'Return' },
  'فاقد': { en: 'Lost' },
  'نقل': { en: 'Transfer' },
  'جرد': { en: 'Count' },
  'دخول': { en: 'Login' },
};

// ============ صفحة الأصناف ============
Object.assign(translations, {
  'تعذر رفع الصورة': { en: 'Failed to upload image' },
  'تعذر استيراد الملف': { en: 'Failed to import file' },
  'حدث خطأ أثناء الحفظ': { en: 'An error occurred while saving' },
  'متأكد إنك عايز تحذف صنف': { en: 'Are you sure you want to delete item' },
  'تعذر الحذف': { en: 'Failed to delete' },
  'جاري الاستيراد...': { en: 'Importing...' },
  'استيراد من Excel': { en: 'Import from Excel' },
  'صنف جديد': { en: 'New Item' },
  'صنف': { en: 'item' },
  'تم إضافة': { en: 'Added' },
  'صنف بنجاح.': { en: 'item(s) successfully.' },
  'ملف الاستيراد لازم يكون فيه أعمدة بالترتيب ده: اسم الصنف | التصنيف | الوحدة | الحد الأدنى | الكمية الابتدائية (اختياري) | اسم المخزن (اختياري) — والصف الأول عنوان بيتجاهله النظام.':
    { en: 'The import file must have columns in this order: Item Name | Category | Unit | Min. Qty | Initial Quantity (optional) | Warehouse Name (optional) — the first row is treated as a header and ignored.' },
  'ابحث بالاسم أو الكود...': { en: 'Search by name or code...' },
  'الكود': { en: 'Code' },
  'الصنف': { en: 'Item' },
  'الكمية الكلية': { en: 'Total Qty' },
  'الكمية الأساسية': { en: 'Base Quantity' },
  'الموجود بالمخازن حالياً': { en: 'Currently in Warehouses' },
  'عدد الحفلات': { en: 'Events Count' },
  'المتاح فعلياً': { en: 'Available' },
  'منخفض': { en: 'Low' },
  'متوفر': { en: 'In Stock' },
  'لا توجد أصناف مطابقة': { en: 'No matching items' },
  'تعديل بيانات الصنف': { en: 'Edit Item' },
  'إضافة صنف جديد': { en: 'Add New Item' },
  'اسم الصنف': { en: 'Item Name' },
  'صورة الصنف (اختياري)': { en: 'Item Photo (optional)' },
  'جاري الرفع...': { en: 'Uploading...' },
  'تغيير الصورة': { en: 'Change Photo' },
  'رفع صورة': { en: 'Upload Photo' },
  'اختر تصنيف': { en: 'Select category' },
  'الوحدة': { en: 'Unit' },
  'الحد الأدنى للتنبيه': { en: 'Min. Alert Quantity' },
  'المخزن (اختياري)': { en: 'Warehouse (optional)' },
  'بدون كمية ابتدائية': { en: 'No initial quantity' },
  'الكمية الابتدائية': { en: 'Initial Quantity' },
  'لتعديل الكمية نفسها، استخدم "الجرد الدوري" أو "النقل بين المخازن" — التعديل هنا للبيانات الوصفية فقط.':
    { en: 'To adjust the quantity itself, use "Stock Count" or "Warehouse Transfer" — editing here only changes item details.' },
  'حفظ التعديلات': { en: 'Save Changes' },
});

// ============ صفحة المخازن ============
Object.assign(translations, {
  'حدث خطأ': { en: 'An error occurred' },
  'متأكد إنك عايز تحذف مخزن': { en: 'Are you sure you want to delete warehouse' },
  'تعذر الحذف — قد يكون المخزن فيه أصناف مسجّلة عليه': { en: 'Failed to delete — the warehouse may have items registered in it' },
  'المخازن': { en: 'Warehouses' },
  'مخزن': { en: 'warehouse' },
  'مخزن جديد': { en: 'New Warehouse' },
  'المسؤول': { en: 'Responsible' },
  'لا توجد مخازن بعد': { en: 'No warehouses yet' },
  'تعديل بيانات المخزن': { en: 'Edit Warehouse' },
  'اسم المخزن': { en: 'Warehouse Name' },
  'الموقع': { en: 'Location' },
});

// ============ صفحة تفاصيل المخزن ============
Object.assign(translations, {
  'جاري تحميل بيانات المخزن...': { en: 'Loading warehouse data...' },
  'تعذر تحميل بيانات المخزن': { en: 'Failed to load warehouse data' },
  'المخزن غير موجود': { en: 'Warehouse not found' },
  'الرصيد الحالي': { en: 'Current Stock' },
  'إذن الصرف': { en: 'Issue Vouchers' },
  'المرتجع': { en: 'Returns' },
  'كل المخازن': { en: 'All Warehouses' },
  'صنف مختلف': { en: 'distinct items' },
  'إجمالي الكمية': { en: 'Total Quantity' },
  'محجوز لحفلات قادمة': { en: 'Reserved for upcoming events' },
  'إجمالي الفاقد من المخزن ده': { en: 'Total lost from this warehouse' },
  'الكمية': { en: 'Quantity' },
  'محجوز': { en: 'Reserved' },
  'المتاح': { en: 'Available' },
  'لا يوجد رصيد في هذا المخزن': { en: 'No stock in this warehouse' },
  'رقم الإذن': { en: 'Voucher No.' },
  'الحفلة': { en: 'Event' },
  'الأصناف': { en: 'Items' },
  'لا يوجد صرف من هذا المخزن بعد': { en: 'No issues from this warehouse yet' },
  'سليم': { en: 'Good' },
  'لا يوجد مرتجع لهذا المخزن بعد': { en: 'No returns for this warehouse yet' },
  'السبب': { en: 'Reason' },
  'لا يوجد فاقد من هذا المخزن': { en: 'No losses from this warehouse' },
  'تلف': { en: 'Damage' },
  'مفقود': { en: 'Lost' },
  'سرقة': { en: 'Theft' },
  'أخرى': { en: 'Other' },
});

// ============ صفحة التصنيفات ============
Object.assign(translations, {
  'حدث خطأ أثناء التعديل': { en: 'An error occurred while editing' },
  'متأكد إنك عايز تحذف تصنيف': { en: 'Are you sure you want to delete category' },
  'تعذر الحذف — قد يكون التصنيف مرتبط بأصناف موجودة': { en: 'Failed to delete — the category may be linked to existing items' },
  'تصنيف': { en: 'category' },
  'اسم تصنيف جديد (مثال: تراسات)': { en: 'New category name (e.g. Terraces)' },
  'لا توجد تصنيفات بعد': { en: 'No categories yet' },
});

// ============ صفحة تفاصيل التصنيف ============
Object.assign(translations, {
  'تعذر تحميل بيانات التصنيف': { en: 'Failed to load category data' },
  'جاري تحميل بيانات التصنيف...': { en: 'Loading category data...' },
  'التصنيف غير موجود': { en: 'Category not found' },
  'صنف تحت هذا التصنيف': { en: 'item(s) under this category' },
  'كل التصنيفات': { en: 'All Categories' },
  'أماكن التخزين': { en: 'Storage Locations' },
  'لا توجد أصناف تحت هذا التصنيف بعد': { en: 'No items under this category yet' },
});

// ============ صفحة النقل بين المخازن ============
Object.assign(translations, {
  'نقل أصناف من مخزن لمخزن تاني': { en: 'Transfer items from one warehouse to another' },
  'لازم يكون المخزن المصدر مختلف عن المخزن الهدف': { en: 'Source warehouse must be different from the destination warehouse' },
  'تم النقل بنجاح — رقم العملية:': { en: 'Transfer completed successfully — Transaction No.:' },
  'حدث خطأ أثناء النقل': { en: 'An error occurred during transfer' },
  'من مخزن': { en: 'From Warehouse' },
  'اختر المخزن المصدر': { en: 'Select source warehouse' },
  'إلى مخزن': { en: 'To Warehouse' },
  'اختر المخزن الهدف': { en: 'Select destination warehouse' },
  'اختر المخزن المصدر الأول': { en: 'Select the source warehouse first' },
  'جاري تحميل الأصناف...': { en: 'Loading items...' },
  'اختر صنف': { en: 'Select item' },
  'اختر المخزن أولاً': { en: 'Select warehouse first' },
  'إضافة صنف': { en: 'Add Item' },
  'جاري النقل...': { en: 'Transferring...' },
  'تنفيذ النقل': { en: 'Execute Transfer' },
  'سجل عمليات النقل': { en: 'Transfer Log' },
  'الرقم': { en: 'Number' },
  'لا توجد عمليات نقل بعد': { en: 'No transfers yet' },
});

// ============ صفحة الجرد الدوري ============
Object.assign(translations, {
  'عدّ الأصناف فعلياً والنظام يصلّح أي فرق تلقائياً': { en: 'Count items physically and the system auto-corrects any difference' },
  'تم حفظ الجرد بنجاح — رقم العملية:': { en: 'Stock count saved successfully — Transaction No.:' },
  'حدث خطأ أثناء حفظ الجرد': { en: 'An error occurred while saving the stock count' },
  'اختر المخزن اللي هتجرده': { en: 'Select the warehouse to count' },
  'عدّ كل صنف فعلياً واكتب الكمية الحقيقية': { en: 'Count each item physically and enter the real quantity' },
  'بالنظام': { en: 'System' },
  'حفظ الجرد وتسوية المخزون': { en: 'Save Count & Reconcile Stock' },
  'سجل الجرد السابق': { en: 'Previous Count Log' },
  'الفروقات': { en: 'Differences' },
  'مفيش فروقات': { en: 'No differences' },
  'لا يوجد جرد مسجّل بعد': { en: 'No stock counts recorded yet' },
});

// ============ مكوّن اختيار الصنف ============
Object.assign(translations, {
  'اختر صنف...': { en: 'Select item...' },
  'متاح': { en: 'Available' },
});

// ============ صفحة العملاء ============
Object.assign(translations, {
  'متأكد إنك عايز تحذف العميل': { en: 'Are you sure you want to delete client' },
  'تعذر الحذف — قد يكون العميل مرتبط بحفلات موجودة': { en: 'Failed to delete — the client may be linked to existing events' },
  'عميل': { en: 'client' },
  'عميل جديد': { en: 'New Client' },
  'الاسم': { en: 'Name' },
  'الهاتف': { en: 'Phone' },
  'الشركة': { en: 'Company' },
  'اللوجو': { en: 'Logo' },
  'لا يوجد عملاء بعد': { en: 'No clients yet' },
  'تعديل بيانات العميل': { en: 'Edit Client' },
  'اسم العميل': { en: 'Client Name' },
  'رقم الهاتف': { en: 'Phone Number' },
  'اسم الشركة': { en: 'Company Name' },
  'لوجو العميل (اختياري)': { en: 'Client Logo (optional)' },
  'هيظهر تلقائياً جنب لوجو UG في كل إذن صرف/مرتجع لحفلات العميل ده': { en: 'Will automatically appear next to the UG logo on all issue/return vouchers for this client\'s events' },
});

// ============ صفحة تفاصيل العميل ============
Object.assign(translations, {
  'تعذر تحميل بيانات العميل': { en: 'Failed to load client data' },
  'جاري تحميل بيانات العميل...': { en: 'Loading client data...' },
  'العميل غير موجود': { en: 'Client not found' },
  'كل العملاء': { en: 'All Clients' },
  'حفلة تعامل بها العميل': { en: 'event(s) with this client' },
  'اسم الحفلة': { en: 'Event Name' },
  'المكان': { en: 'Location' },
  'لا توجد حفلات لهذا العميل بعد': { en: 'No events for this client yet' },
});

// ============ صفحة الحفلات ============
Object.assign(translations, {
  'اتقفلت بالكامل — كل اللي خرج رجع أو اتسجل': { en: 'Fully settled — everything issued has been returned or recorded' },
  'لسه فيها كمية معلّقة برا': { en: 'Still has pending quantity out' },
  'لسه معملهاش صرف': { en: "Hasn't been issued yet" },
  'متأكد إنك عايز تحذف حفلة': { en: 'Are you sure you want to delete event' },
  'تعذر الحذف — الحفلة ليها أذون صرف أو مرتجع مسجّلة عليها، غيّر حالتها لـ"ملغاة" بدلاً من الحذف':
    { en: 'Failed to delete — this event has issue/return vouchers recorded. Change its status to "Cancelled" instead of deleting.' },
  'حفلة': { en: 'event' },
  'حفلة جديدة': { en: 'New Event' },
  'لا توجد حفلات': { en: 'No events' },
  'اتقفلت بالكامل': { en: 'Fully settled' },
  'لسه فيها معلّق': { en: 'Has pending' },
  'تعديل الحفلة': { en: 'Edit Event' },
  'اسم الحفلة': { en: 'Event Name' },
  'اختر العميل': { en: 'Select client' },
});

// ============ صفحة تفاصيل الحفلة ============
Object.assign(translations, {
  'تعذر تحميل بيانات الحفلة': { en: 'Failed to load event data' },
  'جاري تحميل بيانات الحفلة...': { en: 'Loading event data...' },
  'الحفلة غير موجودة': { en: 'Event not found' },
  'كل الحفلات': { en: 'All Events' },
  'تحميل PDF (ملخص)': { en: 'Download PDF (Summary)' },
  'تصدير ملخص Excel': { en: 'Export Summary Excel' },
  'كل التفاصيل Excel': { en: 'Full Details Excel' },
  'كل الأصناف اتقفلت بالكامل': { en: 'All items fully settled' },
  'فيه أصناف لسه معلّقة': { en: 'Some items still pending' },
  'سجل فاقد': { en: 'Loss Records' },
  'ملخص الأصناف (مجمّع من كل أذون الصرف والمرتجع الخاصة بالحفلة دي)': { en: "Items summary (aggregated from all this event's issue and return vouchers)" },
  'خرج': { en: 'Issued' },
  'رجع سليم': { en: 'Returned Good' },
  'اتقفل بالكامل': { en: 'Fully Settled' },
  'لسه معلّق': { en: 'Pending' },
  'لا توجد أصناف متصرفة لهذه الحفلة بعد': { en: 'No items issued for this event yet' },
  'تفاصيل كل إذن صرف': { en: 'Issue Voucher Details' },
  'لا يوجد صرف لهذه الحفلة بعد': { en: 'No issues for this event yet' },
  'تفاصيل كل إذن مرتجع': { en: 'Return Voucher Details' },
  'لا يوجد مرتجع لهذه الحفلة بعد': { en: 'No returns for this event yet' },
  'نقل العهدة من/إلى حفلات تانية': { en: 'Custody Transfers To/From Other Events' },
  'خارجة →': { en: 'Out →' },
  '← داخلة': { en: '← In' },
  'إذن صرف': { en: 'Issue Voucher' },
  'إذن مرتجع': { en: 'Return Voucher' },
});

// ============ صفحة تقويم الحفلات ============
Object.assign(translations, {
  'الشهر اللي فات': { en: 'Previous Month' },
  'الشهر الجاي': { en: 'Next Month' },
  'كمان': { en: 'more' },
  'جارية': { en: 'Ongoing' },
});

// ============ نصوص مستقلة ناقصة (تُستخدم في أكتر من صفحة) ============
Object.assign(translations, {
  'التصنيف': { en: 'Category' },
  'العميل': { en: 'Client' },
  'المخزن': { en: 'Warehouse' },
  'تالف': { en: 'Damaged' },
  'لا توجد نتائج مطابقة': { en: 'No matching results' },
});

// ============ صفحة الفاقد ============
Object.assign(translations, {
  'سجل الفاقد': { en: 'Loss Log' },
  'سجل': { en: 'record' },
  'كل الأسباب': { en: 'All Reasons' },
  'المسؤول': { en: 'Responsible' },
  'لا يوجد فاقد مسجّل': { en: 'No losses recorded' },
});

// ============ صفحة التالف ============
Object.assign(translations, {
  'أصناف رجعت تالفة من المرتجعات': { en: 'Items returned damaged from returns' },
  'الكمية التالفة': { en: 'Damaged Qty' },
  'دي أصناف رجعت في المرتجع بحالة تالفة — يعني موجودة فعلياً في المخزن بس محتاجة صيانة أو مش صالحة للاستخدام العادي.':
    { en: 'These are items returned in damaged condition — physically present in the warehouse but need maintenance or are not fit for normal use.' },
  'لا توجد أصناف تالفة مسجّلة بعد': { en: 'No damaged items recorded yet' },
});

// ============ صفحة سجل الحركة ============
Object.assign(translations, {
  'عملية مسجّلة': { en: 'recorded activities' },
  'كل العمليات': { en: 'All Actions' },
  'العملية': { en: 'Action' },
  'الوصف': { en: 'Description' },
  'المستخدم': { en: 'User' },
  'الوقت': { en: 'Time' },
  'لا يوجد سجل حركة مطابق': { en: 'No matching activity log entries' },
});

// ============ صفحة التقارير ============
Object.assign(translations, {
  'فتح السجل': { en: 'Open Log' },
  'التقارير': { en: 'Reports' },
  'تقرير منفصل قابل للتصدير لكل قسم — بلوجو UG مضمّن تلقائياً في كل ملف': { en: 'A separate exportable report for each section — the UG logo is automatically included in every file' },
  'رصيد المخزون (كل المخازن مجمّعة)': { en: 'Stock Balance (all warehouses combined)' },
  'كل الأصناف والكميات الحالية في كل المخازن': { en: 'All items and current quantities across all warehouses' },
  'حركة المخازن (كل المخازن مجمّعة)': { en: 'Warehouse Movement (all warehouses combined)' },
  'رصيد كل صنف داخل كل مخزن على حدة': { en: 'Balance of each item within each warehouse separately' },
  'تقرير الحفلات': { en: 'Events Report' },
  'كل الحفلات وحالتها وتواريخها': { en: 'All events, their status and dates' },
  'تقرير الصرف (كل المخازن مجمّعة)': { en: 'Issue Report (all warehouses combined)' },
  'كل أذون الصرف — Excel أو PDF، أو تحميل PDF لكل إذن على حدة من السجل': { en: 'All issue vouchers — Excel or PDF, or download each voucher individually from the log' },
  'تقرير المرتجع (كل المخازن مجمّعة)': { en: 'Return Report (all warehouses combined)' },
  'سليم/تالف/مفقود لكل حفلة': { en: 'Good/damaged/lost for each event' },
  'تقرير الفاقد (كل المخازن مجمّعة)': { en: 'Loss Report (all warehouses combined)' },
  'كل التلف والفقد والسرقة المسجّلة': { en: 'All recorded damage, loss and theft' },
  'كل عملية حصلت في النظام (حتى 500 عملية في PDF، 2000 في Excel)': { en: 'Every action in the system (up to 500 in PDF, 2000 in Excel)' },
  'تقرير يومي / شهري شامل': { en: 'Comprehensive Daily / Monthly Report' },
  'ملخص كل حاجة حصلت في يوم أو شهر معين — صرف، مرتجع، فاقد، وأكتر': { en: 'A summary of everything that happened on a given day or month — issues, returns, losses, and more' },
  'تقارير كل مخزن لوحده': { en: 'Per-Warehouse Reports' },
  'اختار مخزن واطلع تقريره الخاص بيه بس — رصيد، صرف، أو فاقد — Excel أو PDF': { en: 'Pick a warehouse and get its own report — stock, issues, or losses — Excel or PDF' },
  'رصيد PDF': { en: 'Stock PDF' },
  'رصيد Excel': { en: 'Stock Excel' },
  'صرف PDF': { en: 'Issue PDF' },
  'صرف Excel': { en: 'Issue Excel' },
  'فاقد PDF': { en: 'Loss PDF' },
  'فاقد Excel': { en: 'Loss Excel' },
});

// ============ صفحة التقرير الدوري (يومي/شهري) ============
Object.assign(translations, {
  'تعذر تحميل التقرير': { en: 'Failed to load report' },
  'التقرير اليومي / الشهري': { en: 'Daily / Monthly Report' },
  'ملخص شامل لكل حاجة حصلت في الفترة اللي تختارها': { en: 'A comprehensive summary of everything that happened in the period you choose' },
  'يومي': { en: 'Daily' },
  'شهري': { en: 'Monthly' },
  'جاري تحميل التقرير...': { en: 'Loading report...' },
  'أذون صرف': { en: 'Issue Vouchers' },
  'أصناف اتصرفت': { en: 'Items Issued' },
  'أذون مرتجع': { en: 'Return Vouchers' },
  'أصناف رجعت سليمة': { en: 'Items Returned Good' },
  'أصناف تالفة': { en: 'Damaged Items' },
  'سجلات فاقد': { en: 'Loss Records' },
  'حفلات جديدة': { en: 'New Events' },
  'أصناف/عملاء جدد': { en: 'New Items/Clients' },
  'كل العمليات': { en: 'All Actions' },
  'لا توجد أي عمليات في الفترة دي': { en: 'No activity in this period' },
});

// ============ صفحة المستخدمين ============
Object.assign(translations, {
  'تم إنشاء حساب': { en: 'Account' },
  'بنجاح': { en: 'created successfully' },
  'حدث خطأ أثناء الإنشاء': { en: 'An error occurred while creating' },
  'تحديد مين يقدر يدخل النظام وبأي دور': { en: 'Control who can access the system and with which role' },
  'إدارة الأدوار والصلاحيات': { en: 'Manage Roles & Permissions' },
  'مستخدم جديد': { en: 'New User' },
  'مستخدم': { en: 'user' },
  'اسم المستخدم': { en: 'Username' },
  'الدور': { en: 'Role' },
  'نشط': { en: 'Active' },
  'موقوف': { en: 'Suspended' },
  'لا يوجد مستخدمون بعد': { en: 'No users yet' },
  'الاسم الكامل': { en: 'Full Name' },
  'مثال: كريم فؤاد': { en: 'e.g. Karim Fouad' },
  'اسم المستخدم (بالإنجليزي، بدون مسافات)': { en: 'Username (in English, no spaces)' },
  'كلمة مرور مبدئية': { en: 'Initial Password' },
  'يقدر يغيّرها بعد أول دخول': { en: 'They can change it after first login' },
  'اختر دور': { en: 'Select role' },
  'مش لاقي الدور اللي عايزه؟ اعمل واحد جديد من "إدارة الأدوار والصلاحيات"': { en: 'Can\'t find the role you need? Create a new one from "Manage Roles & Permissions"' },
  'رقم الهاتف (اختياري)': { en: 'Phone Number (optional)' },
});

// ============ صفحة الأدوار والصلاحيات ============
Object.assign(translations, {
  'عرض': { en: 'View' },
  'متأكد إنك عايز تحذف دور': { en: 'Are you sure you want to delete role' },
  'الأدوار والصلاحيات': { en: 'Roles & Permissions' },
  'اكتب اسم أي وظيفة (مدير، محاسب، مسؤول إضاءة...) وحدد بحرية كل قسم يشوف أو يعدّل أو يحذف إيه':
    { en: 'Type any job title (manager, accountant, lighting officer...) and freely define what each section can view, edit, or delete' },
  'دور جديد': { en: 'New Role' },
  'أساسي': { en: 'System' },
  'صلاحية عرض على': { en: 'view access to' },
  'قسم': { en: 'section(s)' },
  'تعديل الصلاحيات': { en: 'Edit Permissions' },
  'تعديل الدور والصلاحيات': { en: 'Edit Role & Permissions' },
  'اسم الوظيفة/الدور (اكتب أي اسم تحب)': { en: 'Job Title/Role Name (type anything you like)' },
  'مثال: محاسب، مسؤول إضاءة، مشرف مسرح...': { en: 'e.g. Accountant, Lighting Officer, Stage Supervisor...' },
  'القسم': { en: 'Section' },
  'الكل': { en: 'All' },
  'حفظ الصلاحيات': { en: 'Save Permissions' },
  // تسميات الأقسام القادمة ديناميكياً من الباك إند (نظام الصلاحيات)
  'الموردين': { en: 'Suppliers' },
  'المستخدمون والصلاحيات': { en: 'Users & Permissions' },
  'إعدادات النظام': { en: 'System Settings' },
});

// ============ صفحة النسخ الاحتياطي ============
Object.assign(translations, {
  'بايت': { en: 'bytes' },
  'كيلوبايت': { en: 'KB' },
  'ميجابايت': { en: 'MB' },
  'تم إنشاء نسخة احتياطية جديدة بنجاح': { en: 'New backup created successfully' },
  'تعذر إنشاء النسخة الاحتياطية — تأكد إن pg_dump متاح على الجهاز': { en: 'Failed to create backup — make sure pg_dump is available on this machine' },
  'نسخة كاملة من قاعدة البيانات تلقائياً كل 24 ساعة، بالإضافة لإمكانية التشغيل اليدوي': { en: 'A full database backup automatically every 24 hours, plus manual execution' },
  'جاري إنشاء النسخة...': { en: 'Creating backup...' },
  'تشغيل نسخة احتياطية الآن': { en: 'Run Backup Now' },
  'الاحتفاظ بآخر 14 نسخة بس تلقائياً — القديم بيتشال أوتوماتيك عشان مايمتلئش المساحة.': { en: 'Only the last 14 backups are kept automatically — older ones are removed automatically to save space.' },
  'اسم الملف': { en: 'File Name' },
  'الحجم': { en: 'Size' },
  'تحميل': { en: 'Download' },
  'لا توجد نسخ احتياطية بعد — دوس "تشغيل نسخة احتياطية الآن"': { en: 'No backups yet — click "Run Backup Now"' },
});

// ============ صفحة إذن الصرف ============
Object.assign(translations, {
  'إذن صرف جديد': { en: 'New Issue Voucher' },
  'صرف أصناف من المخزن لحفلة معينة': { en: 'Issue items from a warehouse to a specific event' },
  'عند الحفظ، الكميات بتتخصم فعلياً من رصيد المخزن، ولو الكمية مش متوفرة هيظهرلك تنبيه فوري بالمتاح الحقيقي.':
    { en: 'On save, quantities are deducted from stock immediately. If the quantity is unavailable, you will get an instant alert showing the real available amount.' },
  'تم الحفظ بنجاح — رقم الإذن:': { en: 'Saved successfully — Voucher No.:' },
  'تم خصم الكميات من المخزون.': { en: 'Quantities have been deducted from stock.' },
  'حدث خطأ أثناء الحفظ': { en: 'An error occurred while saving' },
  'اختر المخزن': { en: 'Select warehouse' },
  'اختر الحفلة': { en: 'Select event' },
  'اسم المستلم': { en: 'Recipient Name' },
  'اسم الفني أو المستلم': { en: 'Technician or recipient name' },
  'بيانات النقل (اختياري)': { en: 'Transport Details (optional)' },
  'مثلاً: عربيتين نقل كبيرة': { en: 'e.g. Two large transport vans' },
  'اختر المخزن الأول عشان تظهرلك أصنافه الفعلية': { en: 'Select a warehouse first to see its actual items' },
  'جاري تحميل أصناف المخزن...': { en: 'Loading warehouse items...' },
  'المخزن ده لسه مفيهوش أي أصناف مسجّلة': { en: 'This warehouse has no items registered yet' },
  'اختر صنف من هذا المخزن': { en: 'Select an item from this warehouse' },
  'حفظ وخصم من المخزن': { en: 'Save & Deduct from Stock' },
});

// ============ سجل أذون الصرف ============
Object.assign(translations, {
  'سجل أذون الصرف': { en: 'Issue Vouchers Log' },
  'إذن': { en: 'voucher' },
  'تصدير Excel (حسب الفلتر)': { en: 'Export Excel (Filtered)' },
  'متأكد إنك عايز تلغي إذن الصرف': { en: 'Are you sure you want to cancel issue voucher' },
  'الكميات هترجع تلقائياً للمخزون.': { en: 'Quantities will automatically return to stock.' },
  'تعذر إلغاء الإذن': { en: 'Failed to cancel voucher' },
  'تعذر حفظ التعديل': { en: 'Failed to save changes' },
  'ملغي': { en: 'Cancelled' },
  'فعّال': { en: 'Active' },
  'ملغى': { en: 'Cancelled' },
  'لا توجد أذون صرف بعد': { en: 'No issue vouchers yet' },
  'تعديل إذن صرف': { en: 'Edit Issue Voucher' },
  'أي زيادة في الكمية بتتخصم من المخزون فوراً (لو متاحة)، وأي نقصان أو حذف صنف بيرجع الفرق للمخزون تلقائياً.':
    { en: 'Any increase in quantity is deducted from stock immediately (if available), and any decrease or removed item automatically returns the difference to stock.' },
});

// ============ صفحة إذن المرتجع ============
Object.assign(translations, {
  'إذن مرتجع': { en: 'Return Voucher' },
  'استلام الأصناف بعد انتهاء الحفلة': { en: 'Receive items after the event ends' },
  'الكميات اللي هتشوفها هنا هي بس اللي "لسه برا فعلياً" (بعد خصم أي مرتجع سابق اتعمل لنفس الحفلة) — مش إجمالي الصرف من الأول.':
    { en: 'The quantities shown here are only what is "actually still out" (after deducting any previous return for the same event) — not the original total issued.' },
  'تم تسجيل المرتجع بنجاح — رقم الإذن:': { en: 'Return recorded successfully — Voucher No.:' },
  'الحفلة (بانتظار المرتجع)': { en: 'Event (Awaiting Return)' },
  'المخزن المستلم': { en: 'Receiving Warehouse' },
  'مثلاً: عربية واحدة صغيرة': { en: 'e.g. One small transport van' },
  'جاري تحميل الأصناف اللي لسه برا...': { en: 'Loading items still out...' },
  'الحفلة دي مفيهاش أي كمية لسه برا — كل اللي خرج منها رجع أو اتسجل بالفعل.': { en: 'This event has no remaining quantity out — everything issued has already been returned or recorded.' },
  'الأصناف اللي لسه برا': { en: 'Items Still Out' },
  'لسه برا': { en: 'Still Out' },
  'تأكيد المرتجع': { en: 'Confirm Return' },
});

// ============ سجل أذون المرتجع ============
Object.assign(translations, {
  'سجل أذون المرتجع': { en: 'Return Vouchers Log' },
  'متأكد إنك عايز تلغي إذن المرتجع': { en: 'Are you sure you want to cancel return voucher' },
  'هيتم عكس أثره على المخزون.': { en: 'Its effect on stock will be reversed.' },
  'لا توجد أذون مرتجع بعد': { en: 'No return vouchers yet' },
  'تعديل إذن مرتجع': { en: 'Edit Return Voucher' },
  'التعديل بيعيد حساب المخزون والفاقد التلقائي من جديد بناءً على الأرقام الجديدة.':
    { en: 'Editing recalculates stock and automatic loss records from scratch based on the new numbers.' },
  'مصروف': { en: 'Issued' },
});

// ============ صفحة نقل العهدة ============
Object.assign(translations, {
  'نقل عهدة بين الحفلات': { en: 'Custody Transfer Between Events' },
  'نقل أصناف لسه برا من حفلة مباشرة لحفلة تانية شغالة، من غير ما ترجع المخزن': { en: 'Transfer items still out directly from one event to another active event, without returning to the warehouse' },
  'الكميات اللي هتشوفها هي بس اللي "لسه برا فعلياً" من الحفلة المصدر (بعد خصم أي مرتجع أو نقل سابق). أول ما تنقلها، هتتحسب "خارجة" على الحفلة الهدف كمان.':
    { en: 'The quantities shown are only what is "actually still out" from the source event (after deducting any previous return or transfer). Once transferred, it will be counted as "issued" for the destination event too.' },
  'لازم تكون الحفلة المصدر مختلفة عن الحفلة الهدف': { en: 'Source event must be different from the destination event' },
  'لازم تحدد كمية صنف واحد على الأقل عايز تنقله': { en: 'You must specify a quantity for at least one item to transfer' },
  'تم نقل العهدة بنجاح — رقم العملية:': { en: 'Custody transferred successfully — Transaction No.:' },
  'حدث خطأ أثناء نقل العهدة': { en: 'An error occurred during custody transfer' },
  'من حفلة': { en: 'From Event' },
  'اختر الحفلة المصدر': { en: 'Select source event' },
  'إلى حفلة': { en: 'To Event' },
  'اختر الحفلة الهدف': { en: 'Select destination event' },
  'اسم المسؤول المستلم في الحفلة التانية': { en: 'Receiving Manager Name at the Other Event' },
  'اسم الأوبريشن أو المسؤول هناك': { en: 'Operations person or manager name there' },
  'مفيش أي كمية لسه برا من الحفلة دي تقدر تنقلها.': { en: 'There is no remaining quantity from this event available to transfer.' },
  'الكمية المنقولة': { en: 'Transferred Quantity' },
  'جاري النقل...': { en: 'Transferring...' },
  'تأكيد نقل العهدة': { en: 'Confirm Custody Transfer' },
});

// ============ سجل نقل العهدة ============
Object.assign(translations, {
  'سجل نقل العهدة بين الحفلات': { en: 'Custody Transfers Log' },
  'عملية': { en: 'transaction' },
  'المستلم': { en: 'Receiver' },
  'بيانات النقل': { en: 'Transport Details' },
  'لا توجد عمليات نقل عهدة بعد': { en: 'No custody transfers yet' },
});

// ============ صفحة إشعارات الإيميل ============
Object.assign(translations, {
  'في الانتظار': { en: 'Pending' },
  'تم الإرسال': { en: 'Sent' },
  'فشل الإرسال': { en: 'Failed' },
  'تعذر الإرسال': { en: 'Failed to send' },
  'متأكد إنك عايز تلغي الرسالة دي قبل ما تتبعت؟': { en: 'Are you sure you want to cancel this message before it is sent?' },
  'تعذر الإلغاء': { en: 'Failed to cancel' },
  'تعذر إعادة المحاولة': { en: 'Failed to retry' },
  'الناجحة': { en: 'successful' },
  'الفاشلة': { en: 'failed' },
  'متأكد إنك عايز تمسح كل الرسائل': { en: 'Are you sure you want to delete all' },
  'من الطابور؟': { en: 'messages from the queue?' },
  'تعذر المسح': { en: 'Failed to delete' },
  'تعذر التحديث': { en: 'Failed to update' },
  'إشعارات الإيميل': { en: 'Email Notifications' },
  'تقرير يومي وشهري شامل — مش إشعار لكل عملية صغيرة': { en: 'Comprehensive daily and monthly report — not a notification for every small action' },
  'جاري الإرسال...': { en: 'Sending...' },
  'أرسل تقرير اليوم الآن': { en: "Send Today's Report Now" },
  'أرسل تقرير الشهر الآن': { en: "Send This Month's Report Now" },
  'النظام بيبعت تلقائياً:': { en: 'The system automatically sends:' },
  'تقرير يومي': { en: 'a daily report' },
  'كل يوم الساعة 10 بالليل، و': { en: 'every day at 10 PM, and' },
  'تقرير شهري': { en: 'a monthly report' },
  'في آخر يوم بالشهر — بدل إشعار لكل عملية صغيرة. النظام Offline-Safe: لو النت مقطوع وقت الإرسال، بيتسجل في الطابور ويتبعت أول ما يرجع الاتصال.':
    { en: 'on the last day of the month — instead of a notification for every small action. The system is offline-safe: if the internet is down at send time, it queues and sends automatically once the connection is back.' },
  'المستقبِلون': { en: 'Recipients' },
  'طابور الإرسال': { en: 'Send Queue' },
  'كل التقارير بتتبعت لكل المستقبِلين "النشطين" مع بعض. لو عايز تبعت لشخص واحد بس مؤقتاً، دوس "إيقاف" لباقي الأسماء، وسيب اللي عايزه بس "نشط"، وبعد كده ارجع فعّلهم تاني.':
    { en: 'All reports are sent to every "active" recipient together. If you want to send to just one person temporarily, click "Deactivate" for the others, keep the one you want "Active", then reactivate the rest afterward.' },
  'الإيميل': { en: 'Email' },
  'إيقاف': { en: 'Deactivate' },
  'تفعيل': { en: 'Activate' },
  'لا يوجد مستقبِلون بعد — أضف واحد فوق': { en: 'No recipients yet — add one above' },
  'مسح كل الرسائل الناجحة': { en: 'Clear All Successful Messages' },
  'مسح كل الرسائل الفاشلة': { en: 'Clear All Failed Messages' },
  'الموضوع': { en: 'Subject' },
  'المحاولات': { en: 'Attempts' },
  'سبب الفشل': { en: 'Failure Reason' },
  'إعادة المحاولة': { en: 'Retry' },
  'الطابور فاضي': { en: 'Queue is empty' },
});

// ============ صفحة إعدادات الشركة ============
Object.assign(translations, {
  'تم حفظ إعدادات الشركة بنجاح': { en: 'Company settings saved successfully' },
  'تعذر حفظ الإعدادات': { en: 'Failed to save settings' },
  'بيانات عامة تظهر في التقارير والمستندات': { en: 'General information shown in reports and documents' },
  'اسم الشركة': { en: 'Company Name' },
  'العنوان': { en: 'Address' },
  'الإيميل الرسمي': { en: 'Official Email' },
  'حفظ الإعدادات': { en: 'Save Settings' },
});

// ============ صفحة سلة المهملات ============
Object.assign(translations, {
  'تعذر الاسترجاع': { en: 'Failed to restore' },
  'متأكد إنك عايز تمسح': { en: 'Are you sure you want to delete' },
  'نهائياً؟ الخطوة دي مفيهاش رجوع خالص.': { en: 'permanently? This action cannot be undone at all.' },
  'تعذر الحذف النهائي — قد يكون العنصر مرتبط ببيانات أخرى': { en: 'Failed to permanently delete — the item may be linked to other data' },
  'سلة المهملات': { en: 'Trash' },
  'العناصر المحذوفة — قابلة للاسترجاع أو الحذف النهائي': { en: 'Deleted items — can be restored or permanently deleted' },
  'سلة المهملات فاضية في القسم ده': { en: 'Trash is empty in this section' },
  'اتمسح في': { en: 'Deleted on' },
  'استرجاع': { en: 'Restore' },
  'حذف نهائي': { en: 'Delete Permanently' },
});

// ============ صفحة الملف الشخصي ============
Object.assign(translations, {
  'كلمة المرور الجديدة وتأكيدها مش متطابقين': { en: 'New password and confirmation do not match' },
  'تم تغيير كلمة المرور بنجاح': { en: 'Password changed successfully' },
  'تعذر تغيير كلمة المرور': { en: 'Failed to change password' },
  'بياناتك وصورتك وتغيير كلمة المرور': { en: 'Your info, photo, and password change' },
  'صورة الحساب': { en: 'Profile photo' },
  'جاري رفع الصورة...': { en: 'Uploading photo...' },
  'تغيير كلمة المرور': { en: 'Change Password' },
  'كلمة المرور الحالية': { en: 'Current Password' },
  'كلمة المرور الجديدة': { en: 'New Password' },
  '6 أحرف على الأقل': { en: 'At least 6 characters' },
  'تأكيد كلمة المرور الجديدة': { en: 'Confirm New Password' },
  'حفظ كلمة المرور الجديدة': { en: 'Save New Password' },
});

// ============ عدد سيارات النقل ============
Object.assign(translations, {
  'عدد سيارات النقل (اختياري)': { en: 'Number of Transport Vehicles (optional)' },
  'سيارة': { en: 'vehicle(s)' },
  'النقل': { en: 'Transport' },
  'مثلاً: عربية صغيرة': { en: 'e.g. one small vehicle' },
  'مثلاً: عربية كبيرة': { en: 'e.g. one large vehicle' },
});

// ============ نطاق رؤية الحفلات لكل مستخدم ============
Object.assign(translations, {
  'نطاق الحفلات': { en: 'Event Scope' },
  'حفلات معيّنة فقط': { en: 'Assigned events only' },
  'تحديد الحفلات': { en: 'Set Events' },
  'يشوف الحفلات المعيّن عليها بس (مش كل الحفلات)': { en: 'Can only see assigned events (not all events)' },
  'ابحث عن حفلة...': { en: 'Search for an event...' },
  'حفلة معيّنة': { en: 'event(s) assigned' },
  'لا توجد نتائج': { en: 'No results' },
});

// ============ تعيين الأوبريشن على الحفلة ============
Object.assign(translations, {
  'الأوبريشن المعيّنين على الحفلة (اختياري)': { en: 'Assigned Operators for This Event (optional)' },
  'لا يوجد مستخدمون': { en: 'No users' },
  'لو حد من المعيّنين هنا مفعّل عليه "يشوف حفلاته المعيّن عليها بس"، هيقدر يشوف الحفلة دي.':
    { en: 'If someone assigned here has "assigned events only" enabled, they will be able to see this event.' },
  'الأوبريشن المعيّنين على الحفلة دي': { en: 'Operators Assigned to This Event' },
  'مفيش حد معيّن على الحفلة دي': { en: 'No one is assigned to this event' },
  'متأكد إنك عايز تحذف مستخدم': { en: 'Are you sure you want to delete user' },
  'نهائياً؟': { en: 'permanently?' },
});

// ============ صفحة تفاصيل المستخدم ============
Object.assign(translations, {
  'المستخدم غير موجود': { en: 'User not found' },
  'كل المستخدمين': { en: 'All Users' },
  'حفلة اشتغل فيها على مدار الوقت': { en: 'event(s) worked on over time' },
  'عملية مسجّلة باسمه': { en: 'action(s) recorded under their name' },
  'الحفلات اللي اشتغل فيها (كل الفترات)': { en: 'Events Worked On (All Time)' },
  'لسه مشتغلش على أي حفلة': { en: "Hasn't worked on any event yet" },
  'مفيش سجل حركة لسه': { en: 'No activity recorded yet' },
});

// ============ مكوّن إدخال السيارات ============
Object.assign(translations, {
  'سيارات النقل (اختياري)': { en: 'Transport Vehicles (optional)' },
  'عربية': { en: 'Vehicle' },
  'إضافة عربية': { en: 'Add Vehicle' },
  'بنود الإذن': { en: 'Voucher Line Items' },
});

// ============ تعديل وإلغاء نقل العهدة ============
Object.assign(translations, {
  'متأكد إنك عايز تلغي نقل العهدة': { en: 'Are you sure you want to cancel custody transfer' },
  'تعديل نقل عهدة': { en: 'Edit Custody Transfer' },
  'تقدر تغيّر الكميات أو تحذف صنف، بس مينفعش تضيف صنف جديد هنا — لو محتاج صنف جديد، اعمل عملية نقل منفصلة.':
    { en: "You can change quantities or remove an item, but you can't add a new item here — if you need a new item, create a separate transfer." },
});

// ============ صفحة تفاصيل الصنف ============
Object.assign(translations, {
  'تعذر تحميل بيانات الصنف': { en: 'Failed to load item data' },
  'كل الأصناف': { en: 'All Items' },
  'الكمية عند أول دخول': { en: 'Quantity at First Entry' },
  'الكمية الحالية الكلية': { en: 'Total Current Quantity' },
  'لسه برا (كل الحفلات)': { en: 'Still Out (all events)' },
  'إجمالي الفاقد': { en: 'Total Lost' },
  'موزّع على كام حفلة دلوقتي': { en: 'Currently Distributed Across (Events)' },
  'تفصيل كل مخزن': { en: 'Per-Warehouse Breakdown' },
  'دخل': { en: 'In' },
  'خرج': { en: 'Out' },
  'الصنف ده مش موجود في أي مخزن بعد': { en: 'This item is not in any warehouse yet' },
  'الرصيد المفروض': { en: 'Expected Balance' },
  'الرصيد المفروض مش مطابق للكمية الفعلية — محتاج مراجعة': { en: 'Expected balance does not match actual quantity — needs review' },
});

// ============ تعديل وإلغاء سجل الفاقد ============
Object.assign(translations, {
  'المصدر': { en: 'Source' },
  'تلقائي من مرتجع': { en: 'Auto from Return' },
  'تلقائي من جرد': { en: 'Auto from Stock Count' },
  'المصدر': { en: 'Source' },
  'من مخزن': { en: 'From warehouse' },
  'نقل عهدة من حفلة': { en: 'Custody transfer from event' },
  'مصدر الكمية اللي لسه برا': { en: 'Source of Still-Out Quantity' },
  'إجمالي كمية الصنف': { en: 'Total Item Quantity' },
  'يدوي': { en: 'Manual' },
  'متأكد إنك عايز تلغي سجل الفاقد ده؟': { en: 'Are you sure you want to cancel this loss record?' },
  'الكمية هترجع تلقائياً للمخزون لو كانت اتخصمت.': { en: 'The quantity will be automatically returned to stock if it was deducted.' },
  'تعديل سجل فاقد': { en: 'Edit Loss Record' },
});

// ============ لوحة التحكم الاحترافية ============
Object.assign(translations, {
  'نشاط اليوم': { en: "Today's Activity" },
  'نقل عهدة': { en: 'Custody Transfer' },
  'حالة تسوية الحفلات المفتوحة': { en: 'Open Events Settlement Status' },
  'أكتر الأصناف صرفاً الشهر ده': { en: 'Top Issued Items This Month' },
  'لا توجد بيانات كافية بعد': { en: 'Not enough data yet' },
  'أكتر المستخدمين نشاطاً الشهر ده': { en: 'Most Active Users This Month' },
  'حالة إشعارات الإيميل': { en: 'Email Notifications Status' },
  'آخر تقرير اتبعت': { en: 'Last report sent' },
  'لسه مفيش تقارير اتبعتت': { en: 'No reports sent yet' },
  'حالة النسخ الاحتياطي': { en: 'Backup Status' },
  'آخر نسخة': { en: 'Last backup' },
  'لسه مفيش نسخ احتياطية': { en: 'No backups yet' },
  'من شوية': { en: 'Just now' },
  'ساعة مضت': { en: 'hours ago' },
  'يوم مضى': { en: 'days ago' },
});

// ============ تسجيل فاقد سريع من صفحة الأصناف ============
Object.assign(translations, {
  'تسجيل فاقد': { en: 'Record Loss' },
  'تعذر تسجيل الفاقد': { en: 'Failed to record loss' },
  'بدون مخزن — فاقد أثناء حفلة مثلاً': { en: 'No warehouse — e.g. loss during an event' },
  'لو اخترت مخزن، الكمية هتتخصم من رصيده فوراً.': { en: "If you select a warehouse, the quantity will be deducted from its stock immediately." },
  'تسجيل الفاقد': { en: 'Record Loss' },
});

// ============ عرض المستخدمين تحت كل دور ============
Object.assign(translations, {
  'لا يوجد مستخدمون بهذا الدور': { en: 'No users with this role' },
  'بواسطة': { en: 'By' },
  'هيتخصم من رصيد': { en: 'Will be deducted from' },
  'فوراً.': { en: 'stock immediately.' },
});

// ============ صفحة سجل النقل الموحّد ============
Object.assign(translations, {
  'سجل النقل': { en: 'Transport Log' },
  'عملية': { en: 'transaction' },
  'تجميع كل عمليات النقل (اللي اتسجل فيها عدد سيارات أو ملاحظة نقل) من أذون الصرف والمرتجع ونقل العهدة، في مكان واحد.':
    { en: 'Aggregates all transport entries (with a vehicle count or transport note) from issue vouchers, return vouchers, and custody transfers, in one place.' },
  'النوع': { en: 'Type' },
  'عدد السيارات': { en: 'Vehicle Count' },
  'لا توجد عمليات نقل مسجّلة بعد': { en: 'No transport entries recorded yet' },
});

// ============ خانات المُسلّم والمُستلم من الأوبريشن ============
Object.assign(translations, {
  'المُسلّم (اختياري)': { en: 'Handed Over By (optional)' },
  'المُستلم من الأوبريشن (اختياري)': { en: 'Received By Operator (optional)' },
  'بدون تحديد': { en: 'Not specified' },
  'استخدمهم لو التسليم بين أوبريشن وأوبريشن تاني، عشان تحدد مين سلّم لمين بالظبط': { en: 'Use these if the handover is between two operators, to specify exactly who handed it to whom' },
  'استخدمهم لو النقل بين أوبريشن وأوبريشن تاني، عشان تحدد مين سلّم لمين بالظبط': { en: 'Use these if the transfer is between two operators, to specify exactly who handed it to whom' },
  'سلّم': { en: 'Handed by' },
  'استلم': { en: 'Received by' },
});

// ============ استرجاع النسخة الاحتياطية ============
Object.assign(translations, {
  'استرجاع من ملف مرفوع': { en: 'Restore from Uploaded File' },
  'استرجاع': { en: 'Restore' },
  'تحذير — عملية لا يمكن التراجع عنها': { en: 'Warning — This Action Cannot Be Undone' },
  'العملية دي هتمسح كل البيانات الحالية في قاعدة البيانات، وتستبدلها بالكامل بمحتوى الملف ده:': {
    en: 'This action will erase all current data in the database and completely replace it with the content of this file:',
  },
  'هناخد نسخة أمان تلقائية من الحالة الحالية قبل ما نبدأ — بس برضو، فكّر كويس قبل ما تكمل.': {
    en: "We'll automatically take a safety backup of the current state before starting — but still, think carefully before continuing.",
  },
  'اكتب كلمة "استرجاع" بالظبط عشان تأكد إنك عايز تكمل': { en: 'Type the word "استرجاع" (restore) exactly to confirm you want to continue' },
  'جاري الاسترجاع... متقفلش الصفحة': { en: 'Restoring... do not close this page' },
  'أيوه، امسح كل حاجة واسترجع': { en: 'Yes, erase everything and restore' },
  'تعذر الاسترجاع': { en: 'Failed to restore' },
});

// ============ الرفع التلقائي على جوجل درايف ============
Object.assign(translations, {
  'الرفع التلقائي على جوجل درايف مش متظبط لسه. راجع دليل الإعداد (scripts/googleDriveSetup.js) عشان النسخ تترفع تلقائياً كل يوم على مكان تاني غير السيرفر.': {
    en: 'Automatic Google Drive upload is not configured yet. See the setup guide (scripts/googleDriveSetup.js) so backups automatically upload somewhere other than the server every day.',
  },
  'الرفع التلقائي على جوجل درايف شغّال — كل نسخة جديدة بترفع هناك تلقائياً': { en: 'Automatic Google Drive upload is active — every new backup uploads there automatically' },
  'ارفع على درايف': { en: 'Upload to Drive' },
  'جاري الرفع...': { en: 'Uploading...' },
  'تم الرفع على جوجل درايف بنجاح': { en: 'Successfully uploaded to Google Drive' },
  'تعذر الرفع على جوجل درايف': { en: 'Failed to upload to Google Drive' },
});

// ============ قسم الحسابات — كشوفات تكاليف الحفلات ============
Object.assign(translations, {
  'الحسابات': { en: 'Accounts' },
  'كشوفات تكاليف الحفلات': { en: "Event Cost Sheets" },
  'تقرير مقارنة الحفلات': { en: 'Events Comparison Report' },
  'الأغراض': { en: 'Purposes' },
  'كشف حسابات': { en: 'Cost Sheet' },
  'كشف الحسابات': { en: 'Cost Sheet' },
  'اختار حفلة تشوف كشف حساباتها بالتفصيل': { en: 'Select an event to see its detailed cost sheet' },
  'ابحث باسم الحفلة أو رقمها...': { en: 'Search by event name or number...' },
  'رقم الحفلة': { en: 'Event Number' },
  'زي: أرضيات، برودكشن، ديكور — تستخدمها لتصنيف حركات التكاليف اليومية في قسم الحسابات': {
    en: 'Like: flooring, production, decor — used to categorize daily cost entries in the accounts section',
  },
  'اسم غرض جديد (مثال: برودكشن)': { en: 'New purpose name (e.g. Production)' },
  'لا توجد أغراض بعد': { en: 'No purposes yet' },
  'متأكد إنك عايز تحذف غرض': { en: 'Are you sure you want to delete purpose' },
  'تعذر تحميل بيانات الكشف': { en: 'Failed to load sheet data' },
  'نسخ من حفلة تانية': { en: 'Copy from Another Event' },
  'نسخ كشف من حفلة سابقة': { en: 'Copy Sheet from a Previous Event' },
  'هيتنسخ كل بنود وحركات الحفلة اللي هتختارها هنا فوق الكشف الحالي (مش بيمسح اللي موجود، بيضيف عليه)': {
    en: 'All items and entries from the event you select here will be copied onto the current sheet (it does not erase existing data, it adds to it)',
  },
  'اختار حفلة': { en: 'Select an event' },
  'جاري النسخ...': { en: 'Copying...' },
  'نسخ': { en: 'Copy' },
  'تعذر النسخ': { en: 'Failed to copy' },
  'الميزانية المتوقعة مقابل المصروف الفعلي': { en: 'Expected Budget vs Actual Spend' },
  'تعديل الميزانية': { en: 'Edit Budget' },
  'تعديل الميزانية المتوقعة': { en: 'Edit Expected Budget' },
  'اسيبها فاضية لو مفيش ميزانية محددة': { en: 'Leave empty if no budget is set' },
  'المصروف': { en: 'Spent' },
  'الميزانية': { en: 'Budget' },
  'فوق الميزانية بـ': { en: 'Over budget by' },
  'لسه تحت الميزانية بـ': { en: 'Still under budget by' },
  'مفيش ميزانية متوقعة متحددة لسه — دوس "تعديل الميزانية" عشان تحددها': { en: 'No expected budget set yet — click "Edit Budget" to set one' },
  'الكشف': { en: 'Sheet' },
  'إضافة بند': { en: 'Add Item' },
  'إضافة بند جديد': { en: 'Add New Item' },
  'تعديل بند': { en: 'Edit Item' },
  'البند': { en: 'Item' },
  'المبلغ': { en: 'Amount' },
  'ملاحظات': { en: 'Notes' },
  'اسم البند': { en: 'Item Name' },
  'متأكد إنك عايز تحذف بند': { en: 'Are you sure you want to delete item' },
  'سجل متراكم': { en: 'Accumulating Record' },
  'عرض التفاصيل اليومية': { en: 'Show Daily Details' },
  'إخفاء التفاصيل': { en: 'Hide Details' },
  'الإجمالي الكلي': { en: 'Grand Total' },
  'الإجمالي': { en: 'Total' },
  'إجمالي': { en: 'Total' },
  'التفاصيل اليومية': { en: 'Daily Details' },
  'كل الأغراض': { en: 'All Purposes' },
  'إضافة حركة': { en: 'Add Entry' },
  'إضافة حركة جديدة': { en: 'Add New Entry' },
  'تعديل حركة': { en: 'Edit Entry' },
  'الغرض': { en: 'Purpose' },
  'الغرض (اختياري)': { en: 'Purpose (optional)' },
  'العدد': { en: 'Count' },
  'السعر اليومي': { en: 'Daily Price' },
  'النوع (المهنة أو نوع السيارة)': { en: 'Type (profession or vehicle type)' },
  'مثال: نجار': { en: 'Example: Carpenter' },
  'لا توجد حركات مسجّلة بعد': { en: 'No entries recorded yet' },
  'متأكد إنك عايز تحذف الحركة دي': { en: 'Are you sure you want to delete this entry' },
  'لا توجد حفلات مطابقة': { en: 'No matching events' },
  'مصاريف كل حفلة جنب بعض، ومتوسط التكلفة، عشان يفيدك في التسعير المستقبلي': {
    en: 'Each event\u2019s spend side by side, and average cost, to help with future pricing',
  },
  'إجمالي المصروف': { en: 'Total Spend' },
  'متوسط تكلفة الحفلة': { en: 'Average Cost per Event' },
  'إجمالي كل تصنيف متراكم': { en: 'Total per Accumulating Category' },
  'بنود التوتال': { en: 'Total Items' },
  'لا توجد كشوفات مسجّلة في الفترة دي': { en: 'No sheets recorded in this period' },
  'تعذر الحفظ': { en: 'Failed to save' },
  // ============ أسماء التصنيفات الأربعة الثابتة (بترجع من الباك إند بالعربي) ============
  'عمالة الديكور': { en: 'Decor Labor' },
  'البدلات': { en: 'Uniforms' },
  'الميكروباص': { en: 'Microbus' },
});

// ============ الحد الأدنى لكل مخزن + دمج الأصناف المكررة ============
Object.assign(translations, {
  'تنبيه نقص': { en: 'Low Stock' },
  'تعذر حفظ الحد الأدنى': { en: 'Failed to save minimum quantity' },
  'صنف تاني اتدمجوا في أصناف موجودة أصلاً بنفس الاسم والتصنيف.': { en: 'other item(s) were merged into existing items with the same name and category.' },
  'و': { en: 'and' },
});

// ============ أسماء البنود الشائعة وعدد أيام العمالة ============
Object.assign(translations, {
  'أسماء بنود التوتال الشائعة': { en: 'Common Total Item Names' },
  'قايمة الأسماء اللي هتظهرلك تختار منها وقت ما تضيف بند توتال جديد في أي كشف حسابات': {
    en: 'A list of names to choose from when adding a new total item in any cost sheet',
  },
  'اسم بند جديد (مثال: اجمالي الجبس)': { en: 'New item name (e.g. Total Plastering)' },
  'متأكد إنك عايز تحذف اسم بند': { en: 'Are you sure you want to delete item name' },
  'لا توجد أسماء بنود بعد': { en: 'No item names yet' },
  'اكتب أو اختار من المقترحات': { en: 'Type or choose from suggestions' },
  'إدارة قايمة الأسماء الشائعة': { en: 'Manage Common Names List' },
  'عدد أيام العمالة': { en: 'Labor Days Count' },
  'PDF': { en: 'PDF' },
  'Excel': { en: 'Excel' },
  'إجمالي كل الحفلات المعروضة دلوقتي': { en: 'Total of All Currently Shown Events' },
});

// ============ استيراد سيارات النقل من الأذون تلقائياً ============
Object.assign(translations, {
  'سيارات نقل مسجّلة في أذون الحفلة دي — استوردها وحط سعرها بس': { en: "Transport vehicles recorded in this event's vouchers — import them and just set the price" },
  'استيراد': { en: 'Import' },
  'سعر السيارة': { en: 'Vehicle Price' },
  'السعر': { en: 'Price' },
  'تلقائي من إذن': { en: 'Auto from voucher' },
  'حركة': { en: 'entry' },
  'قفل اليوم': { en: 'Close Day' },
  'صور مرفوعة': { en: 'Uploaded Images' },
  'قاعدة بيانات': { en: 'Database' },
});

// ============ إعداد ظهور الدور في قوائم التسليم/الاستلام ============
Object.assign(translations, {
  'يظهر في قوائم "المُسلّم" و"المُستلم"': { en: 'Shows in "Handed by" and "Received by" lists' },
  'نقل عهدة لحفلة تانية': { en: 'Transferred to Another Event' },
  'يعني مستخدمين الدور ده هيظهروا كخيار وقت اختيار المُسلّم أو المُستلم في أذون الصرف والمرتجع ونقل العهدة': {
    en: 'Means users with this role will appear as an option when selecting handed-by/received-by in issue, return, and custody transfer vouchers',
  },
});

// ============ سجل الأخطاء ============
Object.assign(translations, {
  'سجل الأخطاء': { en: 'Error Log' },
  'آخر 100 خطأ حقيقي حصل في السيرفر — لو حصلت مشكلة، هتلاقي تفاصيلها هنا من غير ما تحتاج تدخل السيرفر': {
    en: 'The last 100 real server errors — if a problem occurs, find the details here without needing to access the server',
  },
  'تحديث': { en: 'Refresh' },
  'مفيش أي أخطاء مسجّلة — كل حاجة شغّالة تمام': { en: 'No errors recorded — everything is working fine' },
  'إضافة نوع سيارة': { en: 'Add Vehicle Type' },
  'جنيه': { en: 'EGP' },
  'سعر السيارة الواحدة': { en: 'Price per Vehicle' },
  'مش عايز أرجع الصنف ده دلوقتي': { en: "Don't return this item right now" },
  'من أصل': { en: 'out of' },
  'فاقد فعلي (اختياري)': { en: 'Actual Loss (optional)' },
  'هيفضل معلّق': { en: 'Stays pending' },
  'حذف الصورة': { en: 'Remove Image' },
  'لوجو الحفلة (اختياري)': { en: 'Event Logo (optional)' },
  'موردين': { en: 'Suppliers' },
  'مخازن': { en: 'Warehouses' },
});

// ============ الموردين ============
Object.assign(translations, {
  'الموردين': { en: 'Suppliers' },
  'كل الموردين والمستحق لكل واحد': { en: 'All suppliers and outstanding balances' },
  'مورد جديد': { en: 'New Supplier' },
  'تعديل مورد': { en: 'Edit Supplier' },
  'المورد': { en: 'Supplier' },
  'اختر المورد': { en: 'Select Supplier' },
  'المورد غير موجود': { en: 'Supplier not found' },
  'ملف المورد': { en: 'Supplier Profile' },
  'التليفون': { en: 'Phone' },
  'إجمالي التعاملات': { en: 'Total Invoiced' },
  'المدفوع': { en: 'Paid' },
  'المتبقي': { en: 'Remaining' },
  'المستحق': { en: 'Due' },
  'المستحق (المتبقي)': { en: 'Outstanding (Due)' },
  'المستحق حالياً': { en: 'Currently Due' },
  'مستحق': { en: 'Due' },
  'مدفوع بالكامل': { en: 'Fully Paid' },
  'إجمالي المستحق لكل الموردين': { en: 'Total Outstanding to All Suppliers' },
  'فاتورة مورد جديدة': { en: 'New Supplier Invoice' },
  'تعديل فاتورة مورد': { en: 'Edit Supplier Invoice' },
  'إضافة فاتورة مورد': { en: 'Add Supplier Invoice' },
  'سيبه صفر لو آجل بالكامل': { en: 'Leave zero if fully on credit' },
  'مثلاً: تصوير، إيجار كراسي': { en: 'e.g. Photography, Chair rental' },
  'الحفلات اللي اتعامل فيها': { en: 'Events Worked On' },
  'عدد الفواتير': { en: 'Invoices Count' },
  'كل الفواتير': { en: 'All Invoices' },
  'الدفعات': { en: 'Payments' },
  'تسجيل دفعة': { en: 'Record Payment' },
  'سجّلها': { en: 'Recorded By' },
  'التفاصيل': { en: 'Details' },
  'حصل خطأ': { en: 'An error occurred' },
  'متأكد من حذف المورد ده؟': { en: 'Delete this supplier?' },
  'متأكد من حذف الفاتورة دي؟': { en: 'Delete this invoice?' },
  'متأكد من حذف الدفعة دي؟': { en: 'Delete this payment?' },
  'مفيش موردين لسه': { en: 'No suppliers yet' },
  'مفيش فواتير لسه': { en: 'No invoices yet' },
  'مفيش فواتير موردين لسه': { en: 'No supplier invoices yet' },
  'مفيش دفعات لسه': { en: 'No payments yet' },
  'مفيش تعاملات لسه': { en: 'No transactions yet' },
});

// ============ واردات الموردين وأصناف الفواتير ============
Object.assign(translations, {
  'واردات الموردين': { en: 'Supplier Deliveries' },
  'الأصناف اللي جت من الموردين — إيه جه، من مين، لأي حفلة': { en: 'Items received from suppliers — what, from whom, for which event' },
  'أصناف الفاتورة': { en: 'Invoice Items' },
  'إجمالي الفاتورة': { en: 'Invoice Total' },
  'صورة الفاتورة (اختياري)': { en: 'Invoice Image (optional)' },
  'الفاتورة': { en: 'Invoice' },
  'أضف للمخزن': { en: 'Add to Warehouse' },
  'إضافة للمخزن': { en: 'Add to Warehouse' },
  'اتضاف': { en: 'Added' },
  'اتضاف للمخزن': { en: 'Added to Warehouse' },
  'لسه ماتضافش': { en: 'Not Added Yet' },
  'لسه': { en: 'Pending' },
  'مفيش واردات': { en: 'No deliveries' },
  'فيه': { en: 'There are' },
  'صنف جه من موردين ولسه ماتضافش للمخزن': { en: 'items from suppliers not yet added to warehouse' },
  'الصنف ده': { en: 'This item' },
  'موجود عندي بالفعل': { en: 'Already exists' },
  'اختر الصنف': { en: 'Select Item' },
  'اختر التصنيف': { en: 'Select Category' },
  'وحدة القياس': { en: 'Unit' },
  'قطعة': { en: 'piece' },
  'لو فيه صنف بنفس الاسم والتصنيف موجود، الكمية هتتضاف عليه بدل ما يتكرر': {
    en: 'If an item with the same name and category exists, the quantity will be added to it instead of duplicating',
  },
});

export default translations;
