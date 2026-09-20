const LINE_API_URL =
  "https://api.line.me/v2/bot/message/push";

export async function sendLineMessage(
  message: string
) {
  const token =
    process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const userId =
    process.env.LINE_TARGET_USER_ID;

  if (!token) {
    throw new Error(
      "LINE_CHANNEL_ACCESS_TOKEN is not defined"
    );
  }

  if (!userId) {
    throw new Error(
      "LINE_TARGET_USER_ID is not defined"
    );
  }

  const response = await fetch(
    LINE_API_URL,
    {
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
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `LINE API Error: ${response.status} ${errorText}`
    );
  }

  return true;
}