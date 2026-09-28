import "dotenv/config";

async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  const tunnelsResponse = await fetch("http://127.0.0.1:4040/api/tunnels", { signal: AbortSignal.timeout(5000) });
  if (!tunnelsResponse.ok) throw new Error("Cannot read local ngrok tunnels");
  const tunnels = await tunnelsResponse.json() as { tunnels?: Array<{ public_url: string; config?: { addr?: string } }> };
  const tunnel = tunnels.tunnels?.find(item => item.public_url?.startsWith("https://") && item.config?.addr?.includes("4000"));
  if (!tunnel) throw new Error("Start an HTTPS ngrok tunnel to port 4000 first");
  const endpoint = `${tunnel.public_url}/api/line/webhook`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const check = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
    method: "POST", headers, body: JSON.stringify({ endpoint }), signal: AbortSignal.timeout(15000),
  });
  const checked = await check.json() as { success?: boolean };
  if (!check.ok || !checked.success) throw new Error(`LINE cannot reach webhook: ${JSON.stringify(checked)}`);
  const current = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", { headers, signal: AbortSignal.timeout(15000) });
  const configured = await current.json() as { endpoint?: string; active?: boolean };
  if (current.ok && configured.endpoint === endpoint && configured.active) {
    console.log(`LINE webhook is current: ${endpoint}`);
    return;
  }
  const update = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    method: "PUT", headers, body: JSON.stringify({ endpoint }), signal: AbortSignal.timeout(15000),
  });
  if (!update.ok) throw new Error(`LINE webhook update failed: HTTP ${update.status}`);
  console.log(`LINE webhook updated: ${endpoint}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
