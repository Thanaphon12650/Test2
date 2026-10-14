คู่มือติดตั้งเว็บค่าใช้จ่ายการเรียน + Supabase (ไม่ต้องสมัครสมาชิก)
===============================================================

วิธีนี้ใช้ Supabase Anonymous Auth ไม่ใช่การสร้าง user_id เองใน localStorage อย่างเดียว
Supabase จะสร้างบัญชีแบบไม่ระบุตัวตนให้แต่ละ browser profile และเก็บ session ไว้ใน browser
RLS ใช้ auth.uid() เพื่อแยกข้อมูล จึงไม่ต้องใส่ service_role key ในเว็บ

1) สร้างโปรเจกต์ Supabase
- เข้า https://supabase.com/ แล้วสร้าง Project
- ไปที่ SQL Editor > New query
- เปิดไฟล์ supabase-setup.sql คัดลอกทั้งหมด แล้ว Run

2) เปิด anonymous sign-in
- ใน Supabase Dashboard ไปที่ Authentication > Sign In / Providers (ชื่อเมนูอาจต่างกันเล็กน้อย)
- เปิด Anonymous sign-ins / Allow anonymous sign-ins
- หากมี CAPTCHA protection ให้ตั้งค่าตามความเหมาะสมเพื่อช่วยลดการสร้างบัญชีอัตโนมัติจำนวนมาก

3) นำค่า Supabase ไปใส่ใน script.js
- ไปที่ Project Settings > API (หรือหน้า Connect/API Keys ใน Dashboard รุ่นใหม่)
- คัดลอก Project URL ใส่แทนค่า SUPABASE_URL
- คัดลอก publishable key (sb_publishable_...) หรือ anon/public key แบบเก่า ใส่แทน SUPABASE_ANON_KEY
- ห้ามใช้ service_role หรือ secret key ในหน้าเว็บเด็ดขาด เพราะผู้เข้าชมสามารถอ่านโค้ดฝั่ง browser ได้

ตัวอย่างรูปแบบ (ใช้ค่าจริงจากโปรเจกต์ตัวเอง):
var SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
var SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";

4) อัปโหลดไป GitHub Pages
- ใส่ index.html, style.css, script.js และ supabase-setup.sql/README ไว้ใน repository เดียวกัน (SQL/README ไม่จำเป็นต้องอยู่ในเว็บก็ได้)
- Commit และ Push ขึ้น GitHub
- ใน repository ไป Settings > Pages
- เลือก Deploy from a branch, เลือก branch (เช่น main) และ folder /(root) แล้ว Save
- เปิด URL GitHub Pages รอโหลดแล้วทดสอบเพิ่ม/ลบรายการ

5) ทดสอบการแยกข้อมูล
- เปิดเว็บใน browser ปกติ บันทึกค่าใช้จ่ายหนึ่งรายการ
- เปิด URL เดียวกันใน browser profile แยก หรือหน้าต่าง private ใหม่ แล้วบันทึกอีกหนึ่งรายการ
- แต่ละ browser ควรเห็นเฉพาะข้อมูลของ session ตัวเอง
- หากล้าง site data/local storage หรือใช้ browser/device ใหม่ จะได้ anonymous user ใหม่และไม่เห็นข้อมูลเดิมโดยอัตโนมัติ
- anonymous user ไม่มีวิธีกู้บัญชีได้เหมือนบัญชีอีเมล หากข้อมูลสำคัญควรเพิ่มระบบเข้าสู่ระบบ/ส่งออกข้อมูลในอนาคต

ข้อควรทราบด้านความปลอดภัย
- Publishable/anon key มีไว้ให้ใช้ใน client ได้ แต่ต้องมี RLS policy ถูกต้องเสมอ
- ห้ามปิด RLS และห้ามสร้าง policy ที่เปิด SELECT/INSERT ให้ทุกคนโดยไม่ตรวจ auth.uid()
- anonymous sign-in ไม่ใช่การยืนยันตัวตนที่แข็งแรง: คนใช้หลายบัญชีได้ และหาก session ถูกขโมย ผู้ที่ได้ session อาจเข้าถึงข้อมูลบัญชีนั้นได้
- ข้อมูลใน Supabase เป็นข้อมูลออนไลน์จริง อย่าบันทึกรหัสผ่านหรือข้อมูลอ่อนไหวในช่องหมายเหตุ
- โค้ดนี้ยังไม่ได้ย้ายข้อมูลเก่าที่อยู่ใน localStorage ไป Supabase โดยอัตโนมัติ

แก้ปัญหาเบื้องต้น
- แจ้งว่าให้ตั้งค่า Supabase: ตรวจ SUPABASE_URL และ SUPABASE_ANON_KEY ใน script.js
- Anonymous sign-in disabled: เปิด Anonymous sign-ins ใน Authentication
- permission denied / RLS: รัน SQL setup ให้ครบ และตรวจว่าเปิด RLS อยู่
- Failed to fetch: ตรวจ URL, key, อินเทอร์เน็ต และว่าโปรเจกต์ Supabase ทำงานอยู่
