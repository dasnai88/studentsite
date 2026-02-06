import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createHash } from "crypto";
import pool from "./db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const DB_NAME = process.env.DB_NAME || "castlelab_market";
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "mock";
const TBANK_API_URL =
  process.env.TBANK_API_URL || "https://securepay.tinkoff.ru/v2";
const TBANK_TERMINAL_KEY = process.env.TBANK_TERMINAL_KEY || "";
const TBANK_PASSWORD = process.env.TBANK_PASSWORD || "";
const TBANK_NOTIFICATION_URL = process.env.TBANK_NOTIFICATION_URL || "";
const TBANK_QR_MEMBER_ID = process.env.TBANK_QR_MEMBER_ID || "";
const TBANK_ALLOW_MANUAL_CONFIRM =
  String(process.env.TBANK_ALLOW_MANUAL_CONFIRM || "").toLowerCase() === "true";
const isTbankEnabled =
  PAYMENT_PROVIDER === "tbank" && TBANK_TERMINAL_KEY && TBANK_PASSWORD;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.set("trust proxy", 1);
app.use(express.json());

const pickUser = (row) => ({
  id: row.id,
  email: row.email,
  login: row.login,
  displayName: row.display_name,
  bio: row.bio,
  university: row.university,
  faculty: row.faculty,
  city: row.city,
  avatarUrl: row.avatar_url,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const pickPublicProfile = (row) => ({
  id: row.id,
  login: row.login,
  displayName: row.display_name,
  bio: row.bio,
  university: row.university,
  faculty: row.faculty,
  city: row.city,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
  approvedListings: Number(row.approved_listings || 0),
});

const pickListing = (row, { includeModeration = false } = {}) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  price: Number(row.price),
  category: row.category,
  status: row.status,
  author: row.author,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  moderation:
    includeModeration && row.moderation_status
      ? {
          status: row.moderation_status,
          notes: row.moderation_notes,
          at: row.moderation_at,
        }
      : null,
});

const pickWallet = (row) => ({
  userId: row.user_id,
  available: Number(row.available_balance),
  held: Number(row.held_balance),
  updatedAt: row.updated_at,
});

const pickOrder = (row, { includePaymentQr = false } = {}) => ({
  id: row.id,
  listing: {
    id: row.listing_id,
    title: row.listing_title,
    category: row.listing_category,
  },
  amount: Number(row.amount),
  status: row.status,
  buyer: {
    id: row.buyer_id,
    login: row.buyer_login,
  },
  seller: {
    id: row.seller_id,
    login: row.seller_login,
  },
  payment: row.payment_status
    ? {
        status: row.payment_status,
        method: row.payment_method,
        provider: row.payment_provider,
        providerPaymentId: row.provider_payment_id,
        sbpReference: row.sbp_reference,
        qrPayload: includePaymentQr ? row.qr_payload : null,
        createdAt: row.payment_created_at,
        paidAt: row.payment_paid_at,
      }
    : null,
  dispute: row.dispute_status
    ? {
        status: row.dispute_status,
        reason: row.dispute_reason,
        resolution: row.dispute_resolution,
        notes: row.dispute_notes,
        openedBy: row.dispute_opened_by,
        createdAt: row.dispute_created_at,
        resolvedAt: row.dispute_resolved_at,
      }
    : null,
  refund: row.refund_status
    ? {
        status: row.refund_status,
        amount: Number(row.refund_amount),
        providerRefundId: row.refund_provider_id,
        createdAt: row.refund_created_at,
        updatedAt: row.refund_updated_at,
      }
    : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  confirmedAt: row.confirmed_at,
});

const pickDispute = (row) => ({
  id: row.id,
  orderId: row.order_id,
  status: row.status,
  reason: row.reason,
  resolution: row.resolution,
  notes: row.notes,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
  openedBy: row.opened_by,
  order: {
    id: row.order_id,
    amount: Number(row.amount),
    status: row.order_status,
    listingTitle: row.listing_title,
  },
  buyer: {
    login: row.buyer_login,
  },
  seller: {
    login: row.seller_login,
  },
});

const pickMessage = (row) => ({
  id: row.id,
  orderId: row.order_id,
  message: row.message,
  sender: {
    id: row.sender_id,
    login: row.sender_login,
  },
  createdAt: row.created_at,
});

const listingSelect = `
  SELECT l.*, u.login AS author, u.status AS author_status,
    lm.status AS moderation_status,
    lm.notes AS moderation_notes,
    lm.created_at AS moderation_at
  FROM listings l
  JOIN users u ON l.user_id = u.id
  LEFT JOIN listing_moderation lm ON lm.id = (
    SELECT lm2.id FROM listing_moderation lm2
    WHERE lm2.listing_id = l.id
    ORDER BY lm2.created_at DESC
    LIMIT 1
  )
`;

