# README Design — iobroker.rossmann-fotowelt

**Datum:** 2026-05-25
**Zielgruppe:** ioBroker-Nutzer, die den Adapter installieren wollen
**Sprache:** Deutsch
**Format:** GitHub Markdown mit Badges

---

## Struktur

### 1. Header
- Adapter-Logo (`admin/rossmann-fotowelt.svg`) eingebunden als `<img>`
- Titel: `ioBroker Adapter: Rossmann Fotowelt`
- Badges: npm-Version, Lizenz (MIT), Node.js ≥18

### 2. Beschreibung
- Kurztext: Was der Adapter macht (Bestellstatus von Rossmann Fotowelt Taschenabgabe-Aufträgen abfragen und als ioBroker-States bereitstellen)
- Hinweis: inoffizieller Community-Adapter, nicht von Rossmann

### 3. Installation
- Schritt-für-Schritt über ioBroker-Admin → Adapter → "Von GitHub installieren"
- GitHub-URL: `https://github.com/larsauswsw/iobroker.rossmann-fotowelt`

### 4. Konfiguration
- **Polling-Intervall:** Standardwert 30 Minuten, Minimum 5 Minuten
- **Bestellungen:** Tabelle mit Name, bagid, outletid
  - Herkunft bagid/outletid: Abreiszettel, der beim Tascheneinwurf im Laden ausgehändigt wird
- **Pushover:** optional, Instanz auswählen, Test-Button

### 5. Datenpunkte (States)
Tabelle: State-Pfad, Typ, Beschreibung

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `orders.{bagid}.status` | string | "Eingegangen", "Abholbereit", "Nicht gefunden", "Fehler: Keine Verbindung" |
| `orders.{bagid}.inDate` | string | ISO-Timestamp Eingangsdatum |
| `orders.{bagid}.outDate` | string | ISO-Timestamp Abholdatum (leer wenn noch nicht bereit) |
| `orders.{bagid}.statusChanged` | boolean | true wenn Status sich geändert hat |
| `orders.{bagid}.lastUpdated` | string | ISO-Timestamp der letzten Abfrage |
| `orders.{bagid}.city` | string | Stadt der Filiale |
| `orders.{bagid}.storeName` | string | Name der Filiale |
| `orders.{bagid}.street` | string | Straße der Filiale |
| `orders.{bagid}.zip` | string | PLZ der Filiale |
| `orders.{bagid}.bagid` | string | Bestellnummer |
| `orders.{bagid}.outletid` | string | Filialnummer |
| `orders.{bagid}.name` | string | Benutzerdefinierter Name |

### 6. Automatisierungen
- Beispiel: Auf `statusChanged === true` reagieren (ioBroker-Skript oder Blockly)
- Hinweis: `statusChanged` springt nach Änderung auf true und bleibt bis zur nächsten Abfrage so

### 7. Troubleshooting
- Status "Nicht gefunden" → falsche bagid oder outletid prüfen
- Status "Fehler: Keine Verbindung" → Netzwerk prüfen, Adapter wartet 5 Minuten und versucht es 3× erneut
- Pushover kommt nicht an → Instanz-Auswahl prüfen, Test-Button nutzen, Pushover-Adapter-Log prüfen

### 8. FAQ
- Wie oft wird abgefragt? → konfigurierbares Intervall, Standard 30 Minuten
- Woher bekomme ich bagid und outletid? → Abreiszettel beim Tascheneinwurf
- Kann ich mehrere Bestellungen tracken? → ja, beliebig viele in der Tabelle
- Was passiert nach der Abholung? → Status bleibt auf "Abholbereit", kein automatisches Löschen

### 9. Changelog
- 0.0.1 — Erstveröffentlichung

### 10. Lizenz
MIT License, Copyright Lars Miesner
