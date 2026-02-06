import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pool from "./db.js";

dotenv.config();

const rl = readline.createInterface({ input, output });

const email = (await rl.question("Email: ")).trim();
const login = (await rl.question("Login (nickname): ")).trim();
const password = (await rl.question("Password: ")).trim();

rl.close();

if (!email || !login || !password) {
  console.error("Все поля обязательны.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

try {
  await pool.query(
    "INSERT INTO users (email, login, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')",
    [email, login, hash, login]
  );
  console.log("Админ создан.");
  process.exit(0);
} catch (error) {
  console.error("Ошибка создания админа:", error.message);
  process.exit(1);
}