const orderSelect = `
  SELECT o.*, l.title AS listing_title, l.category AS listing_category,
    seller.login AS seller_login, buyer.login AS buyer_login,
    p.status AS payment_status, p.method AS payment_method,
    p.provider AS payment_provider,
    p.provider_payment_id,
    p.sbp_reference, p.qr_payload,
    p.created_at AS payment_created_at, p.paid_at AS payment_paid_at,
    od.status AS dispute_status,
    od.reason AS dispute_reason,
    od.resolution AS dispute_resolution,
    od.notes AS dispute_notes,
    od.opened_by AS dispute_opened_by,
    od.created_at AS dispute_created_at,
    od.resolved_at AS dispute_resolved_at,
    r.status AS refund_status,
    r.amount AS refund_amount,
    r.provider_refund_id AS refund_provider_id,
    r.created_at AS refund_created_at,
    r.updated_at AS refund_updated_at
  FROM orders o
  JOIN listings l ON o.listing_id = l.id
  JOIN users seller ON o.seller_id = seller.id
  JOIN users buyer ON o.buyer_id = buyer.id
  LEFT JOIN payments p ON p.id = (
    SELECT p2.id FROM payments p2
    WHERE p2.order_id = o.id
    ORDER BY p2.created_at DESC
    LIMIT 1
  )
  LEFT JOIN order_disputes od ON od.id = (
    SELECT od2.id FROM order_disputes od2
    WHERE od2.order_id = o.id
    ORDER BY od2.created_at DESC
    LIMIT 1
  )
  LEFT JOIN refunds r ON r.id = (
    SELECT r2.id FROM refunds r2
    WHERE r2.order_id = o.id
    ORDER BY r2.created_at DESC
    LIMIT 1
  )
`;

const createToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

const getTokenFromHeader = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

const authRequired = async (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: "Требуется авторизация." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [payload.id]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Пользователь не найден." });
    }
    const user = rows[0];
    if (user.status !== "active") {
      return res.status(403).json({ error: "Пользователь заблокирован." });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Неверный токен." });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [payload.id]
    );
    const user = rows[0];
    if (!user || user.status !== "active") {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Требуется авторизация." });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Недостаточно прав." });
  }
  return next();
};

const buildSbpPayload = ({ orderId, amount }) => {
  const numericAmount = Number(amount);
  const normalized = Number.isFinite(numericAmount)
    ? numericAmount.toFixed(2)
    : "0.00";
  return `SBP|CastleLab Market|ORDER:${orderId}|AMOUNT:${normalized}`;
};

const toKopecks = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
};

const mapTbankPaymentStatus = (status) => {
  if (status === "CONFIRMED") return "paid";
  if (
    [
      "CANCELLED",
      "CANCELED",
      "REJECTED",
      "DEADLINE_EXPIRED",
      "REVERSED",
    ].includes(status)
  ) {
    return "cancelled";
  }
  return "pending";
};

const mapTbankRefundStatus = (response) => {
  if (response?.Success) return "succeeded";
  if (response?.Status) return "failed";
  return "pending";
};

const tbankToken = (params) => {
  const skipKeys = new Set(["Token", "Data", "DATA", "Receipt"]);
  const entries = Object.entries(params)
    .filter(([key, value]) => {
      if (value === undefined || value === null) return false;
      if (skipKeys.has(key)) return false;
      if (typeof value === "object") return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => {
      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
      return String(value);
    })
    .join("");

  return createHash("sha256").update(entries).digest("hex");
};

const tbankRequest = async (method, body = {}) => {
  if (!isTbankEnabled) {
    throw new Error("T-Bank is not configured.");
  }
  const payload = {
    TerminalKey: TBANK_TERMINAL_KEY,
    ...body,
  };
  const token = tbankToken({ ...payload, Password: TBANK_PASSWORD });
  const response = await fetch(`${TBANK_API_URL}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, Token: token }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.Success === false) {
    const message =
      data?.Message || data?.Details || "T-Bank request failed.";
    throw new Error(message);
  }
  return data;
};

const createTbankSbpPayment = async ({ orderId, amount, description }) => {
  const payload = {
    Amount: toKopecks(amount),
    OrderId: String(orderId),
    Description: description,
  };
  if (TBANK_NOTIFICATION_URL) {
    payload.NotificationURL = TBANK_NOTIFICATION_URL;
  }
  return tbankRequest("Init", payload);
};

const getTbankQr = async ({ paymentId }) =>
  tbankRequest("GetQr", {
    PaymentId: paymentId,
    DataType: "PAYLOAD",
  });

const cancelTbankPayment = async ({ paymentId, amount }) => {
  const payload = {
    PaymentId: paymentId,
    Amount: toKopecks(amount),
  };
  if (TBANK_QR_MEMBER_ID) {
    payload.QrMemberId = TBANK_QR_MEMBER_ID;
  }
  return tbankRequest("Cancel", payload);
};

const verifyTbankNotification = (payload) => {
  if (!isTbankEnabled || !payload) {
    return false;
  }
  if (payload.TerminalKey !== TBANK_TERMINAL_KEY) {
    return false;
  }
  if (!payload.Token) {
    return false;
  }
  const token = tbankToken({ ...payload, Password: TBANK_PASSWORD });
  return token === payload.Token;
};

const ensureProfileColumns = async () => {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [DB_NAME]
  );
  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  const additions = [];

  if (!columns.has("display_name")) additions.push("ADD COLUMN display_name VARCHAR(80)");
  if (!columns.has("bio")) additions.push("ADD COLUMN bio TEXT");
  if (!columns.has("university")) additions.push("ADD COLUMN university VARCHAR(120)");
  if (!columns.has("faculty")) additions.push("ADD COLUMN faculty VARCHAR(120)");
  if (!columns.has("city")) additions.push("ADD COLUMN city VARCHAR(80)");
  if (!columns.has("avatar_url")) additions.push("ADD COLUMN avatar_url VARCHAR(255)");
  if (!columns.has("updated_at")) {
    additions.push(
      "ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
  }

  if (additions.length) {
    await pool.query(`ALTER TABLE users ${additions.join(", ")}`);
  }

  if (!columns.has("display_name")) {
    await pool.query("UPDATE users SET display_name = login WHERE display_name IS NULL");
  }
};

const ensurePaymentTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      user_id INT PRIMARY KEY,
      available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      held_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      buyer_id INT NOT NULL,
      seller_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status ENUM('pending_payment', 'escrow', 'released', 'cancelled') NOT NULL DEFAULT 'pending_payment',
      confirmed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      method ENUM('sbp') NOT NULL,
      status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
      provider VARCHAR(40) NOT NULL DEFAULT 'mock',
      provider_payment_id VARCHAR(80),
      sbp_reference VARCHAR(120),
      qr_payload TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_disputes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      opened_by INT NOT NULL,
      reason TEXT,
      status ENUM('open', 'resolved', 'cancelled') NOT NULL DEFAULT 'open',
      resolution ENUM('refund', 'release') NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      payment_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'succeeded', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
      provider VARCHAR(40) NOT NULL,
      provider_refund_id VARCHAR(80),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_order_messages_order_id (order_id)
    )
  `);
};

const ensurePaymentColumns = async () => {
  const [paymentColumns] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments'",
    [DB_NAME]
  );
  const columns = new Set(paymentColumns.map((row) => row.COLUMN_NAME));
  const additions = [];
  if (!columns.has("provider")) {
    additions.push("ADD COLUMN provider VARCHAR(40) NOT NULL DEFAULT 'mock'");
  }
  if (!columns.has("provider_payment_id")) {
    additions.push("ADD COLUMN provider_payment_id VARCHAR(80)");
  }
  if (additions.length) {
    await pool.query(`ALTER TABLE payments ${additions.join(", ")}`);
  }
};

