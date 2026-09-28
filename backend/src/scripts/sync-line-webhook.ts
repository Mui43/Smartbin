import "dotenv/config";

/**
 * Test and synchronize the LINE webhook URL using a local HTTPS ngrok tunnel.
 * Require LINE_CHANNEL_ACCESS_TOKEN and a tunnel address containing port 4000;
 * throw if configuration, tunnel discovery, webhook testing, or updating fails.
 */
async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  const tunnelsResponse = await fetch("http://127.0.0.1:4040/api/tunnels", { signal: AbortSignal.timeout(5000) });
  if (!tunnelsResponse.ok) throw new Error("Cannot read local ngrok tunnels");
  const tunnels = await tunnelsResponse.json() as { tunnels?: Array<{ public_url: string; config?: { addr?: string } }> };
  const port = Number(process.env.PORT) || 4000;
  const tunnel = tunnels.tunnels?.find(item => {
    const address = item.config?.addr;
    if (!item.public_url?.startsWith("https://") || !address) return false;
    try {
      const url = new URL(/^\d+$/.test(address) ? `http://localhost:${address}`
        : address.includes("://") ? address : `http://${address}`);
      return Number(url.port || (url.protocol === "https:" ? 443 : url.protocol === "http:" ? 80 : NaN)) === port;
    } catch {
      return false;
    }
  });
  if (!tunnel) throw new Error(`Start an HTTPS ngrok tunnel to port ${port} first`);
  const endpoint = `${tunnel.public_url}/api/line/webhook`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const check = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
    method: "POST", headers, body: JSON.stringify({ endpoint }), signal: AbortSignal.timeout(15000),
  });
  const checked = await check.json() as { success?: boolean };
  if (!check.ok || !checked.success) throw new Error(`LINE cannot reach webhook: ${JSON.stringify(checked)}`);
  const current = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", { headers, signal: AbortSignal.timeout(15000) });
  const configured = await current.json() as { endpoint?: string; active?: boolean };
  if (current.ok && configured.endpoint === endpoint) {
    if (!configured.active) throw new Error("LINE webhook is inactive; enable Use webhook in the LINE Developers Console");
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
