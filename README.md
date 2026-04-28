# 📖 Projektdokumentation: Docker Shop

Diese Dokumentation beschreibt die Architektur und alle Schritte, die unternommen wurden, um das Projekt von einer statischen Nginx/PostgreSQL-Seite zu einer dynamischen, modernen **Full-Stack E-Commerce-Anwendung** umzubauen.

---

## 🏛️ 1. Architektur-Übersicht

Das Projekt basiert auf einer **Microservices-Architektur**, die vollständig über `docker-compose` orchestriert wird. Es besteht aus vier Hauptkomponenten:

1. **Frontend (Nginx)**: Liefert die Webseite aus und dient als "Reverse Proxy".
2. **Backend (Node.js)**: Verarbeitet die Geschäftslogik (APIs) und spricht mit der Datenbank.
3. **Datenbank (MySQL)**: Speichert Artikel und Bestände persistent ab.
4. **Cloudflare Tunnel**: Stellt das lokale Setup weltweit über eine sichere, dynamische URL zur Verfügung.

---

## 💾 2. Die Datenbank (MySQL)

### Wechsel von PostgreSQL zu MySQL
Ursprünglich war das Projekt für PostgreSQL konfiguriert. Wir haben dies vollständig auf MySQL umstrukturiert:
- **Port-Konflikt gelöst:** Da auf deinem Mac bereits ein lokaler Dienst auf Port `3306` lief, haben wir den MySQL-Port nach außen auf `3307` verlegt (`3307:3306`).
- **Initialisierung:** Die Datei `db/init.sql` wurde mit MySQL-Syntax ausgestattet (z. B. `AUTO_INCREMENT` statt `SERIAL`, `INSERT IGNORE` statt `ON CONFLICT`).

### Tabellen-Struktur
In der `init.sql` werden beim ersten Start zwei Tabellen erstellt:
- `app_users`: Beinhaltet Benutzer (z.B. admin).
- `products`: Speichert die Shop-Artikel (`id`, `name`, `price`, `stock`). Hier haben wir zum Start 4 Demo-Artikel mit Lagerbeständen eingefügt.

---

## ⚙️ 3. Das Backend (Node.js / Express)

Um sicher mit der Datenbank zu kommunizieren, wurde ein eigener Container im Ordner `backend/` geschaffen.

- **Stack:** Node.js, Express.js (Web-Framework), `mysql2` (Datenbanktreiber).
- **APIs:**
  - `GET /api/products`: Holt alle Artikel aus der MySQL-Tabelle und gibt sie als JSON ans Frontend.
  - `POST /api/buy/:id`: Prüft den aktuellen Lagerbestand. Wenn Vorrat da ist, wird der `stock` in der Datenbank um 1 reduziert. Es werden sichere Transaktionen genutzt, um Fehler zu vermeiden.
- **Dockerisierung:** Ein eigenes `Dockerfile` installiert die Abhängigkeiten (`package.json`) und startet den Node-Server auf Port `3000`.

---

## 🌐 4. Nginx Reverse Proxy

Nginx ist das Tor zum System. In der `nginx/default.conf` haben wir Nginx zwei Aufgaben gegeben:
1. **Statisches Hosting:** Alles, was normal aufgerufen wird (z. B. `/`), liefert Nginx aus dem `/frontend`-Ordner (HTML/CSS) aus.
2. **Reverse Proxy:** Alles, was an `/api/...` gesendet wird, leitet Nginx unsichtbar an den internen `backend`-Container weiter (`proxy_pass http://backend:3000/api/;`). So vermeiden wir komplexe CORS-Fehler im Browser.

---

## 🎨 5. Das Frontend (Single-Page Application)

Die `frontend/index.html` wurde zu einer interaktiven SPA (Single-Page Application) im modernen Design umgeschrieben.

### Design Features (CSS)
- **Dark-Theme & Glassmorphism:** Milchglas-Effekte (`backdrop-filter: blur()`), dunkle Hintergrundtöne und elegante violette Farbverläufe (`linear-gradient`).
- **Schneeflocken:** Ein JavaScript-Skript erzeugt dynamisch kleine `<div>`-Elemente, die als fallende Schneeflocken animiert werden.
- **Benachrichtigungen:** Ein eigens programmiertes "Toast"-Benachrichtigungssystem ploppt unten rechts auf, um Bestätigungen (z.B. "Erfolgreich gekauft") anzuzeigen.

### JavaScript Logik
- **Tab-Navigation (`switchTab`)**: Blendet per CSS-Klasse (`display: block` vs `display: none`) zwischen Startseite, Shop und Kontaktformular hin und her.
- **Dynamisches Rendering**: Ruft `fetch('/api/products')` auf und generiert das HTML für die Artikelkarten live im Browser.
- **Kaufen-Logik**: Sendet einen Request an `POST /api/buy/:id`, wertet die Antwort aus und aktualisiert die Stückzahl (`stock`) in Echtzeit (inklusive Farbwechsel von grün auf rot bei Ausverkauf).

---

## 🚀 6. Cloudflare Tunnel (Internet-Freigabe)

Um die Seite mit dem Internet zu teilen, haben wir den Dienst `cloudflared` in die `docker-compose.yml` integriert.
- Er baut eine verschlüsselte Verbindung von deinem lokalen Docker-Netzwerk zu den Cloudflare-Servern auf.
- In den Logs des Containers (`docker-compose logs tunnel`) wird ein eindeutiger Link generiert (z. B. `https://name-wort.trycloudflare.com`).
- Wer auf diesen Link klickt, wird automatisch sicher auf deinen lokalen Nginx-Server geleitet.

---

## 🔧 7. Wichtige Docker-Befehle

Hier ist dein Cheatsheet für den täglichen Umgang mit deinem Projekt:

- **Projekt starten** (im Hintergrund): `docker-compose up -d`
- **Projekt stoppen**: `docker-compose down`
- **Datenbank komplett zurücksetzen**: `docker-compose down -v` (löscht das Datenbank-Volume)
- **Öffentlichen Cloudflare-Link anzeigen**: `docker-compose logs tunnel`
- **Backend neu bauen** (nach Code-Änderungen im Backend): `docker-compose up -d --build`

*Hinweis: Änderungen im Frontend (z.B. `index.html`) werden sofort live im Browser sichtbar, sobald du speicherst und neu lädst. Es ist kein Docker-Neustart nötig.*

test