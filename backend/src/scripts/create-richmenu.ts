import dotenv from "dotenv";
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error("❌ กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env");
  process.exit(1);
}

// โครงสร้าง Rich Menu ขนาด 2500x843 แบ่ง 4 ช่องเท่ากัน (กว้างช่องละ 625px)
const richMenuData = {
  size: {
    width: 2500,
    height: 843,
  },
  selected: true,
  name: "ESP32 Controller Menu",
  chatBarText: "เมนูควบคุม ESP32",
  areas: [
    {
      // ปุ่ม 1: เปิด (0 - 625px)
      bounds: { x: 0, y: 0, width: 625, height: 843 },
      action: { type: "postback", data: "action=on" },
    },
    {
      // ปุ่ม 2: ปิด (625 - 1250px)
      bounds: { x: 625, y: 0, width: 625, height: 843 },
      action: { type: "postback", data: "action=off" },
    },
    {
      // ปุ่ม 3: สถานะ (1250 - 1875px)
      bounds: { x: 1250, y: 0, width: 625, height: 843 },
      action: { type: "postback", data: "action=status" },
    },
    {
      // ปุ่ม 4: ล้างสถานะ (1875 - 2500px)
      bounds: { x: 1875, y: 0, width: 625, height: 843 },
      action: { type: "postback", data: "action=clear" },
    },
  ],
};

async function createRichMenu() {
  try {
    // Step 1: สร้าง Rich Menu Structure
    const response = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(richMenuData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Create Rich Menu Error: ${JSON.stringify(data)}`);
    }

    const richMenuId = data.richMenuId;
    console.log("✅ สร้าง Rich Menu Structure สำเร็จ!");
    console.log(`📌 Rich Menu ID: ${richMenuId}`);

    // Step 2: ตั้งค่าเป็น Default Rich Menu ให้ทุกคน
    const defaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );

    if (defaultRes.ok) {
      console.log("✅ ตั้งค่าเป็น Default Rich Menu สำเร็จ!");
      console.log(
        "👉 อย่าลืมอัปโหลดรูปภาพเมนู (2500x843 px) เข้าไปที่ Rich Menu ID นี้ผ่าน LINE Official Account Manager หรือ API ครับ",
      );
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
  }
}

createRichMenu();
