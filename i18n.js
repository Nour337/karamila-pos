/* =====================================================================
 *  Karamila POS — Arabic / English language layer
 *  Translates the rendered UI on the fly (MutationObserver) and flips
 *  the layout to RTL for Arabic. Toggle button: header (and login page).
 *  Default language: Arabic. Choice is saved per device.
 * ===================================================================== */
(function () {
  'use strict';
  var KEY = 'krm:lang';
  var lang = 'ar';
  try { lang = JSON.parse(localStorage.getItem(KEY)) || 'ar'; } catch (e) { /* default */ }
  var AR_MODE = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = AR_MODE ? 'rtl' : 'ltr';

  /* ------------------------- dictionary (EN → AR) ------------------------- */
  var D = {
    // nav / shell
    'POS': 'الكاشير', 'Dashboard': 'لوحة التحكم', 'Log': 'السجل', 'Payroll': 'المرتبات', 'Expenses': 'المصاريف',
    'Approvals': 'الموافقات', 'Settings': 'الإعدادات', 'Manager': 'مدير', 'Cashier': 'كاشير', 'Live': 'متصل',
    'Offline': 'غير متصل', 'Log out': 'تسجيل خروج', 'Install app': 'تثبيت التطبيق',
    'Loading Karamila…': 'جاري تحميل كراميلا…', 'Loading data…': 'جاري تحميل البيانات…',
    'No connection — connect once to load the shop data.': 'مفيش إنترنت — اتصل مرة واحدة عشان تحمّل بيانات المحل.',
    // login
    'Karamila': 'كراميلا', 'Enter your PIN': 'أدخل الرقم السري', 'Server settings': 'إعدادات السيرفر',
    'Connect your Google Sheet server to start': 'اربط سيرفر جوجل شيت عشان تبدأ', 'Checking…': 'جاري التحقق…',
    'Google Apps Script Web App URL': 'رابط Google Apps Script (Web App)', 'Test & Save': 'اختبار وحفظ',
    'Paste the /exec URL from Apps Script ▸ Deploy ▸ Manage deployments.': 'الصق رابط ‎/exec‎ من Apps Script ▸ Deploy ▸ Manage deployments.',
    'Server': 'السيرفر', 'Close': 'إغلاق', 'Connected ✓': 'تم الاتصال ✓',
    'Session expired — please log in again.': 'انتهت الجلسة — سجّل دخول تاني.',
    'Wrong PIN.': 'رقم سري غلط.', 'Wrong manager PIN.': 'رقم المدير السري غلط.', 'Manager PIN required.': 'لازم رقم المدير السري.',
    'PIN must be 4–8 digits.': 'الرقم السري لازم يكون من 4 لـ 8 أرقام.',
    'Too many wrong PINs. Try again in 10 minutes.': 'محاولات غلط كتير. حاول تاني بعد 10 دقايق.',
    'Server unreachable.': 'السيرفر مش متاح.', 'You are offline.': 'أنت غير متصل بالإنترنت.',
    // POS
    '1 · Barber': '1 · الحلاق', '2 · Services & products': '2 · الخدمات والمنتجات', 'Services': 'الخدمات', 'Products': 'المنتجات',
    'Free': 'متاح', 'Customer name or phone (optional)': 'اسم العميل أو رقمه (اختياري)', 'New customer name': 'اسم العميل الجديد',
    'Phone 01xxxxxxxxx': 'الموبايل 01xxxxxxxxx', 'Add': 'إضافة', 'NEW': 'جديد', 'Preferences': 'التفضيلات', 'Remove': 'إزالة',
    'Select a barber ↑': 'اختار الحلاق ↑', 'New ticket': 'فاتورة جديدة', 'Clear': 'مسح', 'Discard chair': 'إلغاء الكرسي',
    'Tap services to add them': 'اضغط على الخدمات لإضافتها', 'Subtotal': 'الإجمالي قبل الخصم', 'Total': 'الإجمالي',
    'Discount': 'خصم', '(needs approval)': '(محتاج موافقة)', '(approved)': '(متوافق عليه)', 'Start chair': 'ابدأ الكرسي',
    'Update chair': 'تحديث الكرسي', 'Cash': 'كاش', 'Vodafone': 'فودافون', 'Vodafone Cash': 'فودافون كاش', 'InstaPay': 'إنستاباي',
    'Pay & Save': 'ادفع واحفظ', 'Send for approval': 'إرسال للموافقة', 'No barber': 'مفيش حلاق', 'product': 'منتج',
    'Nothing here yet — add items in Settings.': 'مفيش حاجة هنا — ضيف من الإعدادات.',
    'No active barbers. Add them in Settings.': 'مفيش حلاقين نشطين. ضيفهم من الإعدادات.', 'No active barbers.': 'مفيش حلاقين نشطين.',
    'Retry': 'إعادة المحاولة', 'Dismiss all': 'إخفاء الكل', 'Sale': 'بيع', 'Chair': 'كرسي', 'Expense': 'مصروف', 'Customer': 'عميل',
    'Today': 'اليوم', 'Saved': 'تم الحفظ', 'Sent for approval': 'اتبعت للموافقة',
    // toasts
    'Select a barber first': 'اختار الحلاق الأول', 'Add a service or product': 'ضيف خدمة أو منتج', 'Add items first': 'ضيف أصناف الأول',
    'Chair started': 'بدأ الكرسي', 'Chair updated': 'اتحدث الكرسي', 'Discount approved': 'الخصم اتوافق عليه',
    'Discount will be sent for approval': 'الخصم هيتبعت للمدير للموافقة', 'Enter the customer name': 'اكتب اسم العميل',
    'Enter a valid phone number': 'اكتب رقم موبايل صحيح', 'Name and a valid phone are required': 'لازم اسم ورقم موبايل صحيح',
    'That chair was closed on another device.': 'الكرسي ده اتقفل من جهاز تاني.',
    'Discount removed — bill is now smaller than the discount.': 'الخصم اتشال — الفاتورة بقت أقل من الخصم.',
    'Offline — working from saved data': 'غير متصل — شغال من البيانات المحفوظة', 'Invoice cancelled': 'الفاتورة اتلغت',
    'Already waiting for approval': 'مستني موافقة بالفعل', 'Cancellation sent to manager': 'طلب الإلغاء اتبعت للمدير',
    'Approved': 'تمت الموافقة', 'Rejected': 'اترفض', 'Enter an amount': 'اكتب المبلغ', 'Expense saved': 'المصروف اتحفظ',
    'Deleted': 'اتمسح', 'Settings saved': 'الإعدادات اتحفظت', 'Barber saved': 'الحلاق اتحفظ', 'Price list updated': 'الأسعار اتحدثت',
    'PIN changed. Other devices must log in again.': 'الرقم السري اتغير. باقي الأجهزة لازم تسجل دخول تاني.',
    'Data reloaded': 'البيانات اتحدثت', 'End date is before start date': 'تاريخ النهاية قبل تاريخ البداية',
    'New version available — tap to update': 'فيه نسخة جديدة — اضغط للتحديث', 'Wait until all items are synced': 'استنى لحد ما كل حاجة تترفع',
    "That doesn't look like an Apps Script /exec URL": 'ده مش شكل رابط Apps Script ‎/exec‎',
    // discount modal
    'Amount': 'المبلغ', 'Reason': 'السبب', 'Regular customer': 'عميل دايم', 'Friends & family': 'أصحاب وعيلة', 'Promo': 'عرض',
    'Complaint': 'شكوى', 'Manager PIN': 'رقم المدير السري', '(approve now)': '(موافقة فورية)',
    "Leave empty to send the request to the manager's dashboard. The sale will be held until approved.": 'سيبه فاضي عشان الطلب يروح للوحة المدير. الفاتورة هتستنى لحد الموافقة.',
    'Cancel': 'إلغاء', 'Apply': 'تطبيق', 'Enter a discount amount.': 'اكتب قيمة الخصم.', 'Discount is bigger than the bill.': 'الخصم أكبر من الفاتورة.',
    'Offline — leave PIN empty to send for approval.': 'غير متصل — سيب الرقم السري فاضي عشان يتبعت للموافقة.',
    // today / void / notes
    "Today's tickets": 'فواتير النهارده', 'No tickets yet today.': 'مفيش فواتير النهارده لسه.',
    'PAID': 'مدفوع', 'PENDING': 'معلّق', 'VOID': 'ملغي', 'QUEUED': 'في الانتظار', 'OPEN': 'مفتوح',
    'Cancel invoice': 'إلغاء الفاتورة', 'Reason (required)': 'السبب (إجباري)', 'Manager PIN (optional — cancels now)': 'رقم المدير السري (اختياري — يلغي فورًا)',
    'Without a PIN, the request goes to the manager for approval.': 'من غير رقم سري، الطلب هيروح للمدير للموافقة.',
    'Back': 'رجوع', 'Request cancel': 'طلب إلغاء', 'Please write a reason.': 'اكتب السبب من فضلك.',
    'Preferences & notes (style, clipper number, allergies…)': 'التفضيلات والملاحظات (القصة، رقم الماكينة، حساسية…)',
    'Name': 'الاسم', 'Phone': 'الموبايل', 'e.g. Skin fade #1, no line-up': 'مثلًا: سكين فيد 1، من غير تحديد', 'Save': 'حفظ',
    // dashboard
    'Yesterday': 'امبارح', '7 days': '7 أيام', 'This month': 'الشهر ده', 'Last month': 'الشهر اللي فات', 'Custom': 'مخصص',
    'Total revenue': 'إجمالي الإيراد', 'Net profit': 'صافي الربح', 'Commissions': 'العمولات', 'Services / Products': 'خدمات / منتجات',
    'Revenue − (Commissions + Expenses)': 'الإيراد − (العمولات + المصاريف)', 'Live chairs': 'الكراسي دلوقتي', 'Walk-in': 'زبون عابر',
    'No service yet': 'لسه مفيش خدمة', 'Who cut what': 'مين عمل إيه', 'Full log →': 'السجل الكامل ←',
    'No transactions in this period.': 'مفيش عمليات في الفترة دي.', 'Time': 'الوقت', 'Barber': 'الحلاق', 'Service / Product': 'الخدمة / المنتج',
    'Payment': 'الدفع', 'Commission': 'العمولة', 'Status': 'الحالة', 'DISCOUNT': 'خصم', 'CANCEL INVOICE': 'إلغاء فاتورة',
    'Reject': 'رفض', 'Approve': 'موافقة', 'Ticket not found': 'الفاتورة مش موجودة', 'Cancel invoice ': 'إلغاء الفاتورة',
    // log
    'Search service, customer, phone…': 'ابحث بالخدمة أو العميل أو الموبايل…', 'All barbers': 'كل الحلاقين', 'All payments': 'كل طرق الدفع',
    'All statuses': 'كل الحالات', 'CSV': 'Excel',
    // payroll
    'Total sales': 'إجمالي المبيعات', 'Barbers earned': 'عمولات الحلاقين', 'Shop net cut': 'نصيب المحل', 'before expenses': 'قبل المصاريف',
    'Export CSV': 'تصدير Excel', 'Tickets': 'الفواتير', 'Shop cut': 'نصيب المحل',
    // approvals
    'Refresh': 'تحديث', 'Nothing waiting for you.': 'مفيش حاجة مستنياك.',
    // expenses
    'Quick expenses': 'مصاريف سريعة', 'Fixed / other expense': 'مصروف ثابت / آخر', 'Note (optional)': 'ملاحظة (اختياري)',
    'Expenses in period': 'المصاريف في الفترة', 'FIXED': 'ثابت', 'DAILY': 'يومي', '(queued)': '(في الانتظار)', 'No expenses yet.': 'مفيش مصاريف لسه.',
    'Hospitality': 'ضيافة', 'Cleaning': 'نظافة', 'Quick Maintenance': 'صيانة سريعة', 'Rent': 'إيجار', 'Electricity': 'كهرباء',
    'Water': 'مياه', 'Internet': 'إنترنت', 'Salaries': 'مرتبات', 'Supplies': 'مستلزمات', 'Other': 'أخرى',
    // settings
    'Commission rules': 'قواعد العمولة', 'Default barber cut per sale. Override per barber below.': 'نسبة الحلاق الافتراضية من كل بيعة. تقدر تغيّرها لكل حلاق تحت.',
    'Services %': 'الخدمات %', 'Products %': 'المنتجات %', 'Barbers': 'الحلاقين', 'Services & products (price list)': 'الخدمات والمنتجات (قائمة الأسعار)',
    'Product': 'منتج', 'Service': 'خدمة', 'hidden': 'مخفي', 'inactive': 'غير نشط', 'Shop': 'المحل', 'Shop name': 'اسم المحل', 'Currency': 'العملة',
    'Quick expense buttons (comma separated)': 'أزرار المصاريف السريعة (افصل بفاصلة)', 'Fixed expense categories': 'أنواع المصاريف الثابتة',
    'Security · PINs': 'الأمان · الأرقام السرية', 'Changing a PIN logs out every device.': 'تغيير الرقم السري بيخرّج كل الأجهزة.',
    'Cashier PIN': 'رقم الكاشير السري', 'Current manager PIN': 'رقم المدير السري الحالي', 'New PIN': 'الرقم السري الجديد', 'Change PIN': 'تغيير الرقم السري',
    'App': 'التطبيق', 'Server URL': 'رابط السيرفر', 'Reload data': 'تحديث البيانات', 'Edit barber': 'تعديل حلاق', 'Add barber': 'إضافة حلاق',
    'Photo URL (https://… optional)': 'رابط صورة (https://… اختياري)', 'Default': 'افتراضي', 'Order': 'الترتيب',
    'Active (shown on POS)': 'نشط (يظهر في الكاشير)', 'Edit item': 'تعديل صنف', 'Add item': 'إضافة صنف', 'Price': 'السعر',
    // confirm
    'Confirm': 'تأكيد', 'Log out of this device?': 'تسجيل خروج من الجهاز ده؟', 'Open chair': 'افتح الكرسي',
    "Discard the current unsaved ticket and open this barber's chair?": 'تلغي الفاتورة الحالية اللي مش محفوظة وتفتح كرسي الحلاق ده؟',
    'Discard this open chair? (No sale is recorded.)': 'تلغي الكرسي المفتوح ده؟ (مش هيتسجل أي بيع.)', 'Discard': 'إلغاء',
    'Delete this expense?': 'تمسح المصروف ده؟', 'Delete': 'مسح', 'Cancel invoice?': 'إلغاء الفاتورة؟',
    // server messages
    'Please select a barber.': 'اختار الحلاق من فضلك.', 'Add at least one service or product.': 'ضيف خدمة أو منتج على الأقل.',
    'New customer needs a name and a phone number.': 'العميل الجديد محتاج اسم ورقم موبايل.', 'Only paid tickets can be cancelled.': 'ينفع تلغي الفواتير المدفوعة بس.',
    'Please write a reason for the cancellation.': 'اكتب سبب الإلغاء.', 'Only the manager can log fixed expenses.': 'المدير بس اللي يسجل المصاريف الثابتة.',
    'Manager PIN must be 6–8 digits.': 'رقم المدير لازم يكون من 6 لـ 8 أرقام.', 'Cashier PIN must be 4–8 digits.': 'رقم الكاشير لازم يكون من 4 لـ 8 أرقام.',
    'Manager and cashier PINs must be different.': 'رقم المدير ورقم الكاشير لازم يكونوا مختلفين.', 'Manager access only.': 'للمدير بس.',
    'Enter a valid amount.': 'اكتب مبلغ صحيح.', 'Discount is larger than the bill.': 'الخصم أكبر من الفاتورة.',
    // loyalty
    'Loyalty': 'المكافآت', 'Loyalty program': 'برنامج المكافآت', 'Rewards': 'المكافآت', 'Card': 'الكارت', 'Rewards card': 'كارت المكافآت',
    'Joins the rewards program automatically with this visit.': 'هيدخل برنامج المكافآت أوتوماتيك مع الزيارة دي.',
    'Program paused — visits are not counted.': 'البرنامج متوقف — الزيارات مش بتتحسب.', 'Reward applied': 'المكافأة اتطبقت',
    'Reward available!': 'فيه مكافأة جاهزة!', 'On the next haircut': 'على الحلاقة الجاية', 'Apply': 'تطبيق',
    'Add a haircut to use the reward': 'ضيف حلاقة عشان تستخدم المكافأة', '🎁 Loyalty reward': '🎁 مكافأة الولاء', 'Later': 'بعدين',
    'Reward approved': 'المكافأة اتوافق عليها', 'Add a haircut to use the reward, or remove the reward': 'ضيف حلاقة عشان تستخدم المكافأة، أو شيل المكافأة',
    'Link copied': 'اللينك اتنسخ', 'New code created': 'اتعمل كود جديد', 'Reset': 'إعادة تعيين',
    'Create a new code and link? The old ones stop working immediately.': 'تعمل كود ولينك جداد؟ القديم هيقف فورًا.',
    'Program rules saved': 'قواعد البرنامج اتحفظت', 'Pick at least one eligible service': 'اختار خدمة مؤهلة واحدة على الأقل',
    'Allow pop-ups to print': 'اسمح بالنوافذ المنبثقة عشان تطبع', 'Loading card…': 'جاري تحميل الكارت…',
    'Needs internet to load the card.': 'محتاج إنترنت عشان الكارت يتحمل.', 'Progress': 'التقدم',
    'Customer scans this with their phone camera': 'العميل يمسح الكود ده بكاميرا موبايله', 'Secret code': 'الكود السري',
    'WhatsApp': 'واتساب', 'Copy link': 'نسخ اللينك', 'Reset code & link (if leaked)': 'إعادة تعيين الكود واللينك (لو اتسربوا)',
    "Send it only to the customer's own number. The code + phone (or the link) open their rewards page.": 'ابعته على رقم العميل نفسه بس. الكود + رقم الموبايل (أو اللينك) بيفتحوا صفحة مكافآته.',
    'Active': 'شغال', 'Paused': 'متوقف', 'Enrolled customers': 'العملاء المشتركين', 'Close to a reward': 'قربوا من المكافأة',
    '1–2 visits away': 'فاضلهم زيارة أو اتنين', 'Unused rewards': 'مكافآت مستخدمتش', 'Rewards redeemed': 'مكافآت اتستخدمت',
    'Loyalty discounts': 'خصومات المكافآت', 'Total given through rewards': 'إجمالي اللي اتخصم بالمكافآت', 'Qualifying visits': 'الزيارات المؤهلة',
    'All time': 'من البداية', 'Customers': 'العملاء', 'Program rules': 'قواعد البرنامج', 'QR & link': 'QR واللينك',
    'Search name or phone…': 'ابحث بالاسم أو الرقم…', 'Excel': 'إكسل', 'No customers found.': 'مفيش عملاء.', 'Visits': 'الزيارات',
    'Last visit': 'آخر زيارة', 'History': 'السجل', 'Showing first 300 — use search.': 'بيظهر أول 300 — استخدم البحث.',
    'No rewards yet.': 'مفيش مكافآت لسه.', 'Reward': 'المكافأة', 'Issued': 'اتصرفت', 'AVAILABLE': 'متاحة', 'REDEEMED': 'اتستخدمت',
    'RESERVED': 'محجوزة', 'EXPIRED': 'انتهت', 'REVOKED': 'اتسحبت', 'No visits yet.': 'مفيش زيارات لسه.',
    'USED FOR REWARD': 'اتحسبت في مكافأة', 'COUNTING': 'بتتحسب', 'CANCELLED': 'ملغية', 'Program active': 'البرنامج شغال',
    'Paused = visits are not counted and no new rewards are issued. Rewards already earned can still be used.': 'متوقف = الزيارات مش بتتحسب ومفيش مكافآت جديدة. المكافآت اللي اتكسبت قبل كده لسه تنفع.',
    'Visits needed': 'عدد الزيارات المطلوب', 'Reward type': 'نوع المكافأة', 'Percentage off': 'خصم نسبة %', 'Fixed amount off': 'خصم مبلغ ثابت',
    'Reward value (': 'قيمة المكافأة (', 'Eligible services': 'الخدمات المؤهلة', '(earn visits & get the discount)': '(بتتحسب زيارة وعليها الخصم)',
    'Auto-selected haircut services. Save to lock your choice.': 'اتختارت خدمات الحلاقة أوتوماتيك. احفظ عشان تثبت اختيارك.',
    'Product purchases count as visits': 'شراء المنتجات يتحسب زيارة', 'Off by default.': 'مقفول افتراضيًا.',
    'Reward valid for the next visit only': 'المكافأة صالحة للزيارة الجاية بس',
    "If the customer comes for a haircut and the reward isn't used, it is lost.": 'لو العميل جه حلق ومستخدمش المكافأة، بتضيع.',
    'Cashier needs manager approval to redeem': 'الكاشير محتاج موافقة المدير عشان يطبق المكافأة',
    'Same flow as discounts: manager PIN now, or the sale waits on the dashboard.': 'زي الخصومات: رقم المدير دلوقتي، أو الفاتورة تستنى في لوحة التحكم.',
    'The discounted visit also counts toward the next reward': 'الزيارة اللي عليها الخصم تتحسب في المكافأة الجاية',
    'Off = the free/discounted haircut starts the new cycle at 0.': 'مقفول = الحلاقة اللي عليها الخصم بتبدأ الدورة الجديدة من 0.',
    'Reward expires after (days)': 'المكافأة تنتهي بعد (أيام)', '0 = never expires': '0 = مش بتنتهي', 'Save program rules': 'حفظ قواعد البرنامج',
    'Changes apply to new rewards. Rewards already issued keep their value.': 'التعديلات بتسري على المكافآت الجديدة. اللي اتصرفت بتفضل بقيمتها.',
    'Public rewards page': 'صفحة المكافآت للعملاء', 'Print poster': 'اطبع البوستر',
    "Print this QR for the mirror or the cashier desk. Customers scan it, type their phone number and the 6-digit code from their WhatsApp card, and see their progress. Nobody can see anything with a phone number alone.": 'اطبع الـ QR ده وحطه على المراية أو الكاشير. العميل يمسحه، يكتب رقمه والكود (6 أرقام) اللي وصله على واتساب، ويشوف تقدمه. محدش يقدر يشوف حاجة برقم الموبايل لوحده.',
    "Each customer's personal card (QR + code) is in POS ▸ customer ▸ Card, or in the Customers tab here.": 'الكارت الشخصي لكل عميل (QR + كود) موجود في الكاشير ▸ العميل ▸ الكارت، أو في تبويب العملاء هنا.',
    'Reward not found.': 'المكافأة مش موجودة.', 'This reward belongs to another customer.': 'المكافأة دي بتاعة عميل تاني.',
    'This reward has expired.': 'المكافأة دي انتهت.', 'This reward was already used.': 'المكافأة دي اتستخدمت قبل كده.',
    'Add an eligible service (haircut) to use the reward.': 'ضيف خدمة مؤهلة (حلاقة) عشان تستخدم المكافأة.',
    'Reward value is zero for this service.': 'قيمة المكافأة صفر للخدمة دي.', 'Required visits must be 1–50.': 'عدد الزيارات لازم من 1 لـ 50.',
    'Reward percentage must be 1–100%.': 'نسبة المكافأة لازم من 1 لـ 100%.', 'Enter a valid reward amount.': 'اكتب قيمة مكافأة صحيحة.',
    'Expiry must be 0–3650 days.': 'مدة الصلاحية لازم من 0 لـ 3650 يوم.', 'Customer not found.': 'العميل مش موجود.',
  };

  var MONTHS = { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر' };

  // [regex on the whole (trimmed) string, replacement function]
  var P = [
    [/^Offline · (\d+) queued$/, function (m) { return 'غير متصل · ' + m[1] + ' في الانتظار'; }],
    [/^Syncing (\d+)$/, function (m) { return 'جاري الرفع ' + m[1]; }],
    [/^Today ·$/, function () { return 'اليوم ·'; }],
    [/^(\d+) visits$/, function (m) { return m[1] + ' زيارة'; }],
    [/^Last: (.*)$/, function (m) { return 'آخر زيارة: ' + tr(m[1]); }],
    [/^with (.+)$/, function (m) { return 'مع ' + m[1]; }],
    [/^In chair · (\d+) min$/, function (m) { return 'في الكرسي · ' + m[1] + ' دقيقة'; }],
    [/^(\d+) min$/, function (m) { return m[1] + ' دقيقة'; }],
    [/^(\d+)m$/, function (m) { return m[1] + 'د'; }],
    [/^(\d+) items?$/, function (m) { return m[1] + ' صنف'; }],
    [/^(\d+) tickets$/, function (m) { return m[1] + ' فاتورة'; }],
    [/^avg (.+)$/, function (m) { return 'متوسط ' + tr(m[1]); }],
    [/^Shop cut (.+)$/, function (m) { return 'نصيب المحل ' + tr(m[1]); }],
    [/^Variable (.+)$/, function (m) { return 'يومي ' + tr(m[1]); }],
    [/^Fixed (.+)$/, function (m) { return 'ثابت ' + tr(m[1]); }],
    [/^(\d+)% of revenue$/, function (m) { return m[1] + '% من الإيراد'; }],
    [/^Discounts (.+)$/, function (m) { return 'خصومات ' + tr(m[1]); }],
    [/^(\d+) voided$/, function (m) { return m[1] + ' ملغي'; }],
    [/^Pending approvals · (\d+)$/, function (m) { return 'موافقات معلقة · ' + m[1]; }],
    [/^by (cashier|manager)$/, function (m) { return 'من ' + (m[1] === 'cashier' ? 'الكاشير' : 'المدير'); }],
    [/^Bill (.+)$/, function (m) { return 'الفاتورة ' + tr(m[1]); }],
    [/^Bill:$/, function () { return 'الفاتورة:'; }],
    [/^Bill: (.+)$/, function (m) { return 'الفاتورة: ' + tr(m[1]); }],
    [/^Commission is locked at sale time using the barber's rate then \(default (\d+(?:\.\d+)?)% services · (\d+(?:\.\d+)?)% products\)\. Discounts reduce commission proportionally; voided invoices are excluded\.$/, function (m) { return 'العمولة بتتثبت وقت البيع بنسبة الحلاق وقتها (الافتراضي ' + m[1] + '% خدمات · ' + m[2] + '% منتجات). الخصم بيقلل العمولة بنفس النسبة، والفواتير الملغية مش محسوبة.'; }],
    [/^Refund\/cancel$/, function () { return 'استرجاع/إلغاء'; }],
    [/^Reason: (.*)$/, function (m) { return 'السبب: ' + m[1]; }],
    [/^(\d+) rows$/, function (m) { return m[1] + ' عملية'; }],
    [/^Paid:$/, function () { return 'المدفوع:'; }],
    [/^Commission:$/, function () { return 'العمولة:'; }],
    [/^Paid total:$/, function () { return 'إجمالي المدفوع:'; }],
    [/^discount$/, function () { return 'خصم'; }],
    [/^Services (\d+(?:\.\d+)?)% \(default\)$/, function (m) { return 'الخدمات ' + m[1] + '% (افتراضي)'; }],
    [/^Products (\d+(?:\.\d+)?)% \(default\)$/, function (m) { return 'المنتجات ' + m[1] + '% (افتراضي)'; }],
    [/^Services (\d+(?:\.\d+)?)%$/, function (m) { return 'الخدمات ' + m[1] + '%'; }],
    [/^Products (\d+(?:\.\d+)?)%$/, function (m) { return 'المنتجات ' + m[1] + '%'; }],
    [/^Amount \((.+)\)$/, function (m) { return 'المبلغ (' + tr(m[1]) + ')'; }],
    [/^(\d+) unsynced item\(s\) will upload after login\.$/, function (m) { return m[1] + ' عملية مش مترفوعة هتترفع بعد تسجيل الدخول.'; }],
    [/^(\d+) item\(s\) were rejected by the server$/, function (m) { return m[1] + ' عملية اترفضت من السيرفر'; }],
    [/^(\d+) item\(s\) are not synced yet\. They stay on this device and upload after the next login\. Log out\?$/, function (m) { return m[1] + ' عملية لسه مترفعتش. هتفضل على الجهاز وتترفع بعد تسجيل الدخول الجاي. تسجيل خروج؟'; }],
    [/^Loaded (.+)'s chair$/, function (m) { return 'اتفتح كرسي ' + m[1]; }],
    [/^(.+) already has an open chair$/, function (m) { return m[1] + ' عنده كرسي مفتوح بالفعل'; }],
    [/^Chair started — (.+)$/, function (m) { return 'بدأ الكرسي — ' + m[1]; }],
    [/^Chair updated — (.+)$/, function (m) { return 'اتحدث الكرسي — ' + m[1]; }],
    [/^Found existing: (.+)$/, function (m) { return 'موجود بالفعل: ' + m[1]; }],
    [/^(.+): (.+) saved$/, function (m) { return tr(m[1]) + ': ' + tr(m[2]) + ' اتحفظ'; }],
    [/^(Sale|Chair|Discard chair|Expense|Customer) not saved: (.+)$/, function (m) { return tr(m[1]) + ' مااتحفظش: ' + tr(m[2]); }],
    [/^✅ Discount approved — (.+)$/, function (m) { return '✅ الخصم اتوافق عليه — ' + m[1]; }],
    [/^❌ Discount rejected — (.+) is back in the chair\. Collect the full price\.$/, function (m) { return '❌ الخصم اترفض — ' + m[1] + ' رجع للكرسي. حصّل المبلغ كامل.'; }],
    [/^Invoice cancelled — (.+)$/, function (m) { return 'الفاتورة اتلغت — ' + m[1]; }],
    [/^Cancellation rejected — (.+)$/, function (m) { return 'الإلغاء اترفض — ' + m[1]; }],
    [/^Could not connect: (.+)$/, function (m) { return 'مقدرتش أتصل: ' + tr(m[1]); }],
    [/^(.+) already has an open chair \((.+)\)\.$/, function (m) { return m[1] + ' عنده كرسي مفتوح بالفعل (' + tr(m[2]) + ').'; }],
    [/^(\d+(?:\.\d+)?)% off$/, function (m) { return 'خصم ' + m[1] + '%'; }],
    [/^([\d,.]+ [A-Za-z.]{2,4}) off$/, function (m) { return 'خصم ' + finish(m[1]); }],
    [/^(\d+) qualifying visits → (.+) the next haircut$/, function (m) { return m[1] + ' زيارات مؤهلة ← ' + tr(m[2]) + ' على الحلاقة الجاية'; }],
    [/^valid (\d+) days$/, function (m) { return 'صالحة ' + m[1] + ' يوم'; }],
    [/^next visit only$/, function () { return 'الزيارة الجاية بس'; }],
    [/^of (\d+) customers$/, function (m) { return 'من ' + m[1] + ' عميل'; }],
    [/^(\d+) customers waiting$/, function (m) { return m[1] + ' عميل مستني'; }],
    [/^(\d+) issued$/, function (m) { return m[1] + ' اتصرفت'; }],
    [/^(\d+) expired$/, function (m) { return m[1] + ' انتهت'; }],
    [/^🎁 (\d+) ready$/, function (m) { return '🎁 ' + m[1] + ' جاهزة'; }],
    [/^(\d+) used$/, function (m) { return m[1] + ' اتستخدمت'; }],
    [/^expires (.+)$/, function (m) { return 'تنتهي ' + finish(m[1]); }],
    [/^(\d+) more visits? to the next reward$/, function (m) { return 'فاضل ' + m[1] + ' زيارة للمكافأة الجاية'; }],
    [/^🎁 (\d+) reward\(s\) ready$/, function (m) { return '🎁 ' + m[1] + ' مكافأة جاهزة'; }],
    [/^Total qualifying visits: (\d+)$/, function (m) { return 'إجمالي الزيارات المؤهلة: ' + m[1]; }],
    [/^(\d+) qualifying visits$/, function (m) { return m[1] + ' زيارة مؤهلة'; }],
    [/^(\d+)\/(\d+) now$/, function (m) { return m[1] + '/' + m[2] + ' دلوقتي'; }],
    [/^Off by default \((\d+) products\)\.$/, function (m) { return 'مقفول افتراضيًا (' + m[1] + ' منتج).'; }],
    [/^Loyalty reward (.+?)( \(needs approval\))?$/, function (m) { return 'مكافأة الولاء ' + tr(m[1]) + (m[2] ? ' (محتاجة موافقة)' : ''); }],
    [/^Loyalty (.+)$/, function (m) { return 'المكافآت ' + finish(m[1]); }],
    [/^On ([^·]+)$/, function (m) { return 'على ' + m[1]; }],
    [/^(.+) · −(.+)\. Rewards need manager approval\.$/, function (m) { return tr(m[1]) + ' · −' + finish(m[2]) + '. المكافآت محتاجة موافقة المدير.'; }],
    [/^−(.+) discount \(🎁 (.+) reward\)$/, function (m) { return '−' + finish(m[1]) + ' خصم (🎁 ' + finish(m[2]) + ' مكافأة)'; }],
    [/^−(.+) discount$/, function (m) { return '−' + finish(m[1]) + ' خصم'; }],
    [/^Reward applied: −(.+)$/, function (m) { return 'المكافأة اتطبقت: −' + finish(m[1]); }],
    [/^(.+) added for the reward$/, function (m) { return 'اتضافت ' + m[1] + ' عشان المكافأة'; }],
    [/^🎁 Reward redeemed for (.+) — new cycle started$/, function (m) { return '🎁 المكافأة اتستخدمت لـ ' + m[1] + ' — بدأت دورة جديدة'; }],
    [/^🎉 (.+) just unlocked a reward! Send the card on WhatsApp\.$/, function (m) { return '🎉 ' + m[1] + ' كسب مكافأة! ابعتله الكارت على واتساب.'; }],
    [/^🎁 (.+) has a reward ready: (.+)$/, function (m) { return '🎁 ' + m[1] + ' عنده مكافأة جاهزة: ' + tr(m[2]); }],
    [/^Loyalty reward not applied: (.+?) The sale was sent to the manager for approval\.$/, function (m) { return 'المكافأة متطبقتش: ' + tr(m[1]) + ' الفاتورة راحت للمدير للموافقة.'; }],
    [/^walk-in$/, function () { return 'زبون عابر'; }],
    [/^v(\d+\.\d+\.\d+)(.*)$/, function (m) { return 'v' + m[1] + m[2]; }],
  ];

  function finish(s) {
    return s.replace(/\bEGP\b/g, 'ج.م')
      .replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, function (_, d, mo) { return d + ' ' + MONTHS[mo]; });
  }

  function tr(core) {
    if (!core) return core;
    if (Object.prototype.hasOwnProperty.call(D, core)) return D[core];
    for (var i = 0; i < P.length; i++) {
      var m = core.match(P[i][0]);
      if (m) return P[i][1](m);
    }
    if (core.indexOf(' · ') > 0) return core.split(' · ').map(function (p) { return tr(p.trim()); }).join(' · ');
    if (core.indexOf(' — ') > 0) return core.split(' — ').map(function (p) { return tr(p.trim()); }).join(' — ');
    return finish(core);
  }

  function translate(s) {
    if (!s || !/[A-Za-z]/.test(s)) return s;
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    var core = s.trim();
    if (!core) return s;
    var out = finish(tr(core));
    return out === core ? s : lead + out + trail;
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SVG: 1 };
  function translateNode(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var p = root.parentNode;
      if (p && !SKIP[p.nodeName] && !p.closest('[data-noi18n]')) {
        var v = translate(root.nodeValue);
        if (v !== root.nodeValue) root.nodeValue = v;
      }
      return;
    }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || root.closest && root.closest('svg,[data-noi18n]')) return;
    // keep <option> values stable before translating their text
    var opts = root.nodeName === 'OPTION' ? [root] : root.querySelectorAll('option');
    for (var o = 0; o < opts.length; o++) if (!opts[o].hasAttribute('value')) opts[o].setAttribute('value', opts[o].textContent);
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('[placeholder],[title]')));
    for (var i = 0; i < els.length; i++) {
      ['placeholder', 'title'].forEach(function (a) {
        if (els[i].hasAttribute && els[i].hasAttribute(a)) {
          var cur = els[i].getAttribute(a), t = translate(cur);
          if (t !== cur) els[i].setAttribute(a, t);
        }
      });
    }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(translateNode);
  }

  /* ------------------------------ toggle ------------------------------ */
  function setLang(l) {
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { /* ignore */ }
    location.reload();
  }
  function toggleBtn(cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'lang-btn';
    b.setAttribute('data-noi18n', '');
    b.className = cls;
    b.textContent = AR_MODE ? 'EN' : 'عربي';
    b.title = AR_MODE ? 'Switch to English' : 'التحويل للعربي';
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setLang(AR_MODE ? 'en' : 'ar'); });
    return b;
  }
  function ensureToggle() {
    var logout = document.querySelector('#shell [data-act="logout"]');
    var floating = document.getElementById('lang-float');
    if (logout) {
      if (floating) floating.remove();
      if (!document.getElementById('lang-btn')) logout.parentNode.insertBefore(toggleBtn('rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-700'), logout);
    } else if (!floating && document.body) {
      var wrap = document.createElement('div');
      wrap.id = 'lang-float';
      wrap.setAttribute('data-noi18n', '');
      wrap.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));inset-inline-end:12px;z-index:55';
      wrap.appendChild(toggleBtn('rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-slate-700'));
      document.body.appendChild(wrap);
    }
  }

  /* ------------------------------ RTL CSS ------------------------------ */
  if (AR_MODE) {
    var css = [
      '[dir=rtl] body{font-family:"Segoe UI",Tahoma,"Noto Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif}',
      '[dir=rtl] .ml-auto{margin-left:0!important;margin-right:auto!important}',
      '[dir=rtl] .mr-auto{margin-right:0!important;margin-left:auto!important}',
      '[dir=rtl] .ml-1{margin-left:0!important;margin-right:.25rem!important}',
      '[dir=rtl] .ml-4{margin-left:0!important;margin-right:1rem!important}',
      '[dir=rtl] .text-left{text-align:right!important}',
      '[dir=rtl] .text-right{text-align:left!important}',
      '[dir=rtl] .left-3{left:auto!important;right:.75rem!important}',
      '[dir=rtl] .right-2{right:auto!important;left:.5rem!important}',
      '[dir=rtl] .right-1\\/4{right:auto!important;left:25%!important}',
      '[dir=rtl] .pl-10{padding-left:.75rem!important;padding-right:2.5rem!important}',
      '[dir=rtl] .tracking-widest,[dir=rtl] .tracking-wider,[dir=rtl] .tracking-tight{letter-spacing:0!important}',
      '[dir=rtl] .uppercase{text-transform:none!important}',
      '[dir=rtl] input[type=number],[dir=rtl] input[type=tel],[dir=rtl] input[inputmode=tel],[dir=rtl] input[type=date]{direction:ltr;text-align:right}',
    ].join('\n');
    var st = document.createElement('style');
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------ observer ------------------------------ */
  var pending = [];
  var scheduled = false;
  function flush() {
    scheduled = false;
    var nodes = pending; pending = [];
    if (AR_MODE) nodes.forEach(translateNode);
    ensureToggle();
  }
  function start() {
    if (AR_MODE) translateNode(document.body);
    ensureToggle();
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') pending.push(m.target);
        else if (m.type === 'attributes') pending.push(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) pending.push(m.addedNodes[j]);
      }
      if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  window.KARAMILA_I18N = { lang: lang, setLang: setLang, t: function (s) { return AR_MODE ? translate(s) : s; } };
})();
