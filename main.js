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
