# เชื่อม ESP32 กับหน้า Devices

เฟิร์มแวร์นี้ใช้ HTTP จาก ESP32 ไปยัง backend โดยส่ง heartbeat ทุก 3 วินาทีผ่าน `GET /api/device/poll` และรายงานสถานะรีเลย์ผ่าน `POST /api/device/report` หน้า Devices จะแสดง Online หลัง backend ได้รับ heartbeat และเปลี่ยนเป็น Offline เมื่อไม่มี heartbeat เกิน 60 วินาที (ตรวจทุก 30 วินาที)

1. ลงทะเบียนอุปกรณ์ในหน้า **Devices** โดยเลือกถัง กด **Add Device** และตั้ง Device ID ให้ตรงกับ `deviceId` ในไฟล์ `.ino` (เช่น `esp32-01`) เลือกประเภท `ESP32`
2. ตั้ง `DEVICE_API_KEY` เป็นคีย์ที่เดายากในไฟล์ `backend/.env` แล้วเริ่ม backend ใหม่ด้วย `docker compose restart backend` คีย์นี้ต้องตรงกับ `apiKey` ในไฟล์ `.ino` อย่านำคีย์ไปใส่ใน frontend
3. ในไฟล์ `.ino` ตั้ง `ssid`, `password`, `serverUrl`, `apiKey` และ `deviceId` ให้ตรงกับระบบ `serverUrl` ต้องเป็นที่อยู่ที่ ESP32 เข้าถึงได้จริง เช่น `http://192.168.1.100:4000` สำหรับเครื่อง backend ในวง Wi-Fi เดียวกัน `localhost` บน ESP32 หมายถึงตัวบอร์ดเอง
4. อัปโหลดเฟิร์มแวร์ เปิด Serial Monitor ที่ 115200 baud แล้วตรวจว่าเชื่อม Wi-Fi และเรียก API สำเร็จ จากนั้นหน้า Devices จะแสดง Online และเวลา Last Seen ของอุปกรณ์

หากต้องใช้งานผ่านอินเทอร์เน็ต ให้ใช้ HTTPS และตั้งค่าการเข้าถึง backend ให้ปลอดภัยก่อนส่งคีย์ออกนอก LAN คีย์ในตัวอย่างเป็นเพียง placeholder และใช้เชื่อมต่อไม่ได้จนกว่าจะตั้งค่าจริงทั้งสองฝั่ง

อุปกรณ์ที่ส่งสถานะผ่าน MQTT ยังใช้ topic `bins/<binId>/telemetry` ได้ โดยใส่ `devices` เป็นแผนที่ของ Device ID ไปยัง `online`, `warning` หรือ `offline` เช่น `{"devices":{"esp32-01":"online"}}` พร้อมฟิลด์ telemetry ตามที่ backend ต้องใช้
