# Rossmann Fotowelt Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an ioBroker adapter that periodically queries Rossmann Fotowelt order status for multiple configured orders and exposes results as ioBroker states with status-change detection.

**Architecture:** ioBroker adapter extending `@iobroker/adapter-core`. A separate `lib/rossmannApi.js` handles HTTP calls (GET for session cookie, then POST with FormData). The main adapter polls all configured orders at a configurable interval and writes states per order. Status changes trigger `statusChanged = true`.

**Tech Stack:** Node.js (CommonJS), `@iobroker/adapter-core`, `axios` + `axios-cookiejar-support` + `tough-cookie` (session cookie handling), `jest` (unit tests)

---

## Context: ioBroker Adapter Anatomy

An ioBroker adapter is a Node.js process managed by the ioBroker host. Key files:
- `io-package.json` — metadata, default config, state definitions for the admin
- `package.json` — npm package definition (name MUST be `iobroker.rossmann-fotowelt`)
- `main.js` — entry point, extends `utils.Adapter`
- `admin/jsonConfig.json` — declarative admin UI (no HTML needed)

The adapter is started by ioBroker, which passes config from `io-package.json`'s `native` block. States live under `rossmann-fotowelt.0.<channel>.<state>`.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `io-package.json`
- Create: `.gitignore`
- Create: `main.js` (skeleton only)

**Step 1: Create `package.json`**

```json
{
  "name": "iobroker.rossmann-fotowelt",
  "version": "0.0.1",
  "description": "ioBroker adapter for Rossmann Fotowelt order status",
  "author": "lars",
  "license": "MIT",
  "main": "main.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "jest --forceExit"
  },
  "dependencies": {
    "@iobroker/adapter-core": "^3.1.6",
    "axios": "^1.6.0",
    "axios-cookiejar-support": "^4.0.7",
    "tough-cookie": "^4.1.3"
  },
  "devDependencies": {
    "@iobroker/testing": "^4.1.3",
    "jest": "^29.7.0"
  }
}
```

**Step 2: Create `io-package.json`**

```json
{
  "common": {
    "name": "rossmann-fotowelt",
    "version": "0.0.1",
    "news": {
      "0.0.1": {
        "en": "Initial release",
        "de": "Erstveröffentlichung"
      }
    },
    "title": "Rossmann Fotowelt",
    "titleLang": {
      "en": "Rossmann Fotowelt Order Status",
      "de": "Rossmann Fotowelt Bestellstatus"
    },
    "desc": {
      "en": "Tracks Rossmann Fotowelt order status",
      "de": "Fragt den Bestellstatus bei Rossmann Fotowelt ab"
    },
    "authors": ["lars"],
    "keywords": ["rossmann", "fotowelt", "order", "photo"],
    "license": "MIT",
    "platform": "Javascript/Node.js",
    "main": "main.js",
    "icon": "admin/rossmann-fotowelt.png",
    "enabled": true,
    "extIcon": "",
    "readme": "",
    "loglevel": "info",
    "mode": "daemon",
    "type": "general",
    "adminUI": {
      "config": "json"
    },
    "connectionType": "cloud",
    "dataSource": "poll",
    "supportCustoms": false
  },
  "native": {
    "pollingInterval": 30,
    "orders": []
  },
  "objects": [],
  "instanceObjects": []
}
```

**Step 3: Create `.gitignore`**

```
node_modules/
*.log
.DS_Store
```

**Step 4: Create `main.js` skeleton**

```javascript
'use strict';

const utils = require('@iobroker/adapter-core');

class RossmannFotowelt extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'rossmann-fotowelt' });
        this.pollingTimer = null;
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.log.info('Rossmann Fotowelt adapter started');
        // TODO: implement polling
    }

    async onUnload(callback) {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }
        callback();
    }
}

if (require.main !== module) {
    module.exports = (options) => new RossmannFotowelt(options);
} else {
    new RossmannFotowelt();
}
```

**Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

**Step 6: Commit**

```bash
git init
git add package.json io-package.json .gitignore main.js
git commit -m "feat: scaffold rossmann-fotowelt adapter"
```

