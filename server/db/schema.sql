CREATE DATABASE IF NOT EXISTS castlelab_market;
USE castlelab_market;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  login VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80),
  bio TEXT,
  university VARCHAR(120),
  faculty VARCHAR(120),
  city VARCHAR(80),
  avatar_url VARCHAR(255),
  role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
  status ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(80) NOT NULL,
  status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listing_moderation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  moderator_id INT NOT NULL,
  status ENUM('approved', 'rejected') NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id INT PRIMARY KEY,
  available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  held_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS order_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order_messages_order_id (order_id)
);
