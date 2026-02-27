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
    if (!bagid || !outletid) {
        throw new Error(`fetchOrderStatus: bagid and outletid are required (got bagid="${bagid}", outletid="${outletid}")`);
    }

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

    const bagOrder = response.data?.data?.bagTrackingData?.bagOrder;
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