---

### Task 2: Admin UI (JSON Config)

**Files:**
- Create: `admin/jsonConfig.json`

The ioBroker `jsonConfig` admin UI is defined purely in JSON. The `table` type renders an editable list of rows. Each column maps to a key in the `orders` array objects stored in `native`.

**Step 1: Create `admin/` directory and `admin/jsonConfig.json`**

```json
{
  "type": "panel",
  "i18n": true,
  "items": {
    "pollingInterval": {
      "type": "number",
      "label": "Polling-Intervall (Minuten)",
      "min": 5,
      "max": 1440,
      "default": 30,
      "sm": 4
    },
    "_spacer": {
      "type": "divider",
      "sm": 12
    },
    "orders": {
      "type": "table",
      "label": "Bestellungen",
      "sm": 12,
      "uniqueColumns": ["bagid"],
      "items": [
        {
          "type": "text",
          "attr": "name",
          "title": "Name (z.B. 'Fotos Weihnachten 2025')",
          "width": "40%"
        },
        {
          "type": "text",
          "attr": "bagid",
          "title": "Bestellnummer (bagid)",
          "width": "30%"
        },
        {
          "type": "text",
          "attr": "outletid",
          "title": "Filialnummer (outletid)",
          "width": "30%"
        }
      ]
    }
  }
}
```

**Step 2: Verify JSON is valid**

```bash
node -e "require('./admin/jsonConfig.json'); console.log('JSON valid')"
```

Expected: `JSON valid`

**Step 3: Commit**

```bash
git add admin/jsonConfig.json
git commit -m "feat: add admin jsonConfig UI for orders and polling interval"
```

---

### Task 3: Rossmann API Client (TDD)

**Files:**
- Create: `lib/rossmannApi.js`
- Create: `test/rossmannApi.test.js`

The API client GETs the tracking page (to get session cookie), then POSTs with order data. We mock `axios` in tests so no real HTTP calls are made.

**Step 1: Write the failing test first**

Create `test/rossmannApi.test.js`:

```javascript
'use strict';

jest.mock('axios');
jest.mock('axios-cookiejar-support');
jest.mock('tough-cookie');

const axios = require('axios');
const { fetchOrderStatus } = require('../lib/rossmannApi');

const BASE_URL = 'https://www.rossmann-fotowelt.de';

describe('fetchOrderStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns parsed order data on success', async () => {
        // Simulate GET (cookie fetch) returning 200
        // Simulate POST returning order data
        axios.create.mockReturnValue({
            get: jest.fn().mockResolvedValue({ status: 200 }),
            post: jest.fn().mockResolvedValue({
                data: {
                    bagTrackingData: {
                        bagOrder: {
                            status: 'Abholbereit',
                            inDate: '2026-02-20',
                            outDate: '2026-02-25'
                        }
                    }
                }
            })
        });

        const result = await fetchOrderStatus({ bagid: '12345', outletid: '678' });

        expect(result.status).toBe('Abholbereit');
        expect(result.inDate).toBe('2026-02-20');
        expect(result.outDate).toBe('2026-02-25');
    });

    it('returns null when order not found', async () => {
        axios.create.mockReturnValue({
            get: jest.fn().mockResolvedValue({ status: 200 }),
            post: jest.fn().mockResolvedValue({
                data: {
                    bagTrackingData: null
                }
            })
        });

        const result = await fetchOrderStatus({ bagid: '99999', outletid: '678' });

        expect(result).toBeNull();
    });

    it('throws on network error', async () => {
        axios.create.mockReturnValue({
            get: jest.fn().mockRejectedValue(new Error('Network error')),
            post: jest.fn()
        });

        await expect(fetchOrderStatus({ bagid: '12345', outletid: '678' }))
            .rejects.toThrow('Network error');
    });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx jest test/rossmannApi.test.js --forceExit
```

Expected: FAIL — `Cannot find module '../lib/rossmannApi'`

**Step 3: Create `lib/rossmannApi.js`**

