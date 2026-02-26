# Design: ioBroker.rossmann-fotowelt Adapter

**Datum:** 2026-02-26
**Status:** Genehmigt

## Überblick

Ein ioBroker-Adapter, der den Bestellstatus bei Rossmann Fotowelt (https://www.rossmann-fotowelt.de/service/auftragsstatus/bestellung-filiale) automatisch abfragt und als ioBroker-States bereitstellt. Mehrere Bestellungen können verwaltet werden.

## Ziele

- Mehrere Bestellungen (Auftragstaschen) mit je eigener Bestellnummer und Filialnummer konfigurieren
- Status automatisch in konfigurierbarem Intervall abrufen (Standard: alle 30 Minuten)
- Status-Änderungen als ioBroker-Event auslösen (für Automationen wie Pushover)
- Fertige Bestellungen werden weiter abgefragt bis sie manuell aus der Liste entfernt werden

## Architektur

### Projektstruktur

```
ioBroker.rossmann-fotowelt/
├── package.json
├── io-package.json          # ioBroker Metadaten & State-Definitionen
├── main.js                  # Adapter-Hauptlogik
└── admin/
    ├── index_m.html         # Admin-UI (MaterialUI / JSON-basiert)
    └── words.js             # Übersetzungen (i18n)
```

### Technologie

- **Basis:** `@iobroker/adapter-core`
- **HTTP:** `node-fetch` (kein Browser/Playwright) — direkter HTTP POST an die Rossmann API
- **Node.js:** aktuelle LTS-Version

## API-Integration

### Endpoint

```
POST https://www.rossmann-fotowelt.de/
Content-Type: application/x-www-form-urlencoded
```

### Request-Body

```
bagid=<bestellnummer>
outletid=<filialnummer>
ajax=aimeos-frontend-api
action=bagTracking
```

### Ablauf

1. GET der Seite um Session-Cookie zu erhalten (falls nötig)
2. POST mit obigen Parametern + Cookie
3. JSON-Antwort parsen: `bagTrackingData.bagOrder`

### Fehlerbehandlung

| Szenario | Verhalten |
|----------|-----------|
| HTTP-Fehler / Netzwerk | State `status` = `"Fehler: Keine Verbindung"`, Retry nach 5 Min., nach 3 Fehlern: Log Error |
| "Kein Auftrag gefunden" | State `status` = `"Nicht gefunden"` |
| Erfolg | States werden aktualisiert, `statusChanged` = `true` wenn Status sich geändert hat |

## ioBroker State-Hierarchie

```
rossmann-fotowelt.0.
└── orders.
    └── {bagid}/
        ├── bagid           (string, ro) — Bestellnummer
        ├── outletid        (string, ro) — Filialnummer
        ├── name            (string, ro) — Anzeigename aus Konfiguration
        ├── status          (string, rw) — Aktueller Status-Text
        ├── inDate          (string, ro) — Eingangsdatum
        ├── outDate         (string, ro) — Abholdatum / fertig seit
        ├── lastUpdated     (string, ro) — Zeitpunkt der letzten Abfrage (ISO 8601)
        └── statusChanged   (boolean, rw) — true wenn Status sich seit letzter Abfrage geändert hat
```

`statusChanged` wird auf `true` gesetzt, wenn sich `status` geändert hat. Automationen setzen es nach Verarbeitung auf `false`.

## Admin-UI Konfiguration

| Feld | Typ | Standard | Beschreibung |
|------|-----|---------|--------------|
| `pollingInterval` | Zahl (Min.) | 30 | Abfrageintervall für alle Bestellungen |
| `orders` | Array/Tabelle | [] | Liste der Bestellungen |

### Tabelle `orders` (pro Zeile)

| Spalte | Typ | Pflicht | Beschreibung |
|--------|-----|---------|--------------|
| `name` | string | nein | Anzeigename (z.B. "Fotos Weihnachten 2025") |
| `bagid` | string | ja | Bestellnummer (Auftragstasche) |
| `outletid` | string | ja | Filialnummer |

## Polling-Logik

```
onReady():
  → Bestellungen aus Konfiguration laden
  → States anlegen (falls noch nicht vorhanden)
  → Alle Bestellungen sofort einmal abfragen
  → setInterval(pollingInterval) → alle Bestellungen abfragen

abfrageBestellung(order):
  → HTTP POST an Rossmann API
  → JSON parsen
  → Alten Status aus State lesen
  → Neuen Status in States schreiben
  → Falls Status sich geändert: statusChanged = true, Log Info
```

## Nicht im Scope

- Automatisches Löschen/Deaktivieren fertiger Bestellungen
- Push-Benachrichtigung direkt aus dem Adapter (wird über ioBroker-Automationen gelöst)
- Unterstützung mehrerer Adapter-Instanzen mit geteilter Konfiguration
