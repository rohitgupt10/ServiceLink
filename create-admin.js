const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/User");

dotenv.config();

async function createAdmin() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "ServiceLink Admin", ADMIN_CONTACT = "Administrator" } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) before running this command.");
  }
  await mongoose.connect(MONGODB_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  let admin = await User.findOne({ email });
  if (admin) {
    admin.role = "admin";
    admin.isActive = true;
    admin.password = ADMIN_PASSWORD;
    await admin.save();
  } else {
    admin = await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, contact: ADMIN_CONTACT, role: "admin", isVerified: true });
  }
  console.log(`Admin account ready: ${admin.email}`);
  await mongoose.disconnect();
}

createAdmin().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