```javascript
'use strict';

const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const BASE_URL = 'https://www.rossmann-fotowelt.de';
const TRACKING_PAGE = `${BASE_URL}/service/auftragsstatus/bestellung-filiale`;

/**
 * Fetches the order status from Rossmann Fotowelt.
 *
 * @param {{ bagid: string, outletid: string }} order
 * @returns {Promise<{status: string, inDate: string, outDate: string} | null>}
 */
async function fetchOrderStatus({ bagid, outletid }) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        withCredentials: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ioBroker-RossmannFotowelt/1.0)',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'de-DE,de;q=0.9',
            'Referer': TRACKING_PAGE,
            'X-Requested-With': 'XMLHttpRequest'
        }
    }));

    // GET the page first to obtain a session cookie
    await client.get(TRACKING_PAGE);

    // POST to the API endpoint
    const params = new URLSearchParams({
        bagid,
        outletid,
        ajax: 'aimeos-frontend-api',
        action: 'bagTracking'
    });

    const response = await client.post(BASE_URL, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const bagOrder = response.data?.bagTrackingData?.bagOrder;
    if (!bagOrder) {
        return null;
    }

    return {
        status: bagOrder.status || 'Unbekannt',
        inDate: bagOrder.inDate || '',
        outDate: bagOrder.outDate || ''
    };
}

module.exports = { fetchOrderStatus };
```

**Step 4: Run tests again**

```bash
npx jest test/rossmannApi.test.js --forceExit
```

Expected: All 3 tests PASS.

> **Note:** If tests fail because `axios-cookiejar-support` mock is complex, simplify the mock in the test — the `wrapper()` call can be a no-op in tests since we mock `axios.create`.

**Step 5: Commit**

```bash
git add lib/rossmannApi.js test/rossmannApi.test.js
git commit -m "feat: add Rossmann API client with tests"
```

---

### Task 4: State Manager (TDD)

**Files:**
- Create: `lib/stateManager.js`
- Create: `test/stateManager.test.js`

The state manager creates ioBroker channels and states for each order, and updates them with fresh data. It receives the ioBroker adapter instance as a dependency (so it can be easily mocked in tests).

**Step 1: Write failing tests**

Create `test/stateManager.test.js`:

```javascript
'use strict';

const { createOrderStates, updateOrderStates } = require('../lib/stateManager');

function makeAdapter() {
    return {
        setObjectNotExistsAsync: jest.fn().mockResolvedValue(undefined),
        setStateAsync: jest.fn().mockResolvedValue(undefined),
        getStateAsync: jest.fn().mockResolvedValue(null)
    };
}

describe('createOrderStates', () => {
    it('creates a channel and all 8 states for an order', async () => {
        const adapter = makeAdapter();
        await createOrderStates(adapter, { bagid: '12345', outletid: '678', name: 'Test' });

        // Should create channel + 8 states
        expect(adapter.setObjectNotExistsAsync).toHaveBeenCalledTimes(9);

        // Channel call
        expect(adapter.setObjectNotExistsAsync).toHaveBeenCalledWith(
            'orders.12345',
            expect.objectContaining({ type: 'channel' })
        );

        // State calls
        const statePaths = adapter.setObjectNotExistsAsync.mock.calls.map(c => c[0]);
        expect(statePaths).toContain('orders.12345.bagid');
        expect(statePaths).toContain('orders.12345.outletid');
        expect(statePaths).toContain('orders.12345.name');
        expect(statePaths).toContain('orders.12345.status');
        expect(statePaths).toContain('orders.12345.inDate');
        expect(statePaths).toContain('orders.12345.outDate');
        expect(statePaths).toContain('orders.12345.lastUpdated');
        expect(statePaths).toContain('orders.12345.statusChanged');
    });
});

describe('updateOrderStates', () => {
    it('sets all states and statusChanged=false when status unchanged', async () => {
        const adapter = makeAdapter();
        // Simulate previous status = 'In Bearbeitung'
        adapter.getStateAsync.mockResolvedValue({ val: 'In Bearbeitung' });

        await updateOrderStates(adapter, { bagid: '12345' }, {
            status: 'In Bearbeitung',
            inDate: '2026-02-20',
            outDate: ''
        });

        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.status', { val: 'In Bearbeitung', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.statusChanged', { val: false, ack: true });
    });

    it('sets statusChanged=true when status changed', async () => {
        const adapter = makeAdapter();
        // Previous status was different
        adapter.getStateAsync.mockResolvedValue({ val: 'In Bearbeitung' });

        await updateOrderStates(adapter, { bagid: '12345' }, {
            status: 'Abholbereit',
            inDate: '2026-02-20',
            outDate: '2026-02-25'
        });

        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.statusChanged', { val: true, ack: true });
    });

    it('sets status to "Nicht gefunden" when apiData is null', async () => {
        const adapter = makeAdapter();
        adapter.getStateAsync.mockResolvedValue({ val: 'Abholbereit' });

        await updateOrderStates(adapter, { bagid: '12345' }, null);

        expect(adapter.setStateAsync).toHaveBeenCalledWith(
            'orders.12345.status',
            { val: 'Nicht gefunden', ack: true }
        );
    });
});
```

