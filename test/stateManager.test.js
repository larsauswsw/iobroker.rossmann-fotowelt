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
