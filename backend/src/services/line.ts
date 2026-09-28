const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function sendLineMessage(message: string | object | Array<any>) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const userId = process.env.LINE_TARGET_USER_ID?.trim();

  if (!token || !userId) {
    throw new Error("LINE Access Token or Target User ID missing");
  }

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
    },
    body: JSON.stringify({
      to: userId,
      messages: messagesArray,
    }),
  });

  const responseText = await response.text();

  console.log(`📨 LINE API status: ${response.status}`);
  console.log(`📨 LINE API response: ${responseText || "(empty)"}`);

  if (!response.ok) {
    throw new Error(`LINE API Error: ${response.status} ${responseText}`);
  }

  console.log("✅ LINE push message successful");
  return true;
}

export async function replyLineMessage(
  replyToken: string,
  message: string | object | Array<any>,
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  }

  // 🟢 รองรับทั้ง String, Flex Object และ Array ของข้อความ
  const messagesArray = Array.isArray(message)
    ? message
    : typeof message === "string"
      ? [{ type: "text", text: message }]
      : [message];

  const response = await fetch(LINE_REPLY_URL, {
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