const ensureWallet = async (userId, connection = pool) => {
  await connection.query(
    "INSERT INTO wallets (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id",
    [userId]
  );
  const [rows] = await connection.query(
    "SELECT * FROM wallets WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0];
};

const applyPaymentSuccess = async ({ orderId, paymentId, providerPaymentId }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orderRows.length) {
      await connection.rollback();
      return false;
    }
    const order = orderRows[0];
    if (paymentId) {
      await connection.query(
        "UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, NOW()), provider_payment_id = COALESCE(provider_payment_id, ?) WHERE id = ?",
        [providerPaymentId || null, paymentId]
      );
    }
    if (order.status !== "pending_payment") {
      await connection.commit();
      return true;
    }
    await ensureWallet(order.buyer_id, connection);
    await ensureWallet(order.seller_id, connection);
    await connection.query("UPDATE orders SET status = 'escrow' WHERE id = ?", [
      orderId,
    ]);
    await connection.query(
      "UPDATE wallets SET held_balance = held_balance + ? WHERE user_id = ?",
      [order.amount, order.buyer_id]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const applyRefundSuccess = async ({ refundId }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [refundRows] = await connection.query(
      "SELECT * FROM refunds WHERE id = ? FOR UPDATE",
      [refundId]
    );
    if (!refundRows.length) {
      await connection.rollback();
      return false;
    }
    const refund = refundRows[0];
    if (refund.status === "succeeded") {
      await connection.commit();
      return true;
    }
    await connection.query(
      "UPDATE refunds SET status = 'succeeded' WHERE id = ?",
      [refundId]
    );
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [refund.order_id]
    );
    if (!orderRows.length) {
      await connection.rollback();
      return false;
    }
    const order = orderRows[0];
    await ensureWallet(order.buyer_id, connection);
    const [walletRows] = await connection.query(
      "SELECT held_balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [order.buyer_id]
    );
    const heldBalance = Number(walletRows[0]?.held_balance || 0);
    const refundAmount = Number(refund.amount);
    if (heldBalance < refundAmount) {
      await connection.rollback();
      return false;
    }
    await connection.query(
      "UPDATE wallets SET held_balance = held_balance - ?, available_balance = available_balance + ? WHERE user_id = ?",
      [refundAmount, refundAmount, order.buyer_id]
    );
    await connection.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = ?",
      [order.id]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, login, password } = req.body;
  if (!email || !login || !password) {
    return res.status(400).json({ error: "Заполните все поля." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль слишком короткий." });
  }
  const [existing] = await pool.query(
    "SELECT id FROM users WHERE email = ? OR login = ? LIMIT 1",
    [email, login]
  );
  if (existing.length) {
    return res.status(409).json({ error: "Email или логин уже заняты." });
  }
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (email, login, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, 'user', 'active')",
    [email, login, hash, login]
  );
  const user = {
    id: result.insertId,
    email,
    login,
    role: "user",
    status: "active",
  };
  return res.json({ user, token: createToken(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: "Введите логин и пароль." });
  }
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? OR login = ? LIMIT 1",
    [login, login]
  );
  if (!rows.length) {
    return res.status(401).json({ error: "Неверные данные." });
  }
  const user = rows[0];
  if (user.status !== "active") {
    return res.status(403).json({ error: "Пользователь заблокирован." });
  }
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: "Неверные данные." });
  }
  return res.json({ user: pickUser(user), token: createToken(user) });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  return res.json({ user: pickUser(req.user) });
});

app.get("/api/profiles/me", authRequired, async (req, res) => {
  return res.json({ profile: pickUser(req.user) });
});

