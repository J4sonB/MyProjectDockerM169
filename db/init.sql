DROP TABLE IF EXISTS bestellungen;
DROP TABLE IF EXISTS artikel;
DROP TABLE IF EXISTS kunden;
DROP TABLE IF EXISTS login_logs;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS products;

CREATE TABLE kunden (
    kunde_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lieferadresse TEXT NOT NULL
);

CREATE TABLE artikel (
    artikel_id INT AUTO_INCREMENT PRIMARY KEY,
    produkt_name VARCHAR(100) NOT NULL,
    groesse VARCHAR(10) NOT NULL,
    farbe VARCHAR(30) NOT NULL,
    preis DECIMAL(10,2) NOT NULL
);

CREATE TABLE bestellungen (
    bestell_id INT AUTO_INCREMENT PRIMARY KEY,
    fk_kunde_id INT NOT NULL,
    fk_artikel_id INT NOT NULL,
    bestelldatum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_kunde_id) REFERENCES kunden(kunde_id) ON DELETE RESTRICT,
    FOREIGN KEY (fk_artikel_id) REFERENCES artikel(artikel_id) ON DELETE RESTRICT
);

INSERT INTO artikel (produkt_name, groesse, farbe, preis) VALUES
('Premium T-Shirt', 'L', 'Schwarz', 29.99),
('Premium T-Shirt', 'M', 'Weiß', 29.99),
('Kapuzenpullover', 'XL', 'Grau', 59.50),
('Sneaker Basic', '42', 'Blau', 89.90),
('Laptop-Rucksack', 'Uni', 'Schwarz', 45.00);
