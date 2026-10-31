import { normalizeEmail } from "../admin/authService.js";
import { getAdminStore } from "../admin/store.js";

const raw = process.argv[2] ?? "";
const email = normalizeEmail(raw);

if (!email || !email.includes("@")) {
  console.error("שימוש: npm run add-admin -- email@example.com");
  process.exit(1);
}

const store = await getAdminStore();
const record = await store.addEmail(email);
console.log(`כתובת המנהל נשמרה: ${record.email}`);
process.exit(0);
