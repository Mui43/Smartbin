import { NextResponse } from "next/server";
import { messagingApi, webhook } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// ใน v8 ใช้ MessagingApiClient
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events: webhook.Event[] = body.events || [];

    await Promise.all(
      events.map(async (event) => {
        // 🟢 เช็กว่า Event นี้มี replyToken หรือไม่ (แก้ Error TypeScript)
        if (!("replyToken" in event) || !event.replyToken) {
          return;
        }

        const replyToken = event.replyToken; // TS รู้แล้วว่าตัวนี้เป็น string แน่นอน

        // 🟢 1. กดปุ่มจาก Rich Menu / ข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const text = event.message.text.trim();

          if (text === "เช็คสถานะ" || text === "สถานะถังขยะ") {
            const bins = [
              { id: "A-001", state: "lock", wasteLevel: 72, battery: 78 },
              { id: "A-002", state: "unlock", wasteLevel: 35, battery: 92 },
            ];

            const flexCarousel = createBinCarouselFlex(bins);
            return await client.replyMessage({
              replyToken: replyToken,
              messages: [flexCarousel as any],
            });
          }
        }

        // 🟢 2. กดปุ่ม Lock/Unlock ใน Flex Carousel Card
        if (event.type === "postback") {
          const params = new URLSearchParams(event.postback.data || "");
          const action = params.get("action");
          const binId = params.get("binId");

          return await client.replyMessage({
            replyToken: replyToken,
            messages: [
              {
                type: "text",
                text: `✅ ส่งคำสั่ง ${action === "lock" ? "ล็อก" : "ปลดล็อก"} ถังขยะ ${binId} แล้ว`,
              },
            ],
          });
        }
      }),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}

// ฟังก์ชันสร้าง Flex Carousel
function createBinCarouselFlex(bins: any[]) {
  const bubbles = bins.map((bin) => {
    const isLocked = bin.state === "lock" || bin.state === "on";
    return {
      type: "bubble",
      size: "medium",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#131822",
        contents: [
          {
            type: "text",
            text: "SMART BIN",
            color: "#10B981",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: `Bin ID: ${bin.id}`,
            color: "#FFFFFF",
            size: "lg",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0A0D14",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "สถานะ:", color: "#9CA3AF", size: "xs" },
              {
                type: "text",
                text: isLocked ? "🔒 LOCKED" : "🔓 UNLOCKED",
                color: isLocked ? "#10B981" : "#EAB308",
                size: "xs",
                weight: "bold",
                align: "end",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#131822",
        contents: [
          {
            type: "button",
            style: isLocked ? "secondary" : "primary",
            color: isLocked ? "#374151" : "#10B981",
            action: {
              type: "postback",
              label: isLocked ? "ปลดล็อก" : "ล็อก",
              data: `action=${isLocked ? "unlock" : "lock"}&binId=${bin.id}`,
              displayText: `สั่ง${isLocked ? "ปลดล็อก" : "ล็อก"} ${bin.id}`,
            },
          },
        ],
      },
    };
  });

  return {
    type: "flex",
    altText: "รายการถังขยะ Smart Bin",
    contents: { type: "carousel", contents: bubbles },
  };
}
