'use strict';

jest.mock('axios');
jest.mock('axios-cookiejar-support', () => ({ wrapper: (x) => x }));
jest.mock('tough-cookie');

const axios = require('axios');
const { fetchOrderStatus } = require('../lib/rossmannApi');

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
                    data: {
                        bagTrackingData: {
                            bagOrder: {
                                inDate:    '2026-02-20',
                                outDate:   '2026-02-25',
                                city:      'Musterstadt',
                                storeName: 'Dirk Rossmann GmbH',
                                street:    'Musterstraße 1',
                                zip:       '12345'
                            }
                        }
                    }
                }
            })
        });

        const result = await fetchOrderStatus({ bagid: '12345', outletid: '678' });

        // status is derived: outDate present → 'Abholbereit'
        expect(result.status).toBe('Abholbereit');
        expect(result.inDate).toBe('2026-02-20');
        expect(result.outDate).toBe('2026-02-25');
        expect(result.city).toBe('Musterstadt');
        expect(result.storeName).toBe('Dirk Rossmann GmbH');
        expect(result.street).toBe('Musterstraße 1');
        expect(result.zip).toBe('12345');
    });

    it('derives status "Eingegangen" when outDate is absent', async () => {
        axios.create.mockReturnValue({
            get: jest.fn().mockResolvedValue({ status: 200 }),
            post: jest.fn().mockResolvedValue({
                data: {
                    data: {
                        bagTrackingData: {
                            bagOrder: {
                                inDate:    '2026-03-05T12:31:00+01:00',
                                city:      'Spremberg',
                                storeName: 'Dirk Rossmann GmbH',
                                street:    'Heinrichstraße 18',
                                zip:       '03130'
                            }
                        }
                    }
                }
            })
        });

        const result = await fetchOrderStatus({ bagid: '446101', outletid: '2489' });

        expect(result.status).toBe('Eingegangen');
        expect(result.outDate).toBe('');
    });

    it('returns null when order not found', async () => {
        axios.create.mockReturnValue({
            get: jest.fn().mockResolvedValue({ status: 200 }),
            post: jest.fn().mockResolvedValue({
                data: {
                    data: {
                        bagTrackingData: {}
                    }
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
