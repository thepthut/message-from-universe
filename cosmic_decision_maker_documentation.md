# ข้อความจากจักรวาล (Cosmic Decision Maker)

เว็บแอปพลิเคชันสุ่มข้อความนำทางชีวิตและการตัดสินใจ สไตล์มินิมอล ทำงานแบบ Client-side เต็มรูปแบบ ปลอดภัย ไม่บันทึกข้อมูลส่วนบุคคลของผู้ใช้ และออกแบบตามมาตรฐานเว็บสมัยใหม่

---

## 1. คุณสมบัติเด่นของระบบ (Core Features)

* **2 รูปแบบการใช้งาน (Dual Modes):**
  * **โหมดสุ่มเรื่อย ๆ (Free Mode):** สุ่มข้อความและเปิดไพ่ได้ทันที ไม่ต้องกรอกคำถาม เหมาะสำหรับการหาแนวคิดหรือไอเดียทั่วไป
  * **โหมดตั้งคำถามก่อนสุ่ม (Question Mode):** รองรับการพิมพ์คำถามความยาวไม่เกิน 120 ตัวอักษร มีระบบล้างคำถามในช่อง (Clear Button) และรักษาสถานะคำถามเดิมไว้เมื่อกด "ถามอีกครั้ง"
* **การ์ดผลลัพธ์แบบ Minimal (3 Actions Only):**
  * แสดงปุ่มควบคุม 3 ปุ่มหลังเปิดไพ่: `สุ่มใหม่อีกครั้ง` (หรือ `ถามอีกครั้ง`), `เปลี่ยนโหมด` และ `บันทึกภาพ / แชร์`
  * ตัดระบบคัดลอกข้อความ (Clipboard) ออกทั้งหมด เพื่อสนับสนุนการแชร์ผลลัพธ์ผ่านรูปภาพ
* **ระบบความปลอดภัยและความเป็นส่วนตัว (Privacy & Security):**
  * คำถามถูกประมวลผลในหน่วยความจำ (Memory) ของเบราว์เซอร์เท่านั้น ไม่มีการบันทึกลง LocalStorage/SessionStorage และไม่ส่งออกไปยังเซิร์ฟเวอร์
  * แสดงผลข้อความผ่านคุณสมบัติ `textContent` ทั้งหมด เพื่อตัดความเสี่ยงด้าน Cross-Site Scripting (XSS)
  * จัดการสคริปต์ภายนอกแบบ Self-hosted ทั้งหมด ไม่พึ่งพา CDN ภายนอก ทำงานภายใต้ Content Security Policy (CSP) ที่เข้มงวด
* **ระบบบันทึกและแชร์ภาพ (Canvas 2D Card Renderer):**
  * เรนเดอร์การ์ดผลลัพธ์เป็นไฟล์ PNG ความละเอียดสูงผ่าน HTML5 Canvas โดยตรง
  * มี 4 พรีเซ็ตมาตรฐาน: สตอรี่ 9:16 (1080×1920), สี่เหลี่ยม 1:1 (1080×1080), แนวตั้ง 4:5 (1080×1350), แนวนอน 16:9 (1920×1080)
  * รองรับการกำหนดขนาดเอง (300–4096 พิกเซล) พร้อมจำกัดพื้นที่รวมไม่เกิน 16 ล้านพิกเซล เพื่อป้องกันข้อผิดพลาดหน่วยความจำบน iOS Safari
  * คำนวณ Safe Zone สำหรับสตอรี่: วางตำแหน่งลายน้ำให้อยู่เหนือกึ่งกลางโซนอันตรายด้านล่างที่แอปพลิเคชันมักบัง
  * รองรับ Web Share API สำหรับสมาร์ตโฟน พร้อมปุ่มดาวน์โหลดไฟล์ตรง และมีฟังก์ชันแปลงเป็นภาพสำหรับแตะค้างบันทึกบน Safari
