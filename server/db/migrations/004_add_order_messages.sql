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
