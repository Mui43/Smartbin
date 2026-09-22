/** @type {import('next').NextConfig} */
const nextConfig = {
  // อนุญาต HMR และ Websocket จาก Tunnel
  allowedDevOrigins: ["*.loca.lt", "*.ngrok-free.app", "localhost:3000"],
};

export default nextConfig;
