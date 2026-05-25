<p align="center">
  <img src="admin/rossmann-fotowelt.svg" width="100" alt="Rossmann Fotowelt Logo" />
</p>

<h1 align="center">ioBroker Adapter: Rossmann Fotowelt</h1>

<p align="center">
  <a href="https://github.com/larsauswsw/iobroker.rossmann-fotowelt/blob/main/LICENSE"><img src="https://img.shields.io/badge/Lizenz-MIT-green.svg" alt="Lizenz: MIT" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-blue.svg" alt="Node.js >=18" />
  <img src="https://img.shields.io/badge/ioBroker-Adapter-orange.svg" alt="ioBroker Adapter" />
  <img src="https://img.shields.io/badge/Version-0.0.1-lightgrey.svg" alt="Version 0.0.1" />
</p>

---

## Beschreibung

Dieser Adapter fragt den Bestellstatus bei **Rossmann Fotowelt** (Taschenabgabe-Aufträge) ab und stellt ihn als ioBroker-States bereit. So kannst du direkt in ioBroker sehen, ob deine Fotos bereits fertig zur Abholung sind — und dich optional per Pushover benachrichtigen lassen.

> **Hinweis:** Dies ist ein inoffizieller Community-Adapter und steht in keiner Verbindung zu Rossmann.

---

## Installation

1. ioBroker Admin öffnen → **Adapter** → Tab **"Von GitHub"**
2. URL eingeben: `https://github.com/larsauswsw/iobroker.rossmann-fotowelt`
3. **Installieren** klicken
4. Eine neue Instanz des Adapters anlegen

---

## Konfiguration

### Polling-Intervall

Legt fest, wie oft der Adapter den Bestellstatus abfragt (in Minuten). Standardwert: **30 Minuten**, Minimum: **5 Minuten**.

### Bestellungen

Hier trägst du eine oder mehrere Bestellungen ein:

| Feld | Beschreibung |
|------|-------------|
| **Name** | Freier Name zur Identifikation, z.B. `Fotos Weihnachten 2025` |
| **Bestellnummer (bagid)** | Steht auf dem Abreiszettel, den du beim Einwurf der Tasche im Laden erhältst |
| **Filialnummer (outletid)** | Ebenfalls auf dem Abreiszettel |

> **Wo finde ich bagid und outletid?**
> Beim Abgeben deiner Fototasche im Laden bekommst du einen **Abreiszettel**. Auf diesem stehen die Bestellnummer (bagid) und die Filialnummer (outletid).

### Pushover-Benachrichtigung (optional)

1. **Checkbox** "Pushover-Benachrichtigung bei Statusänderung" aktivieren
2. Die gewünschte **Pushover-Instanz** auswählen
3. Mit dem **"Test senden"**-Button die Verbindung prüfen

---

## Datenpunkte (States)

Für jede konfigurierte Bestellung werden folgende States unter `rossmann-fotowelt.0.orders.{bagid}.` angelegt:

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `status` | string | Aktueller Status: `Eingegangen`, `Abholbereit`, `Nicht gefunden` oder `Fehler: Keine Verbindung` |
| `inDate` | string | ISO-Timestamp des Eingangsdatums |
| `outDate` | string | ISO-Timestamp des Abholdatums (leer, solange noch nicht bereit) |
| `statusChanged` | boolean | `true`, wenn sich der Status bei der letzten Abfrage geändert hat |
| `lastUpdated` | string | ISO-Timestamp der letzten Abfrage |
| `city` | string | Stadt der Filiale |
| `storeName` | string | Name der Filiale |
| `street` | string | Straße der Filiale |
| `zip` | string | PLZ der Filiale |
| `bagid` | string | Bestellnummer |
| `outletid` | string | Filialnummer |
| `name` | string | Benutzerdefinierter Name aus der Konfiguration |

---

## Automatisierungen

Der State `statusChanged` wird bei jeder Abfrage, bei der sich der Status geändert hat, auf `true` gesetzt. Damit lassen sich einfache Automationen bauen.

**Beispiel mit ioBroker JavaScript-Adapter:**

```javascript
on({ id: 'rossmann-fotowelt.0.orders.446101.statusChanged', val: true }, () => {
    const status = getState('rossmann-fotowelt.0.orders.446101.status').val;
    const name = getState('rossmann-fotowelt.0.orders.446101.name').val;
    log(`Bestellung "${name}": Status ist jetzt "${status}"`);
    // Hier z.B. weitere Aktionen: E-Mail, Telegram, Licht blinken, ...
});
```

> **Tipp:** Wenn Pushover installiert ist, übernimmt der Adapter die Benachrichtigung direkt — eine eigene Automation ist dann nicht nötig.

---

## Troubleshooting

### Status "Nicht gefunden"
- **bagid** oder **outletid** falsch eingegeben — Abreiszettel erneut prüfen
- Die Bestellung ist noch nicht im System erfasst — kurz warten und manuell neu starten

### Status "Fehler: Keine Verbindung"
- Netzwerkverbindung oder Rossmann-API nicht erreichbar
- Der Adapter versucht es automatisch **3× im Abstand von 5 Minuten** erneut
- Adapter-Log im ioBroker Admin prüfen für Details

### Pushover-Benachrichtigung kommt nicht an
1. Pushover-Instanz in der Konfiguration korrekt ausgewählt?
2. **"Test senden"**-Button klicken — erscheint eine Fehlermeldung im Log?
3. Log des Pushover-Adapters selbst prüfen (ioBroker Admin → Log, Filter auf `pushover`)
4. Pushover-App auf dem Gerät: Benachrichtigungen erlaubt?

### Adapter startet nicht / Warnung "Keine Bestellungen konfiguriert"
- Mindestens eine Bestellung mit **bagid** und **outletid** in der Admin-UI eintragen

---

## FAQ

**Wie oft wird der Status abgefragt?**
Das Intervall ist in der Admin-UI konfigurierbar (Standard: 30 Minuten, Minimum: 5 Minuten). Der erste Abruf erfolgt sofort beim Start des Adapters.

**Woher bekomme ich bagid und outletid?**
Beim Einwurf deiner Fototasche im Laden erhältst du einen Abreiszettel mit beiden Nummern.

**Kann ich mehrere Bestellungen gleichzeitig tracken?**
Ja, in der Konfiguration können beliebig viele Bestellungen in der Tabelle eingetragen werden.

**Was passiert, nachdem ich die Fotos abgeholt habe?**
Der Status bleibt auf `Abholbereit` stehen. Es gibt keine automatische Erkennung der Abholung. Die Bestellung kann einfach aus der Konfiguration gelöscht werden.

**Unterstützt der Adapter andere Benachrichtigungsdienste als Pushover?**
Aktuell nur Pushover. Über den `statusChanged`-State lassen sich aber beliebige Automationen mit anderen Adaptern (Telegram, E-Mail etc.) bauen.

**Was ist, wenn die Rossmann-API nicht erreichbar ist?**
Der Adapter versucht es bei einem Fehler automatisch 3× im Abstand von jeweils 5 Minuten. Danach wird der Status auf `Fehler: Keine Verbindung` gesetzt und beim nächsten regulären Polling erneut versucht.

---

## Changelog

### 0.0.1
* Erstveröffentlichung
* Bestellstatus-Abfrage via Rossmann Fotowelt API
* Konfigurierbare Polling-Intervalle
* Pushover-Benachrichtigung bei Statusänderung

---

## Lizenz

MIT License

Copyright (c) 2025 Lars Miesner

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