* **ระบบแบบอักษรภาษาไทยและการตัดคำ (Typography & Fallback):**
  * ใช้แบบอักษร **Sarabun** (น้ำหนัก 400 และ 600) แบบ Self-hosted WOFF2
  * ตัดคำภาษาไทยด้วย `Intl.Segmenter` และมี Fallback คัดแยกกลุ่มอักขระ (Grapheme Clusters) ที่ป้องกันการขึ้นต้นแถวด้วยสระตาม/วรรณยุกต์ และป้องกันการทิ้งสระหน้า (เ แ โ ใ ไ) ไว้ท้ายแถว
  * วาดสัญลักษณ์ไพ่ `✦` ด้วย Path Sparkle โดยตรง ไม่พึ่งพา Glyph ในฟอนต์ระบบ
* **ป็อบอัพคำเตือนตามมาตรฐาน (Disclaimer Dialog):**
  * แสดงผลผ่าน `<dialog>` ทุกครั้งที่มีการเปิดหรือรีเฟรชหน้าเว็บ เพื่อแจ้งเตือนว่าข้อความมีไว้เพื่อความบันเทิง พร้อมระบุช่องทางติดต่อสายด่วนสุขภาพจิต 1323

---

## 2. เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยีที่ใช้ | รายละเอียดทางเทคนิค |
| :--- | :--- | :--- |
| **Frontend** | HTML5 / CSS3 / Vanilla JS | พัฒนาด้วย Pure JavaScript ไม่มี Framework หรือ Bundler ภายนอก |
| **Backend & DB** | Supabase (PostgreSQL) | สุ่มข้อความผ่านฟังก์ชัน RPC (`get_random_messages`) |
| **Hosting & CI/CD** | Vercel | เชื่อมต่อ Git Integration อัปเดตเว็บอัตโนมัติเมื่อ Push โค้ด |
| **Image Generator** | HTML5 Canvas 2D API | ประมวลผลและส่งออกไฟล์ภาพ PNG บนฝั่ง Client |
| **Typography** | Sarabun (WOFF2) | แบบอักษรทางการ มีหัว สัญญาอนุญาต SIL Open Font License (OFL) |

---

## 3. โครงสร้างไฟล์ในโปรเจกต์ (File Structure)