app.patch("/api/profiles/me", authRequired, async (req, res) => {
  const fields = {
    displayName: "display_name",
    bio: "bio",
    university: "university",
    faculty: "faculty",
    city: "city",
    avatarUrl: "avatar_url",
  };

  const updates = [];
  const params = [];

  Object.entries(fields).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      const raw = req.body[key];
      const value =
        raw === null || raw === undefined ? null : String(raw).trim();
      updates.push(`${column} = ?`);
      params.push(value || null);
    }
  });

  if (!updates.length) {
    return res.status(400).json({ error: "No profile fields provided." });
  }

  params.push(req.user.id);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [req.user.id]
  );
  return res.json({ profile: pickUser(rows[0]) });
});

app.get("/api/profiles/:login", async (req, res) => {
  const login = req.params.login;
  const [rows] = await pool.query(
    `SELECT u.*, (
      SELECT COUNT(*) FROM listings l
      WHERE l.user_id = u.id AND l.status = 'approved'
    ) AS approved_listings
    FROM users u WHERE u.login = ? AND u.status = 'active' LIMIT 1`,
    [login]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "Profile not found." });
  }
  return res.json({ profile: pickPublicProfile(rows[0]) });
});

app.patch("/api/auth/password", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Provide current and new password." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password is too short." });
  }
  const isMatch = await bcrypt.compare(
    currentPassword,
    req.user.password_hash
  );
  if (!isMatch) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    hash,
    req.user.id,
  ]);
  return res.json({ status: "ok" });
});

app.get("/api/wallets/me", authRequired, async (req, res) => {
  const wallet = await ensureWallet(req.user.id);
  return res.json({ wallet: pickWallet(wallet) });
});

app.get("/api/orders", authRequired, async (req, res) => {
  const role = req.query.role === "seller" ? "seller" : "buyer";
  let query = orderSelect;
  const params = [req.user.id];
  if (role === "seller") {
    query += " WHERE o.seller_id = ?";
  } else {
    query += " WHERE o.buyer_id = ?";
  }
  query += " ORDER BY o.created_at DESC";
  const [rows] = await pool.query(query, params);
  const includePaymentQr = role === "buyer";
  return res.json({
    orders: rows.map((row) => pickOrder(row, { includePaymentQr })),
  });
});

app.post("/api/orders", authRequired, async (req, res) => {
  const listingId = Number(req.body.listingId);
  if (!listingId) {
    return res.status(400).json({ error: "Передайте корректный listingId." });
  }
  const [listingRows] = await pool.query(
    `SELECT l.*, u.status AS author_status, u.login AS seller_login
     FROM listings l
     JOIN users u ON l.user_id = u.id
     WHERE l.id = ? LIMIT 1`,
    [listingId]
  );
  if (!listingRows.length) {
    return res.status(404).json({ error: "Объявление не найдено." });
  }
  const listing = listingRows[0];
  if (listing.status !== "approved" || listing.author_status !== "active") {
    return res.status(400).json({ error: "Объявление недоступно для покупки." });
  }
  if (listing.user_id === req.user.id) {
    return res.status(400).json({ error: "Нельзя покупать свою работу." });
  }
  const [existing] = await pool.query(
    `${orderSelect}
     WHERE o.listing_id = ? AND o.buyer_id = ? AND o.status IN ('pending_payment', 'escrow')
     ORDER BY o.created_at DESC LIMIT 1`,
    [listingId, req.user.id]
  );
  if (existing.length) {
    return res.json({
      order: pickOrder(existing[0], { includePaymentQr: true }),
    });
  }
  const amount = Number(listing.price);
  const [result] = await pool.query(
    "INSERT INTO orders (listing_id, buyer_id, seller_id, amount, status) VALUES (?, ?, ?, ?, 'pending_payment')",
    [listingId, req.user.id, listing.user_id, amount]
  );
  const [rows] = await pool.query(`${orderSelect} WHERE o.id = ?`, [
    result.insertId,
  ]);
  return res.status(201).json({
    order: pickOrder(rows[0], { includePaymentQr: true }),
  });
});

app.post("/api/orders/:id/sbp", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const [rows] = await pool.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [
    orderId,
  ]);
  if (!rows.length) {
    return res.status(404).json({ error: "Заказ не найден." });
  }
  const order = rows[0];
  if (order.buyer_id !== req.user.id) {
    return res.status(403).json({ error: "Недостаточно прав." });
  }
  if (order.status === "released") {
    return res.status(400).json({ error: "Заказ уже завершен." });
  }
  const [paymentRows] = await pool.query(
    "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
    [orderId]
  );
  const latestPayment = paymentRows[0];
  if (
    latestPayment &&
    ["pending", "paid"].includes(latestPayment.status) &&
    (!isTbankEnabled || latestPayment.provider === "tbank")
  ) {
    const [updatedRows] = await pool.query(
      `${orderSelect} WHERE o.id = ? LIMIT 1`,
      [orderId]
    );
    return res.json({
      order: pickOrder(updatedRows[0], { includePaymentQr: true }),
    });
  }

  if (isTbankEnabled) {
    const reference = `SBP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
    const paymentResponse = await createTbankSbpPayment({
      orderId: reference,
      amount: order.amount,
      description: `Order #${orderId} (${order.listing_title || "Listing"})`,
    });
    const paymentStatus = mapTbankPaymentStatus(paymentResponse.Status);
    const qrResponse = await getTbankQr({
      paymentId: paymentResponse.PaymentId,
    });
    const qrPayload = qrResponse?.Data || null;
    const [insertResult] = await pool.query(
      `INSERT INTO payments
        (order_id, method, status, provider, provider_payment_id, sbp_reference, qr_payload, paid_at)
       VALUES (?, 'sbp', ?, 'tbank', ?, ?, ?, ?)`,
      [
        orderId,
        paymentStatus,
        String(paymentResponse.PaymentId),
        String(paymentResponse.OrderId || reference),
        qrPayload,
        paymentStatus === "paid" ? new Date() : null,
      ]
    );
    if (paymentStatus === "paid") {
      await applyPaymentSuccess({
        orderId,
        paymentId: insertResult.insertId,
        providerPaymentId: String(paymentResponse.PaymentId),
      });
    }
  } else {
    const reference = `SBP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
    const qrPayload = buildSbpPayload({ orderId, amount: order.amount });
    const provider = PAYMENT_PROVIDER === "tbank" ? "mock" : PAYMENT_PROVIDER;
    await pool.query(
      "INSERT INTO payments (order_id, method, status, provider, sbp_reference, qr_payload) VALUES (?, 'sbp', 'pending', ?, ?, ?)",
      [orderId, provider, reference, qrPayload]
    );
  }
  const [updatedRows] = await pool.query(
    `${orderSelect} WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  return res.json({
    order: pickOrder(updatedRows[0], { includePaymentQr: true }),
  });
});

