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

        // Should create channel + 12 states
        expect(adapter.setObjectNotExistsAsync).toHaveBeenCalledTimes(13);

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
        expect(statePaths).toContain('orders.12345.city');
        expect(statePaths).toContain('orders.12345.storeName');
        expect(statePaths).toContain('orders.12345.street');
        expect(statePaths).toContain('orders.12345.zip');
    });
});

describe('updateOrderStates', () => {
    it('sets all states and statusChanged=false when status unchanged', async () => {
        const adapter = makeAdapter();
        adapter.getStateAsync.mockResolvedValue({ val: 'Eingegangen' });

        await updateOrderStates(adapter, { bagid: '12345' }, {
            status: 'Eingegangen',
            inDate: '2026-02-20',
            outDate: '',
            city: 'Musterstadt',
            storeName: 'Dirk Rossmann GmbH',
            street: 'Musterstraße 1',
            zip: '12345'
        });

        expect(adapter.setStateAsync).toHaveBeenCalledTimes(9);
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.status',        { val: 'Eingegangen', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.inDate',        { val: '2026-02-20', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.outDate',       { val: '', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.statusChanged', { val: false, ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.city',          { val: 'Musterstadt', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.storeName',     { val: 'Dirk Rossmann GmbH', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.street',        { val: 'Musterstraße 1', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.zip',           { val: '12345', ack: true });
        // lastUpdated is an ISO timestamp — just verify it was called
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.lastUpdated', expect.objectContaining({ ack: true }));
    });

    it('sets statusChanged=true when status changed', async () => {
        const adapter = makeAdapter();
        // Previous status was different
        adapter.getStateAsync.mockResolvedValue({ val: 'In Bearbeitung' });

        await updateOrderStates(adapter, { bagid: '12345' }, {
            status: 'Abholbereit',
            inDate: '2026-02-20',
            outDate: '2026-02-25',
            city: '', storeName: '', street: '', zip: ''
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
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.inDate',  { val: '', ack: true });
        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.outDate', { val: '', ack: true });
    });

    it('sets statusChanged=false on first poll (no previous state)', async () => {
        const adapter = makeAdapter();
        // getStateAsync returns null (default in makeAdapter) — no previous state
        await updateOrderStates(adapter, { bagid: '12345' }, {
            status: 'Eingegangen',
            inDate: '2026-02-20',
            outDate: '',
            city: '', storeName: '', street: '', zip: ''
        });

        expect(adapter.setStateAsync).toHaveBeenCalledWith('orders.12345.statusChanged', { val: false, ack: true });
    });
});