**Step 2: Run to verify failure**

```bash
npx jest test/stateManager.test.js --forceExit
```

Expected: FAIL — `Cannot find module '../lib/stateManager'`

**Step 3: Create `lib/stateManager.js`**

```javascript
'use strict';

/**
 * Creates the ioBroker channel and all states for one order.
 * Uses setObjectNotExistsAsync so existing objects are not overwritten.
 */
async function createOrderStates(adapter, order) {
    const channelId = `orders.${order.bagid}`;

    await adapter.setObjectNotExistsAsync(channelId, {
        type: 'channel',
        common: {
            name: order.name || order.bagid
        },
        native: {}
    });

    const states = [
        { id: 'bagid',         type: 'string',  role: 'text',      write: false, desc: 'Bestellnummer' },
        { id: 'outletid',      type: 'string',  role: 'text',      write: false, desc: 'Filialnummer' },
        { id: 'name',          type: 'string',  role: 'text',      write: false, desc: 'Anzeigename' },
        { id: 'status',        type: 'string',  role: 'text',      write: true,  desc: 'Aktueller Status' },
        { id: 'inDate',        type: 'string',  role: 'text',      write: false, desc: 'Eingangsdatum' },
        { id: 'outDate',       type: 'string',  role: 'text',      write: false, desc: 'Abholdatum' },
        { id: 'lastUpdated',   type: 'string',  role: 'text',      write: false, desc: 'Letzte Abfrage' },
        { id: 'statusChanged', type: 'boolean', role: 'indicator', write: true,  desc: 'Status hat sich geändert' }
    ];

    for (const s of states) {
        await adapter.setObjectNotExistsAsync(`${channelId}.${s.id}`, {
            type: 'state',
            common: {
                name: s.desc,
                type: s.type,
                role: s.role,
                read: true,
                write: s.write
            },
            native: {}
        });
    }
}

/**
 * Updates states for one order after a fresh API call.
 *
 * @param adapter - ioBroker adapter instance
 * @param order - { bagid, outletid, name }
 * @param apiData - { status, inDate, outDate } or null if not found
 */
async function updateOrderStates(adapter, order, apiData) {
    const prefix = `orders.${order.bagid}`;
    const now = new Date().toISOString();

    if (apiData === null) {
        await adapter.setStateAsync(`${prefix}.status`,      { val: 'Nicht gefunden', ack: true });
        await adapter.setStateAsync(`${prefix}.lastUpdated`, { val: now, ack: true });
        return;
    }

    // Detect status change
    const prevState = await adapter.getStateAsync(`${prefix}.status`);
    const prevStatus = prevState ? prevState.val : null;
    const statusChanged = prevStatus !== null && prevStatus !== apiData.status;

    await adapter.setStateAsync(`${prefix}.status`,        { val: apiData.status,  ack: true });
    await adapter.setStateAsync(`${prefix}.inDate`,        { val: apiData.inDate,  ack: true });
    await adapter.setStateAsync(`${prefix}.outDate`,       { val: apiData.outDate, ack: true });
    await adapter.setStateAsync(`${prefix}.lastUpdated`,   { val: now,             ack: true });
    await adapter.setStateAsync(`${prefix}.statusChanged`, { val: statusChanged,   ack: true });
}

module.exports = { createOrderStates, updateOrderStates };
```