app.post("/api/orders/:id/sbp/confirm", authRequired, async (req, res) => {
  if (isTbankEnabled && !TBANK_ALLOW_MANUAL_CONFIRM) {
    return res.status(400).json({
      error: "Оплата подтверждается автоматически после СБП.",
    });
  }
  const orderId = Number(req.params.id);
  const [orderRows] = await pool.query(
    "SELECT * FROM orders WHERE id = ? LIMIT 1",
    [orderId]
  );
  if (!orderRows.length) {
    return res.status(404).json({ error: "Заказ не найден." });
  }
  const order = orderRows[0];
  if (order.buyer_id !== req.user.id) {
    return res.status(403).json({ error: "Недостаточно прав." });
  }
  const [paymentRows] = await pool.query(
    "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
    [orderId]
  );
  if (!paymentRows.length) {
    return res.status(400).json({ error: "Платеж не найден." });
  }
  await applyPaymentSuccess({
    orderId,
    paymentId: paymentRows[0].id,
  });
  const [updated] = await pool.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [
    orderId,
  ]);
  return res.json({
    order: pickOrder(updated[0], { includePaymentQr: true }),
  });
});

app.post("/api/orders/:id/cancel", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orderRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Заказ не найден." });
    }
    const order = orderRows[0];
    if (order.buyer_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ error: "Недостаточно прав." });
    }
    if (order.status !== "pending_payment") {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "Можно отменить только неоплаченный заказ." });
    }
    await connection.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [
      orderId,
    ]);
    await connection.query(
      "UPDATE payments SET status = 'cancelled' WHERE order_id = ? AND status = 'pending'",
      [orderId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const [updated] = await pool.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [
    orderId,
  ]);
  return res.json({
    order: pickOrder(updated[0], { includePaymentQr: true }),
  });
});

app.post("/api/orders/:id/dispute", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orderRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Заказ не найден." });
    }
    const order = orderRows[0];
    if (![order.buyer_id, order.seller_id].includes(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ error: "Недостаточно прав." });
    }
    if (order.status !== "escrow") {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "Спор доступен только после оплаты." });
    }
    const [disputeRows] = await connection.query(
      "SELECT * FROM order_disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [orderId]
    );
    if (disputeRows.length && disputeRows[0].status === "open") {
      await connection.rollback();
      return res.status(409).json({ error: "Спор уже открыт." });
    }
    await connection.query(
      "INSERT INTO order_disputes (order_id, opened_by, reason, status) VALUES (?, ?, ?, 'open')",
      [orderId, req.user.id, reason || null]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const [updated] = await pool.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [
    orderId,
  ]);
  return res.json({
    order: pickOrder(updated[0], { includePaymentQr: true }),
  });
});

app.get("/api/orders/:id/messages", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const [orderRows] = await pool.query(
    "SELECT * FROM orders WHERE id = ? LIMIT 1",
    [orderId]
  );
  if (!orderRows.length) {
    return res.status(404).json({ error: "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ." });
  }
  const order = orderRows[0];
  const isParticipant =
    order.buyer_id === req.user.id || order.seller_id === req.user.id;
  const isStaff = ["admin", "moderator"].includes(req.user.role);
  if (!isParticipant && !isStaff) {
    return res.status(403).json({ error: "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ." });
  }
  const [rows] = await pool.query(
    `SELECT m.*, u.login AS sender_login
     FROM order_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = ?
     ORDER BY m.created_at ASC, m.id ASC`,
    [orderId]
  );
  return res.json({ messages: rows.map(pickMessage) });
});

app.post("/api/orders/:id/messages", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "Введите сообщение." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Сообщение слишком длинное." });
  }
  const [orderRows] = await pool.query(
    "SELECT * FROM orders WHERE id = ? LIMIT 1",
    [orderId]
  );
  if (!orderRows.length) {
    return res.status(404).json({ error: "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ." });
  }
  const order = orderRows[0];
  const isParticipant =
    order.buyer_id === req.user.id || order.seller_id === req.user.id;
  const isStaff = ["admin", "moderator"].includes(req.user.role);
  if (!isParticipant && !isStaff) {
    return res.status(403).json({ error: "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ." });
  }
  const [result] = await pool.query(
    "INSERT INTO order_messages (order_id, sender_id, message) VALUES (?, ?, ?)",
    [orderId, req.user.id, message]
  );
  const [rows] = await pool.query(
    `SELECT m.*, u.login AS sender_login
     FROM order_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.id = ? LIMIT 1`,
    [result.insertId]
  );
  return res.status(201).json({
    message: rows[0] ? pickMessage(rows[0]) : null,
  });
});

