USE castlelab_market;

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
  sbp_reference VARCHAR(120),
  qr_payload TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