```text
message-from-universe/
├── index.html              # มาร์กอัปหลัก โมดอลคำเตือน และโมดอลส่งออกภาพ
├── style.css               # สไตล์ แอนิเมชัน 3D ไพ่ การจัดวาง และ Responsive
├── app.js                  # State Machine, ดึงข้อมูล Supabase, Canvas Renderer
├── vercel.json             # นโยบายความปลอดภัยและส่วนหัว HTTP (CSP, Security Headers)
├── vendor/                 # ไลบรารีภายนอกแบบ Self-hosted
│   └── supabase.min.js     # Supabase JS Client v2.49.1
├── fonts/                  # ไฟล์แบบอักษรและสัญญาอนุญาต
│   ├── Sarabun-Regular.woff2
│   ├── Sarabun-SemiBold.woff2
│   └── OFL.txt             # ข้อความสัญญาอนุญาต SIL Open Font License
└── README.md               # เอกสารสถาปัตยกรรมและคู่มือการดูแลรักษาระบบ

---

## 4. สถาปัตยกรรมและกลไกการทำงานสำคัญ

### 4.1 Finite State Machine

ระบบควบคุมการแสดงผลและปุ่มกดผ่าน State Machine 5 สถานะ:

* `MODE_SELECT`: หน้าแรกสำหรับเลือกโหมดการเล่น
* `ASKING`: หน้าพิมพ์คำถาม (แสดงเฉพาะเมื่อเลือกโหมดคำถาม)
* `SHUFFLING`: แอนิเมชันสับไพ่และเริ่มดึงข้อมูลจากฐานข้อมูล
* `CHOOSING`: แจกไพ่ 3 ใบเสร็จสิ้น รอให้ผู้ใช้คลิกเลือก 1 ใบ
* `REVEALED`: เปิดผลลัพธ์ แสดงข้อความ และเปิดแถว 3 ปุ่มควบคุม

### 4.2 การป้องกัน Race Condition (Sequence Guards)

* `requestSequence`: ตรวจสอบรอบการสุ่มข้อมูล หากมีการกดเปลี่ยนโหมดหรือส่งคำถามใหม่ขณะที่คำขอยังประมวลผลไม่เสร็จ คำขอเดิมจะถูกยกเลิกทันที
* `previewSequence`: ตรวจสอบรอบการเรนเดอร์ภาพ Canvas หากมีการเปลี่ยนตัวเลือกหรือขนาดภาพ คิวการวาดและการแปลง Blob เดิมจะถูกยกเลิกทันที

### 4.3 แอนิเมชัน 3D และการไม่ฝังเฉลยลงใน DOM

* ไพ่ใช้ CSS 3D Transform (`transform-style: preserve-3d` และ `backface-visibility: hidden`) ในการพลิกหน้าการ์ด
* ขณะไพ่คว่ำอยู่ องค์ประกอบ `.card-category` และ `.card-message` ของไพ่ทุกใบจะว่างเปล่า (`""`) ข้อมูลข้อความจะถูกเขียนลงในการ์ดผ่าน `textContent` เฉพาะใบที่ผู้ใช้คลิกเลือกเท่านั้น เพื่อป้องกันการตรวจคำตอบล่วงหน้าผ่านเครื่องมือ Developer Tools

### 4.4 การจัดการ Input Method Editor (IME Guard)

* ช่องพิมพ์คำถามดักจับเหตุการณ์ทั้ง `event.isComposing` และ `event.keyCode === 229` เพื่อป้องกันการส่งคำถามขณะกดแป้น Enter เพื่อยืนยันการสะกดคำภาษาไทยบนระบบ iOS Safari

---

## 5. ฐานข้อมูล ความปลอดภัย และการสุ่มข้อมูล

### 5.1 โครงสร้างตาราง `public.messages`

| คอลัมน์ | ชนิดข้อมูล | คุณสมบัติ | คำอธิบาย |
| --- | --- | --- | --- |
| `id` | `bigint` | Primary Key, Generated Always | รหัสประจำข้อความ |
| `category` | `text` | Not Null | หมวดหมู่ (ลุยเลย, อย่าหาทำ, ดึงสติ, พักก่อน, มั่วซั่ว) |
| `message` | `text` | Unique, Not Null | เนื้อหาข้อความทำนาย |
| `weight` | `integer` | Not Null, Default: 10 | ค่าน้ำหนักในการสุ่ม (หมวดปกติ = 10, หมวดมั่วซั่ว = 1) |
| `is_active` | `boolean` | Not Null, Default: true | สถานะเปิด/ปิดการใช้งาน |

### 5.2 การทำงานของ Supabase RPC (`get_random_messages`)

* ฟังก์ชันสุ่มข้อความถูกกำหนดค่าเป็น `SECURITY INVOKER` (`security_definer: false`) ซึ่งทำงานภายใต้สิทธิ์ของผู้เรียกใช้ (`anon`) และเคารพนโยบาย Row Level Security (RLS) ของตาราง
* คีย์ `anon` ในไฟล์ `app.js` เป็น Public API Key การจำกัดสิทธิ์ขึ้นอยู่กับนโยบาย RLS บนตาราง `public.messages` (ต้องเปิดใช้งาน RLS และอนุญาตเฉพาะ `SELECT` สำหรับข้อความที่ `is_active = true` โดยไม่อนุญาต `INSERT/UPDATE/DELETE` แก่บุคคลภายนอก)
* ไม่มีการเก็บหรือเผยแพร่ `service_role` key ในโค้ดหน้าบ้านเด็ดขาด
* โค้ดของฟังก์ชันควรมีคำสั่ง `LIMIT 3` เพื่อจำกัดปริมาณแถวข้อมูลที่ส่งกลับมายังหน้าบ้าน

### 5.3 การคำนวณสัดส่วนน้ำหนักหมวดมั่วซั่ว (Total Weight Share)

สัดส่วนเชิงน้ำหนักของข้อความหมวดมั่วซั่วเมื่อเทียบกับน้ำหนักของข้อความทั้งหมดในระบบ คำนวณได้จาก:

`สัดส่วนน้ำหนักรวมหมวดมั่วซั่ว = (จำนวนแถวมั่วซั่ว × 1) / ((จำนวนแถวมั่วซั่ว × 1) + (จำนวนแถวปกติ × 10))`

*(หมายเหตุ: ค่านี้คือสัดส่วนเชิงน้ำหนักของข้อความทั้งหมดในฐานข้อมูล ไม่ใช่ความน่าจะเป็นในการเปิดไพ่แต่ละใบ เนื่องจากการสุ่มไพ่ 3 ใบของระบบทำงานแบบไม่แทนที่)*

---

## 6. คู่มือการเตรียมไฟล์และการดูแลรักษาระบบ

### 6.1 การดาวน์โหลดไฟล์ไลบรารี Vendor

ดาวน์โหลดไฟล์ Supabase JS Client v2.49.1 มาเก็บไว้ในโฟลเดอร์ `vendor/` โดยตรงเพื่อความปลอดภัย:

```bash
mkdir -p vendor
curl -Lo vendor/supabase.min.js [https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js)

