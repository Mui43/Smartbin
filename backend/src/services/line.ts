const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: Record<string, unknown> }
  | Record<string, unknown>;

export type LineMessageInput = string | LineMessage | LineMessage[];

/**
 * ส่งข้อความไปยัง LINE Target User ID ที่ระบุใน Environment Variable
 */
export async function sendLineMessage(message: LineMessageInput) {
  const userId = process.env.LINE_TARGET_USER_ID?.trim();
  if (!userId) throw new Error("LINE Target User ID missing");
  return sendLineMessageTo(userId, message);
}

/**
 * ส่งข้อความไปยังผู้รับปลายทาง (User ID / Group ID / Room ID)
 */
export async function sendLineMessageTo(
  to: string,
  message: LineMessageInput,
  retryKey?: string,
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token || !to) throw new Error("LINE Access Token or recipient missing");

  // แปลงให้เป็น Array ของ Messages
  const messagesArray = Array.isArray(message)
    ? message
    : typeof message === "string"
      ? [{ type: "text", text: message }]
      : [message];

  console.log("📤 LINE: sending push message...");

  const response = await fetch(LINE_PUSH_URL, {
    signal: AbortSignal.timeout(15_000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(retryKey ? { "X-Line-Retry-Key": retryKey } : {}),
    },
    body: JSON.stringify({
      to,
      messages: messagesArray,
    }),
  });

  const responseText = await response.text();

  console.log(`📨 LINE API status: ${response.status}`);
  console.log(`📨 LINE API response: ${responseText || "(empty)"}`);

  // ยกเว้นกรณี 409 เมื่อใช้งาน Retry Key
  if (!response.ok && !(retryKey && response.status === 409)) {
    throw new Error(`LINE API Error: ${response.status} ${responseText}`);
  }

  console.log("✅ LINE push message successful");
  return true;
}

/**
 * ตอบกลับข้อความด้วย Reply Token
 */
export async function replyLineMessage(
  replyToken: string,
  message: LineMessageInput,
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  }

  // รองรับทั้ง String, Flex Object และ Array ของข้อความ
  const messagesArray = Array.isArray(message)
    ? message
    : typeof message === "string"
      ? [{ type: "text", text: message }]
      : [message];

  const response = await fetch(LINE_REPLY_URL, {
    signal: AbortSignal.timeout(15_000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: messagesArray,
    }),
  });

  const responseText = await response.text();

  console.log(`📨 LINE Reply API status: ${response.status}`);
  console.log(`📨 LINE Reply API response: ${responseText || "(empty)"}`);

  if (!response.ok) {
    throw new Error(`LINE API Error: ${response.status} ${responseText}`);
  }

  return true;
}