**Step 4: Run tests**

```bash
npx jest test/stateManager.test.js --forceExit
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add lib/stateManager.js test/stateManager.test.js
git commit -m "feat: add state manager with status-change detection"
```

---

### Task 5: Main Adapter Logic

**Files:**
- Modify: `main.js`

Now wire everything together: on startup, create states for all configured orders and write their static values (bagid, outletid, name). Then poll immediately and set up the interval.

**Step 1: Replace `main.js` with full implementation**

```javascript
'use strict';

const utils = require('@iobroker/adapter-core');
const { fetchOrderStatus } = require('./lib/rossmannApi');
const { createOrderStates, updateOrderStates } = require('./lib/stateManager');

class RossmannFotowelt extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'rossmann-fotowelt' });
        this.pollingTimer = null;
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        const { orders, pollingInterval } = this.config;

        if (!orders || orders.length === 0) {
            this.log.warn('Keine Bestellungen konfiguriert. Bitte in der Admin-UI konfigurieren.');
            return;
        }

        // Create states for all orders
        for (const order of orders) {
            await createOrderStates(this, order);
            // Write static values
            await this.setStateAsync(`orders.${order.bagid}.bagid`,   { val: order.bagid,   ack: true });
            await this.setStateAsync(`orders.${order.bagid}.outletid`, { val: order.outletid, ack: true });
            await this.setStateAsync(`orders.${order.bagid}.name`,     { val: order.name || '', ack: true });
        }

        // Poll immediately, then on interval
        await this.pollAllOrders(orders);

        const intervalMs = Math.max(5, pollingInterval || 30) * 60 * 1000;
        this.pollingTimer = setInterval(() => this.pollAllOrders(orders), intervalMs);
        this.log.info(`Polling alle ${pollingInterval || 30} Minuten gestartet.`);
    }

    async pollAllOrders(orders) {
        this.log.debug(`Starte Abfrage für ${orders.length} Bestellung(en)...`);
        for (const order of orders) {
            await this.pollOrder(order);
        }
    }

    async pollOrder(order) {
        this.log.debug(`Frage Status ab für Bestellung ${order.bagid} (Filiale ${order.outletid})...`);
        let retries = 0;
        while (retries < 3) {
            try {
                const data = await fetchOrderStatus(order);
                await updateOrderStates(this, order, data);
                if (data) {
                    this.log.info(`Bestellung ${order.bagid}: Status = "${data.status}"`);
                } else {
                    this.log.warn(`Bestellung ${order.bagid}: Nicht gefunden.`);
                }
                return;
            } catch (err) {
                retries++;
                this.log.warn(`Fehler bei Bestellung ${order.bagid} (Versuch ${retries}/3): ${err.message}`);
                if (retries < 3) {
                    await new Promise(r => setTimeout(r, 5 * 60 * 1000)); // wait 5 min before retry
                }
            }
        }
        // After 3 failures
        this.log.error(`Bestellung ${order.bagid}: Abfrage nach 3 Versuchen fehlgeschlagen.`);
        await this.setStateAsync(`orders.${order.bagid}.status`, { val: 'Fehler: Keine Verbindung', ack: true });
    }

    async onUnload(callback) {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        callback();
    }
}

if (require.main !== module) {
    module.exports = (options) => new RossmannFotowelt(options);
} else {
    new RossmannFotowelt();
}
```

**Step 2: Run all tests to make sure nothing broke**

```bash
npx jest --forceExit
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add main.js
git commit -m "feat: wire adapter main with polling and error handling"
```

---

### Task 6: Manual Integration Test

**Goal:** Verify the adapter actually returns data from Rossmann before installing into ioBroker.

**Step 1: Create a quick test script**

Create `test/manual-test.js` (do NOT commit this):