app.post("/api/payments/tbank/webhook", async (req, res) => {
  if (!isTbankEnabled) {
    return res.status(400).json({ error: "T-Bank is not configured." });
  }
  const payload = req.body || {};
  if (!verifyTbankNotification(payload)) {
    return res.status(403).json({ error: "Invalid webhook token." });
  }
  const status = payload.Status;
  const providerPaymentId = payload.PaymentId
    ? String(payload.PaymentId)
    : "";
  const orderReference = payload.OrderId ? String(payload.OrderId) : "";
  if (!status || !providerPaymentId) {
    return res.status(400).json({ error: "Invalid webhook payload." });
  }
  try {
    let payment = null;
    let paymentRows = [];
    if (providerPaymentId) {
      [paymentRows] = await pool.query(
        "SELECT * FROM payments WHERE provider_payment_id = ? ORDER BY created_at DESC LIMIT 1",
        [providerPaymentId]
      );
    }
    if (!paymentRows.length && orderReference) {
      [paymentRows] = await pool.query(
        "SELECT * FROM payments WHERE sbp_reference = ? ORDER BY created_at DESC LIMIT 1",
        [orderReference]
      );
    }
    if (paymentRows.length) {
      payment = paymentRows[0];
    }

    const mappedStatus = mapTbankPaymentStatus(status);
    if (payment) {
      await pool.query(
        "UPDATE payments SET status = ?, provider_payment_id = COALESCE(provider_payment_id, ?) WHERE id = ?",
        [mappedStatus, providerPaymentId, payment.id]
      );
    }
    if (payment && mappedStatus === "paid") {
      await applyPaymentSuccess({
        orderId: payment.order_id,
        paymentId: payment.id,
        providerPaymentId,
      });
    }
  } catch (error) {
    console.error("T-Bank webhook error:", error);
  }
  return res.json({ status: "ok" });
});

app.post("/api/orders/:id/confirm", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orderRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Заказ не найден." });
    }
    const order = orderRows[0];
    if (order.buyer_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ error: "Недостаточно прав." });
    }
    const [disputeRows] = await connection.query(
      "SELECT status FROM order_disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [orderId]
    );
    if (disputeRows.length && disputeRows[0].status === "open") {
      await connection.rollback();
      return res.status(409).json({ error: "По заказу открыт спор." });
    }
    const [refundRows] = await connection.query(
      "SELECT status FROM refunds WHERE order_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [orderId]
    );
    if (refundRows.length && refundRows[0].status === "pending") {
      await connection.rollback();
      return res
        .status(409)
        .json({ error: "Идет возврат средств по заказу." });
    }
    if (order.status === "released") {
      await connection.commit();
      const [latest] = await pool.query(
        `${orderSelect} WHERE o.id = ? LIMIT 1`,
        [orderId]
      );
      return res.json({
        order: pickOrder(latest[0], { includePaymentQr: true }),
      });
    }
    if (order.status !== "escrow") {
      await connection.rollback();
      return res.status(400).json({ error: "Заказ еще не оплачен." });
    }
    await ensureWallet(order.buyer_id, connection);
    await ensureWallet(order.seller_id, connection);
    const [walletRows] = await connection.query(
      "SELECT held_balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [order.buyer_id]
    );
    const heldBalance = Number(walletRows[0]?.held_balance || 0);
    if (heldBalance < Number(order.amount)) {
      await connection.rollback();
      return res.status(409).json({ error: "Недостаточно средств на удержании." });
    }
    await connection.query(
      "UPDATE wallets SET held_balance = held_balance - ? WHERE user_id = ?",
      [order.amount, order.buyer_id]
    );
    await connection.query(
      "UPDATE wallets SET available_balance = available_balance + ? WHERE user_id = ?",
      [order.amount, order.seller_id]
    );
    await connection.query(
      "UPDATE orders SET status = 'released', confirmed_at = NOW() WHERE id = ?",
      [orderId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const [updated] = await pool.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [
    orderId,
  ]);
  return res.json({
    order: pickOrder(updated[0], { includePaymentQr: true }),
  });
});

app.get("/api/listings", optionalAuth, async (req, res) => {
  const status = req.query.status;
  const mine = req.query.mine === "true";
  const author = req.query.author;
  const isModerator =
    req.user && ["moderator", "admin"].includes(req.user.role);

  if (mine && !req.user) {
    return res.status(401).json({ error: "Требуется авторизация." });
  }

  let query = listingSelect;
  const params = [];
  if (mine) {
    query += " WHERE l.user_id = ?";
    params.push(req.user.id);
  } else if (author) {
    const isOwnerView = req.user && req.user.login === author;
    query += " WHERE u.login = ?";
    params.push(author);
    if (status) {
      if (status !== "approved" && !isModerator && !isOwnerView) {
        return res.status(403).json({ error: "Недостаточно прав." });
      }
      query += " AND l.status = ?";
      params.push(status);
    } else if (!isModerator && !isOwnerView) {
      query += " AND l.status = 'approved'";
    }
  } else if (status) {
    if (status !== "approved" && !isModerator) {
      return res.status(403).json({ error: "Недостаточно прав." });
    }
    query += " WHERE l.status = ?";
    params.push(status);
  } else {
    query += " WHERE l.status = 'approved'";
  }
  if (!isModerator) {
    query += " AND u.status = 'active'";
  }
  query += " ORDER BY l.created_at DESC LIMIT 50";

  const [rows] = await pool.query(query, params);
  const includeModeration =
    mine || isModerator || (author && req.user && req.user.login === author);
  return res.json({
    listings: rows.map((row) => pickListing(row, { includeModeration })),
  });
});

