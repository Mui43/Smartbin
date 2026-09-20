import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase } from "./config/database.js";
import { User } from "./models/user.js";

async function createStaff() {
  await connectDatabase();

  const passwordHash = await bcrypt.hash(
    "Staff123456",
    12
  );

  const user = await User.create({
    name: "Staff",
    email: "staff@smartbin.local",
    passwordHash,
    role: "staff",
    active: true,
  });

  console.log("✅ Staff created");
  console.log({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  process.exit(0);
}

createStaff().catch((error) => {
  console.error("❌ Create staff error:", error);
  process.exit(1);
});