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
        { id: 'inDate',        type: 'string',  role: 'date',      write: false, desc: 'Eingangsdatum' },
        { id: 'outDate',       type: 'string',  role: 'date',      write: false, desc: 'Abholdatum' },
        { id: 'lastUpdated',   type: 'string',  role: 'date',      write: false, desc: 'Letzte Abfrage' },
        { id: 'statusChanged', type: 'boolean', role: 'switch',    write: true,  desc: 'Status hat sich geändert' },
        { id: 'city',          type: 'string',  role: 'text',      write: false, desc: 'Stadt der Filiale' },
        { id: 'storeName',     type: 'string',  role: 'text',      write: false, desc: 'Name der Filiale' },
        { id: 'street',        type: 'string',  role: 'text',      write: false, desc: 'Straße der Filiale' },
        { id: 'zip',           type: 'string',  role: 'text',      write: false, desc: 'PLZ der Filiale' }
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

    if (apiData == null) {
        const prevState = await adapter.getStateAsync(`${prefix}.status`);
        const prevStatus = prevState ? prevState.val : null;
        const statusChanged = prevStatus !== null && prevStatus !== 'Nicht gefunden';

        await adapter.setStateAsync(`${prefix}.status`,        { val: 'Nicht gefunden', ack: true });
        await adapter.setStateAsync(`${prefix}.inDate`,        { val: '', ack: true });
        await adapter.setStateAsync(`${prefix}.outDate`,       { val: '', ack: true });
        await adapter.setStateAsync(`${prefix}.lastUpdated`,   { val: now, ack: true });
        await adapter.setStateAsync(`${prefix}.statusChanged`, { val: statusChanged, ack: true });
        return { statusChanged };
    }

    // Detect status change
    const prevState = await adapter.getStateAsync(`${prefix}.status`);
    const prevStatus = prevState ? prevState.val : null;
    // prevStatus is null on first poll (state not yet written); no change is reported
    // on the initial value, only on subsequent transitions.
    const statusChanged = prevStatus !== null && prevStatus !== apiData.status;

    await adapter.setStateAsync(`${prefix}.status`,        { val: apiData.status,    ack: true });
    await adapter.setStateAsync(`${prefix}.inDate`,        { val: apiData.inDate,    ack: true });
    await adapter.setStateAsync(`${prefix}.outDate`,       { val: apiData.outDate,   ack: true });
    await adapter.setStateAsync(`${prefix}.lastUpdated`,   { val: now,               ack: true });
    await adapter.setStateAsync(`${prefix}.statusChanged`, { val: statusChanged,     ack: true });
    await adapter.setStateAsync(`${prefix}.city`,          { val: apiData.city,      ack: true });
    await adapter.setStateAsync(`${prefix}.storeName`,     { val: apiData.storeName, ack: true });
    await adapter.setStateAsync(`${prefix}.street`,        { val: apiData.street,    ack: true });
    await adapter.setStateAsync(`${prefix}.zip`,           { val: apiData.zip,       ack: true });
    return { statusChanged };
}

module.exports = { createOrderStates, updateOrderStates };
