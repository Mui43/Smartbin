const LINE_PUSH_URL =
  "https://api.line.me/v2/bot/message/push";

const LINE_REPLY_URL =
  "https://api.line.me/v2/bot/message/reply";

export async function sendLineMessage(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_TARGET_USER_ID;

  if (!token || !userId) {
    throw new Error(
      "LINE Access Token or Target User ID missing"
    );
  }

  console.log("📤 LINE: sending push message...");
  console.log("📤 LINE target:", userId);

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  const responseText = await response.text();

  console.log(`📨 LINE API status: ${response.status}`);
  console.log(
    `📨 LINE API response: ${responseText || "(empty)"}`
  );

  if (!response.ok) {
    throw new Error(
      `LINE API Error: ${response.status} ${responseText}`
    );
  }

  console.log("✅ LINE push message successful");

  return true;
}

export async function replyLineMessage(
  replyToken: string,
  message: string
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN is missing"
    );
  }

  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  const responseText = await response.text();

  console.log(
    `📨 LINE Reply API status: ${response.status}`
  );

  console.log(
    `📨 LINE Reply API response: ${
      responseText || "(empty)"
    }`
  );

  if (!response.ok) {
    throw new Error(
      `LINE API Error: ${response.status} ${responseText}`
    );
  }

  return true;
}