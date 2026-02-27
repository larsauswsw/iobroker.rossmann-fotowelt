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
                                status: 'Abholbereit',
                                inDate: '2026-02-20',
                                outDate: '2026-02-25'
                            }
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