```javascript
'use strict';

const { fetchOrderStatus } = require('../lib/rossmannApi');

// Replace with real values for testing
const TEST_ORDER = {
    bagid: 'DEINE_BESTELLNUMMER',
    outletid: 'DEINE_FILIALNUMMER'
};

(async () => {
    console.log('Teste Rossmann API...');
    try {
        const result = await fetchOrderStatus(TEST_ORDER);
        console.log('Ergebnis:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Fehler:', err.message);
    }
})();
```

**Step 2: Fill in real values and run**

```bash
# Edit test/manual-test.js with real bagid and outletid, then:
node test/manual-test.js
```

Expected output (example):
```json
{
  "status": "Abholbereit",
  "inDate": "2026-02-20",
  "outDate": "2026-02-25"
}
```

> **If you get an error or null:** The API response structure might differ from what was analyzed. Log `response.data` in `rossmannApi.js` to inspect the real response and adjust field names accordingly.

**Step 3: Adjust `rossmannApi.js` if needed**

If the real API response structure differs, update the field mapping in `fetchOrderStatus()`. Re-run the unit tests after any changes.

**Step 4: Delete test script (don't commit credentials)**

```bash
rm test/manual-test.js
```

---

### Task 7: Install into ioBroker

**Goal:** Install the adapter into the local ioBroker instance.

**Context:** ioBroker is typically installed at `/opt/iobroker` (Linux) or via the ioBroker installer. You need the `iobroker` CLI or can install manually.

**Step 1: Find your ioBroker installation**

```bash
ls /opt/iobroker 2>/dev/null || \
ls ~/iobroker 2>/dev/null || \
which iobroker
```

**Step 2: Install adapter from local path**

```bash
# From the ioBroker directory:
cd /opt/iobroker   # or your ioBroker path
npm install /Users/lars/Development/iobroker/ioBroker.rossmann-fotowelt --save
```

Alternatively, using the ioBroker CLI:

```bash
iobroker url /Users/lars/Development/iobroker/ioBroker.rossmann-fotowelt
```

**Step 3: Restart ioBroker and configure**

1. Open ioBroker Admin UI (typically http://localhost:8081)
2. Go to **Adapter** → find "rossmann-fotowelt" → click **+** to add instance
3. In the instance config: set polling interval, add your orders (bagid + outletid + name)
4. Save and check **Log** tab for output

**Step 4: Verify states appear**

In ioBroker Admin → **Objects** → look for:
```
rossmann-fotowelt.0.orders.<bagid>.status
rossmann-fotowelt.0.orders.<bagid>.statusChanged
```

---

### Task 8: Automation Example (optional, for reference)

This is NOT code to write in the adapter — it's an example script for the ioBroker JavaScript adapter to send a Pushover notification when status changes:

```javascript
// In ioBroker JavaScript adapter:
on({ id: 'rossmann-fotowelt.0.orders.*.statusChanged', val: true }, async (obj) => {
    const bagid = obj.id.split('.')[3];
    const status = await getStateAsync(`rossmann-fotowelt.0.orders.${bagid}.status`);
    sendTo('pushover.0', {
        message: `Bestellung ${bagid}: Status geändert zu "${status.val}"`,
        title: 'Rossmann Fotowelt'
    });
    // Reset flag
    setState(obj.id, false);
});
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Scaffold | `package.json`, `io-package.json`, `main.js` |
| 2 | Admin UI | `admin/jsonConfig.json` |
| 3 | API Client (TDD) | `lib/rossmannApi.js`, `test/rossmannApi.test.js` |
| 4 | State Manager (TDD) | `lib/stateManager.js`, `test/stateManager.test.js` |
| 5 | Main Logic | `main.js` |
| 6 | Manual Integration Test | (temporary script) |
| 7 | Install into ioBroker | (CLI commands) |

## Known Risk: API Response Structure

The Rossmann API response structure was analyzed from the page's JavaScript, not from a live call. The field names (`bagTrackingData.bagOrder.status`, `inDate`, `outDate`) may differ. Task 6 (manual integration test) is specifically designed to catch this — inspect the real response and adjust field names before installing into ioBroker.
