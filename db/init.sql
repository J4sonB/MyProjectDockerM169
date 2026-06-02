-- ============================================================
-- Auth-System (bestehend)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(80) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

-- ============================================================
-- Shop-System (neu)
-- ============================================================

CREATE TABLE IF NOT EXISTS kunden (
    kunde_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lieferadresse TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artikel (
    artikel_id INT AUTO_INCREMENT PRIMARY KEY,
    produkt_name VARCHAR(100) NOT NULL,
    groesse VARCHAR(10) NOT NULL,
    farbe VARCHAR(30) NOT NULL,
    preis DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS bestellungen (
    bestell_id INT AUTO_INCREMENT PRIMARY KEY,
    fk_kunde_id INT NOT NULL,
    fk_artikel_id INT NOT NULL,
    bestelldatum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_kunde_id) REFERENCES kunden(kunde_id) ON DELETE RESTRICT,
    FOREIGN KEY (fk_artikel_id) REFERENCES artikel(artikel_id) ON DELETE RESTRICT
);

-- ============================================================
-- Demo-Daten: Artikel
-- ============================================================

INSERT IGNORE INTO artikel (produkt_name, groesse, farbe, preis) VALUES
('Premium T-Shirt', 'S', 'Schwarz', 29.99),
('Premium T-Shirt', 'M', 'Schwarz', 29.99),
('Premium T-Shirt', 'L', 'Schwarz', 29.99),
('Premium T-Shirt', 'XL', 'Schwarz', 29.99),
('Premium T-Shirt', 'M', 'Weiss', 29.99),
('Premium T-Shirt', 'L', 'Weiss', 29.99),
('Hoodie Classic', 'S', 'Navy', 59.99),
('Hoodie Classic', 'M', 'Navy', 59.99),
('Hoodie Classic', 'L', 'Navy', 59.99),
('Hoodie Classic', 'M', 'Grau', 59.99),
('Hoodie Classic', 'L', 'Grau', 59.99),
('Laptop-Sticker Pack', '-', 'Bunt', 5.00),
('Kaffeebecher', '-', 'Schwarz', 12.50),
('Kaffeebecher', '-', 'Weiss', 12.50),
('Wireless Maus', '-', 'Schwarz', 49.99),
('Cap Snapback', 'One Size', 'Schwarz', 24.99),
('Cap Snapback', 'One Size', 'Navy', 24.99);
