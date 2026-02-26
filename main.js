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
        const { orders: rawOrders, pollingInterval } = this.config;

        if (!rawOrders || rawOrders.length === 0) {
            this.log.warn('Keine Bestellungen konfiguriert. Bitte in der Admin-UI konfigurieren.');
            return;
        }

        const orders = rawOrders.filter(o => {
            if (!o.bagid || !o.outletid) {
                this.log.warn(`Überspringe Bestellung ohne bagid/outletid: ${JSON.stringify(o)}`);
                return false;
            }
            return true;
        });

        if (orders.length === 0) {
            this.log.warn('Keine gültigen Bestellungen. Bitte bagid und outletid in der Admin-UI eintragen.');
            return;
        }

        // Create states for all orders
        for (const order of orders) {
            await createOrderStates(this, order);
            // Write static values
            await this.setStateAsync(`orders.${order.bagid}.bagid`,    { val: order.bagid,    ack: true });
            await this.setStateAsync(`orders.${order.bagid}.outletid`, { val: order.outletid, ack: true });
            await this.setStateAsync(`orders.${order.bagid}.name`,     { val: order.name || '', ack: true });
        }

        const effectiveInterval = Math.max(5, pollingInterval || 30);
        const intervalMs = effectiveInterval * 60 * 1000;
        this.pollingTimer = setInterval(() => this.pollAllOrders(orders), intervalMs);
        this.log.info(`Polling alle ${effectiveInterval} Minuten gestartet.`);

        // Poll immediately without blocking onReady (retry waits can take up to 15+ minutes)
        this.pollAllOrders(orders).catch(err => this.log.error(`Initial poll failed: ${err.message}`));
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
        try {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
                this.pollingTimer = null;
            }
        } catch (_e) {
            // ignore cleanup errors
        } finally {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new RossmannFotowelt(options);
} else {
    new RossmannFotowelt();
}