app.get("/api/listings/:id", optionalAuth, async (req, res) => {
  const listingId = Number(req.params.id);
  const [rows] = await pool.query(
    `${listingSelect} WHERE l.id = ? LIMIT 1`,
    [listingId]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "Объявление не найдено." });
  }
  const listing = rows[0];
  const isOwner = req.user && req.user.id === listing.user_id;
  const isModerator =
    req.user && ["moderator", "admin"].includes(req.user.role);
  if (!isModerator && listing.author_status !== "active") {
    return res.status(404).json({ error: "Объявление не найдено." });
  }
  if (listing.status !== "approved" && !isOwner && !isModerator) {
    return res.status(403).json({ error: "Недостаточно прав." });
  }
  return res.json({
    listing: pickListing(listing, {
      includeModeration: Boolean(isOwner || isModerator),
    }),
  });
});

app.post("/api/listings", authRequired, async (req, res) => {
  const { title, description, price, category } = req.body;
  if (!title || !description || !price || !category) {
    return res.status(400).json({ error: "Заполните все поля." });
  }
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "Некорректная цена." });
  }
  const [result] = await pool.query(
    "INSERT INTO listings (user_id, title, description, price, category, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [req.user.id, title, description, numericPrice, category]
  );
  const [rows] = await pool.query(
    `${listingSelect} WHERE l.id = ?`,
    [result.insertId]
  );
  return res
    .status(201)
    .json({ listing: pickListing(rows[0], { includeModeration: true }) });
});

app.patch("/api/listings/:id", authRequired, async (req, res) => {
  const listingId = Number(req.params.id);
  const [rows] = await pool.query(
    "SELECT * FROM listings WHERE id = ? LIMIT 1",
    [listingId]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "Объявление не найдено." });
  }
  const listing = rows[0];
  const isOwner = req.user.id === listing.user_id;
  const isModerator = ["moderator", "admin"].includes(req.user.role);
  if (!isOwner && !isModerator) {
    return res.status(403).json({ error: "Недостаточно прав." });
  }

  const updates = [];
  const params = [];
  const fields = ["title", "description", "category"];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      const value = String(req.body[field]).trim();
      if (!value) {
        return;
      }
      updates.push(`${field} = ?`);
      params.push(value);
    }
  });

  if (Object.prototype.hasOwnProperty.call(req.body, "price")) {
    const numericPrice = Number(req.body.price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: "Некорректная цена." });
    }
    updates.push("price = ?");
    params.push(numericPrice);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "Нет данных для обновления." });
  }

  if (!isModerator) {
    updates.push("status = 'pending'");
  }

  params.push(listingId);
  await pool.query(
    `UPDATE listings SET ${updates.join(", ")} WHERE id = ?`,
    params
  );

  const [updated] = await pool.query(
    `${listingSelect} WHERE l.id = ?`,
    [listingId]
  );
  return res.json({
    listing: pickListing(updated[0], { includeModeration: true }),
  });
});

app.post(
  "/api/listings/:id/moderate",
  authRequired,
  requireRole("moderator", "admin"),
  async (req, res) => {
    const listingId = Number(req.params.id);
    const { status, notes } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Некорректный статус." });
    }
    const [rows] = await pool.query(
      "SELECT * FROM listings WHERE id = ? LIMIT 1",
      [listingId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Объявление не найдено." });
    }
    await pool.query("UPDATE listings SET status = ? WHERE id = ?", [
      status,
      listingId,
    ]);
    await pool.query(
      "INSERT INTO listing_moderation (listing_id, moderator_id, status, notes) VALUES (?, ?, ?, ?)",
      [listingId, req.user.id, status, notes || null]
    );
    const [updated] = await pool.query(
      `${listingSelect} WHERE l.id = ?`,
      [listingId]
    );
    return res.json({
      listing: pickListing(updated[0], { includeModeration: true }),
    });
  }
);

app.get(
  "/api/admin/users",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, email, login, role, status, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json({ users: rows.map(pickUser) });
  }
);

app.patch(
  "/api/admin/users/:id/role",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    const userId = Number(req.params.id);
    const { role } = req.body;
    if (!["user", "moderator", "admin"].includes(role)) {
      return res.status(400).json({ error: "Некорректная роль." });
    }
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    const [rows] = await pool.query(
      "SELECT id, email, login, role, status, created_at FROM users WHERE id = ?",
      [userId]
    );
    return res.json({ user: rows[0] ? pickUser(rows[0]) : null });
  }
);

app.patch(
  "/api/admin/users/:id/status",
  authRequired,
  requireRole("admin"),
  async (req, res) => {
    const userId = Number(req.params.id);
    const { status } = req.body;
    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({ error: "Некорректный статус." });
    }
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [
      status,
      userId,
    ]);
    const [rows] = await pool.query(
      "SELECT id, email, login, role, status, created_at FROM users WHERE id = ?",
      [userId]
    );
    return res.json({ user: rows[0] ? pickUser(rows[0]) : null });
  }
);

