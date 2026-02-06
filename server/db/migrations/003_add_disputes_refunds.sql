USE castlelab_market;

ALTER TABLE payments ADD COLUMN provider VARCHAR(40) NOT NULL DEFAULT 'mock';
ALTER TABLE payments ADD COLUMN provider_payment_id VARCHAR(80);

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
