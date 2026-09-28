const LINE_PUSH_URL =
  "https://api.line.me/v2/bot/message/push";

const LINE_REPLY_URL =
  "https://api.line.me/v2/bot/message/reply";

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: Record<string, unknown> };

/** Push text to LINE_TARGET_USER_ID; reject if the recipient is missing or delivery fails. */
export async function sendLineMessage(message: string) {
  const userId = process.env.LINE_TARGET_USER_ID?.trim();
  if (!userId) throw new Error("LINE Target User ID missing");
  return sendLineMessageTo(userId, message);
}

/**
 * Push text to a LINE recipient using an optional retry key for duplicate protection.
 * Return true on success, including HTTP 409 when a retry key is supplied;
 * reject for missing credentials or recipient, network failures, or other API errors.
 */
export async function sendLineMessageTo(to: string, message: string, retryKey?: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token || !to) throw new Error("LINE Access Token or recipient missing");

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

  if (!response.ok && !(retryKey && response.status === 409)) {
    throw new Error(
      `LINE API Error: ${response.status} ${responseText}`
    );
  }

  console.log("✅ LINE push message successful");

  return true;
}

/** Reply with text or a Flex message; return true on success and reject on missing credentials or delivery failure. */
export async function replyLineMessage(
  replyToken: string,
  message: string | LineMessage
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN is missing"
    );
  }

  const response = await fetch(LINE_REPLY_URL, {
    signal: AbortSignal.timeout(15_000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [typeof message === "string" ? { type: "text", text: message } : message],
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
