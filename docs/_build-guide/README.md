# إعادة توليد أدلة المستخدم (الحاج، الإداري، الموظف)

كل الأدلة مبنية من لقطات حقيقية للموقع التجريبي (`projects/sdhu_testing_website`) عبر Playwright ومتصفح Chrome المثبت على الجهاز.

## التشغيل
0. لإعادة كل لقطات دليل الإداري ودليل الموظف دفعة واحدة: `PY=<بايثون فيه Playwright> ./recapture_all.sh` — يحسب كل تشغيل نقطة استئنافه من ملف الـmanifest، فلا تُعدَّل الأرقام يدوياً إذا زادت لقطة أو نقصت. يعمل على Windows وعلى الماك (Chrome المثبت + `pip install playwright python-docx pillow`).
1. شغّل الموقع: `npm run build && npx next start -p 3001` داخل `sdhu_testing_website`.
2. الالتقاط (المتغير `CAP_DIR` يحدد مجلد اللقطات، والرقم = عدد اللقطات المحفوظة قبل إعادة التشغيل):
   - الحاج: `run1.py` ثم `run2.py 40` … (انظر تاريخ الجلسة)، في المجلد الجذري.
   - الإداري: `CAP_DIR=admin python adm_a.py 0` ← `adm_b.py 35` ← `adm_c.py 75 ret|head|deputy|tech|members`.
   - الموظف: `CAP_DIR=staff python adm_prep.py` (يجهّز مجموعة 40 بانتظار الاعتماد) ثم `stf_a.py 0 a|b|c|d` ← `stf_b.py N e|f|g|h` ← `stf_c.py N i|j|k|l|m`.
   - يحتاج `stf_b.py g` الحالة `admin/state-head-profile.json` التي ينتجها `adm_c.py head`.
3. تحويل اللقطات: `python -c "from cap import to_jpg; to_jpg()"` مع `CAP_DIR` المناسب.
4. البناء: `python build_docx.py <content|admin_content|staff_content> <.|admin|staff> <المسار.docx>`
5. تحديث الفهرس والطباعة إلى PDF: `powershell -File finalize.ps1 -Docx <docx> -Pdf <pdf>` — يحتاج Word على Windows. على الماك يُبنى ملف Word فقط، ويُحدَّث فهرسه تلقائياً عند فتحه في Word، ويبقى PDF لخطوة Windows.
6. إعادة الروابط القابلة للضغط إلى PDF (الطابعة تحذفها): `python pdf_links.py <pdf> <رابط الدليل>`

## ملاحظات
- نص كل دليل في ملف المحتوى الخاص به: كل خطوة = عنوان، شرح، مفتاح الصورة، ما يجب فعله، النتيجة، تنبيه/ملاحظة.
- الاتجاه RTL: الفقرات ثنائية الاتجاه، والمحاذاة «left» في Word = بداية السطر (اليمين)، كما ضُبط دليل الحاج يدوياً.
- الطباعة إلى PDF عبر «Microsoft Print to PDF» لأن التصدير المباشر يُفسد الأرقام بين الأقواس مع خط Qomra.
- رابط الموقع المنشور (`site_url` في META لكل دليل): الحاج ← الصفحة الرئيسية، الإداري ← `/administrator/`، الموظف ← `/staff/`. يضعه `build_docx.py` على الغلاف وفي آخر المقدمة. لإضافته إلى دليل موجود دون إعادة بنائه: `python add_site_link.py <content|admin_content|staff_content> <docx>`.
- السكن (السكن العام أو غرف خاصة يتوزع عليها أفراد الطلب): شغّل `run1.py` ثم `run2.py 40` في نسخة من المجلد خارج المستودع (فـ`run1.py` يمسح `manifest.json` المتتبَّع)، ثم `python patch_pilgrim_rooms.py <ذلك المجلد>` يبدّل لقطات المجموعة والدفع والملف الطبي ونصوصها في دليل الحاج دون إعادة بنائه.
- ملف الطيران: لقطاته في `adm_d.py 109` (بوابة الإداريين) و`stf_d.py 103 n` (بوابة الموظفين). دليل الحاج يُرقَّع في مكانه بـ`patch_pilgrim_flights.py` لأنه يحمل تعديلات الاتجاه اليدوية. عند تغيير شريط التنقل تُعاد كل اللقطات بـ`recapture_all.sh`.