```

### 6.2 การติดตั้งแบบอักษรและสัญญาอนุญาต

1. จัดเก็บไฟล์แบบอักษร `Sarabun-Regular.woff2` และ `Sarabun-SemiBold.woff2` ไว้ในโฟลเดอร์ `fonts/`
2. วางไฟล์ข้อความสัญญาอนุญาต `OFL.txt` ไว้ในโฟลเดอร์ `fonts/` ตามเงื่อนไขของสัญญาอนุญาต SIL Open Font License

### 6.3 คำสั่ง SQL สำหรับจัดการข้อความ (ผ่าน Supabase SQL Editor)

**เพิ่มข้อความใหม่เข้าระบบ:**

```sql
insert into public.messages (message, category, is_active, weight) values
  ('เกิดมาครั้งเดียว กลัวอะไร ลุย!', 'ลุยเลย', true, 10),
  ('ถ้าเพื่อนห้าม แปลว่าเพื่อนยังพอมีสติ ฟังมันบ้าง', 'อย่าหาทำ', true, 10),
  ('เงินในบัญชีเห็นด้วยกับความคิดนี้มั้ย?', 'ดึงสติ', true, 10),
  ('ไปกินข้าวก่อน เดี๋ยวสมองแล่นค่อยตัดสินใจ', 'พักก่อน', true, 10),
  ('กะเพราหมูกรอบไข่ดาวไม่สุก', 'มั่วซั่ว', true, 1)
on conflict (message) do nothing;

```

**ปิดการใช้งานข้อความชั่วคราว:**

```sql
update public.messages
set is_active = false
where id = 66;

```

**ตรวจสอบจำนวนข้อความคงเหลือแยกตามหมวดหมู่:**

```sql
select category, count(*) as total
from public.messages
where is_active = true
group by category
order by total desc;

```

---

## 7. นโยบายความปลอดภัยของ Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' blob: data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}

```

---

## 8. ขั้นตอนการ Deploy

1. เข้าสู่ระบบ https://vercel.com ด้วยบัญชี GitHub
2. กด **Add New... -> Project** แล้วเลือก Import คลัง Repository `message-from-universe`
3. กำหนดการตั้งค่าการ Deploy:
* **Framework Preset:** `Other`
* **Root Directory:** `./`
* **Build and Output Settings:** ไม่ต้องตั้งค่า (ปล่อยว่าง)
* **Environment Variables:** ไม่ต้องตั้งค่า


4. กดปุ่ม **Deploy** เพื่อเปิดใช้งานเว็บไซต์