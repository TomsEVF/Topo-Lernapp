# 🌍 Topografie-Lernapp für die Geografieprüfung

Diese Web-App hilft beim Lernen von topografischen Begriffen für die mündliche Realschulabschlussprüfung.  
Sie bietet eine interaktive Karte, verschiedene Spielmodi und speichert den Lernfortschritt – wahlweise lokal oder in der Cloud (bunny.net).

## 🚀 Funktionen
- Interaktive Weltkarte (OpenStreetMap)
- Lernen, Quiz (Klick) und Multiple-Choice-Modus
- Persönlicher Fortschritt mit Lernstufen (0–5)
- Benutzerprofile ohne Passwort
- Fortschrittsspeicherung im Browser (localStorage) oder optional in bunny.net (geräteübergreifend)

## 📦 Installation / Selbst hosten

### 1. Repository auf GitHub anlegen
- Erstelle ein neues öffentliches Repository (z.B. `topo-lernapp`)
- Lade alle Dateien dieser App in das Repository hoch (siehe Struktur unten)

### 2. GitHub Pages aktivieren
- Gehe zu **Settings → Pages**
- Wähle als Branch `main` und Ordner `/ (root)`
- Speichern – nach wenigen Minuten ist die App unter `https://DEINUSER.github.io/topo-lernapp/` erreichbar

### 3. (Optional) bunny.net für Cloud-Speicher einrichten
- Erstelle einen **Storage Zone** in bunny.net (z.B. `topo-lernapp-profiles`)
- Notiere den **Storage Zone Name** und das **Password** (AccessKey)
- Erstelle im Storage einen Ordner `users/`
- Kopiere `config.js.example` nach `config.js` und trage die Zugangsdaten ein
- **Wichtig:** Der AccessKey ist im Client sichtbar! Daher solltest du entweder CORS einschränken (nur deine GitHub Pages Domain erlauben) oder einen kleinen Proxy verwenden (siehe Hinweise im Code).

### 4. Geodaten vervollständigen
Die Datei `data/geodata.json` enthält bereits einige Beispiel-Begriffe. Du musst alle Begriffe aus der PDF `Topo_Merkstoff_RS.pdf` ergänzen und die Koordinaten recherchieren.  
Nutze dazu z.B. [Google Maps](https://maps.google.com) oder [Nominatim](https://nominatim.openstreetmap.org/).

## 🔧 Vorbereitung

### Geodaten vervollständigen
Die Datei `data/geodata.json` enthält bereits viele Begriffe, aber **die Koordinaten sind teilweise noch Platzhalter**.  
Damit die App korrekt funktioniert, musst du für jeden Eintrag die richtigen Breiten- und Längengrade recherchieren (z.B. über Google Maps oder Nominatim) und in der JSON-Datei eintragen.  
Begriffe mit `lat: 0, lon: 0` werden in der App ignoriert (weder im Lernen-Modus noch in Quizfragen).

### Bunny.net Cloud-Speicher (optional)
- Erstelle einen Storage Zone in bunny.net, z.B. `topo-lernapp-profiles`
- Lege darin einen Ordner `users/` an
- Kopiere `config.js` und trage deine Zugangsdaten ein
- **Achtung:** Der AccessKey ist im Client sichtbar. Schränke daher CORS auf deine GitHub-Pages-Domain ein oder verwende einen Proxy.