app.get(
  "/api/admin/disputes",
  authRequired,
  requireRole("moderator", "admin"),
  async (req, res) => {
    const status = req.query.status || "open";
    const [rows] = await pool.query(
      `SELECT d.*, o.amount, o.status AS order_status,
        l.title AS listing_title,
        buyer.login AS buyer_login,
        seller.login AS seller_login
       FROM order_disputes d
       JOIN orders o ON d.order_id = o.id
       JOIN listings l ON o.listing_id = l.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE d.status = ?
       ORDER BY d.created_at DESC`,
      [status]
    );
    return res.json({ disputes: rows.map(pickDispute) });
  }
);

app.post(
  "/api/admin/disputes/:id/resolve",
  authRequired,
  requireRole("moderator", "admin"),
  async (req, res) => {
    const disputeId = Number(req.params.id);
    const { resolution, notes } = req.body || {};
    if (!["refund", "release"].includes(resolution)) {
      return res.status(400).json({ error: "Некорректное решение спора." });
    }
    const connection = await pool.getConnection();
    let refundId = null;
    try {
      await connection.beginTransaction();
      const [disputeRows] = await connection.query(
        "SELECT * FROM order_disputes WHERE id = ? FOR UPDATE",
        [disputeId]
      );
      if (!disputeRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Спор не найден." });
      }
      const dispute = disputeRows[0];
      if (dispute.status !== "open") {
        await connection.rollback();
        return res.status(400).json({ error: "Спор уже закрыт." });
      }
      const [orderRows] = await connection.query(
        "SELECT * FROM orders WHERE id = ? FOR UPDATE",
        [dispute.order_id]
      );
      if (!orderRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Заказ не найден." });
      }
      const order = orderRows[0];
      if (resolution === "release") {
        if (order.status !== "escrow") {
          await connection.rollback();
          return res.status(400).json({ error: "Заказ не готов к выдаче." });
        }
        await ensureWallet(order.buyer_id, connection);
        await ensureWallet(order.seller_id, connection);
        const [walletRows] = await connection.query(
          "SELECT held_balance FROM wallets WHERE user_id = ? FOR UPDATE",
          [order.buyer_id]
        );
        const heldBalance = Number(walletRows[0]?.held_balance || 0);
        if (heldBalance < Number(order.amount)) {
          await connection.rollback();
          return res
            .status(409)
            .json({ error: "Недостаточно средств на удержании." });
        }
        await connection.query(
          "UPDATE wallets SET held_balance = held_balance - ? WHERE user_id = ?",
          [order.amount, order.buyer_id]
        );
        await connection.query(
          "UPDATE wallets SET available_balance = available_balance + ? WHERE user_id = ?",
          [order.amount, order.seller_id]
        );
        await connection.query(
          "UPDATE orders SET status = 'released', confirmed_at = NOW() WHERE id = ?",
          [order.id]
        );
      } else {
        if (order.status !== "escrow") {
          await connection.rollback();
          return res.status(400).json({ error: "Заказ не готов к возврату." });
        }
        const [paymentRows] = await connection.query(
          "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
          [order.id]
        );
        if (!paymentRows.length) {
          await connection.rollback();
          return res.status(400).json({ error: "Платеж не найден." });
        }
        const payment = paymentRows[0];
        let refundStatus = "succeeded";
        let providerRefundId = `refund-${Date.now().toString(36).toUpperCase()}`;
        if (payment.provider === "tbank") {
          if (!isTbankEnabled) {
            await connection.rollback();
            return res.status(400).json({ error: "T-Bank is not configured." });
          }
          if (!payment.provider_payment_id) {
            await connection.rollback();
            return res.status(400).json({ error: "??? ?????????????? ???????." });
          }
          const refundResponse = await cancelTbankPayment({
            paymentId: payment.provider_payment_id,
            amount: order.amount,
          });
          refundStatus = mapTbankRefundStatus(refundResponse);
          providerRefundId = String(
            refundResponse?.PaymentId ||
              payment.provider_payment_id ||
              providerRefundId
          );
        }
        const [refundResult] = await connection.query(
          `INSERT INTO refunds (order_id, payment_id, amount, status, provider, provider_refund_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            payment.id,
            order.amount,
            refundStatus,
            payment.provider || PAYMENT_PROVIDER,
            providerRefundId,
          ]
        );
        refundId = refundResult.insertId;
      }
      await connection.query(
        "UPDATE order_disputes SET status = 'resolved', resolution = ?, notes = ?, resolved_at = NOW() WHERE id = ?",
        [resolution, notes || null, disputeId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    if (refundId) {
      const [refundRows] = await pool.query(
        "SELECT status FROM refunds WHERE id = ? LIMIT 1",
        [refundId]
      );
      if (refundRows.length && refundRows[0].status === "succeeded") {
        await applyRefundSuccess({ refundId });
      }
    }
    const [disputes] = await pool.query(
      `SELECT d.*, o.amount, o.status AS order_status,
        l.title AS listing_title,
        buyer.login AS buyer_login,
        seller.login AS seller_login
       FROM order_disputes d
       JOIN orders o ON d.order_id = o.id
       JOIN listings l ON o.listing_id = l.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE d.id = ?`,
      [disputeId]
    );
    return res.json({ dispute: disputes[0] ? pickDispute(disputes[0]) : null });
  }
);

const startServer = async () => {
  try {
    await ensureProfileColumns();
    await ensurePaymentTables();
    await ensurePaymentColumns();
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
