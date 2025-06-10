'use strict';

class Throttle {

    constructor(cache) {
        this.store = cache;
    }

    resource(
        key, maxAttempts = 60, decayInSeconds = 60, banThreshold = 5, banInSeconds = 60 * 60) {
        this.key = key;
        this.maxAttempts = maxAttempts;
        this.decayInSeconds = decayInSeconds;
        this.banThreshold = banThreshold;
        this.banInSeconds = banInSeconds;

        this.isLocked = false;
    }

    getKey(type) {
        if (type === Throttle.Type.LIMIT_REQUEST) {
            return `limit_request:${this.key}`;
        } else {
            return `ban_ip:${this.key}`;
        }
    }

    isBanned() {
        return this.check(Throttle.Type.BAN_IP);
    }

    attempt() {
        let response = this.check(Throttle.Type.LIMIT_REQUEST);
        this.hit(Throttle.Type.LIMIT_REQUEST);
        if (!this.isLocked && !response) {
            this.hit(Throttle.Type.BAN_IP);
        }
        this.isLocked = !response;
        return response;
    }

    incrementExpiration(type, seconds) {
        this.store.incrementExpiration(this.getKey(type), seconds);
        return this;
    }

    hit(type) {
        if (this.count(type)) {
            return this.store.increment(this.getKey(type));
        }
        if (type === Throttle.Type.LIMIT_REQUEST) {
            return this.store.put(this.getKey(type), 1,
                this.decayInSeconds * 1000);
        } else {
            return this.store.put(this.getKey(type), 1,
                this.banInSeconds * 1000);
        }

    }

    count(type) {
        let count = this.store.get(this.getKey(type));
        if (typeof count === 'undefined') {
            return 0;
        }
        return count;
    }

    check(type) {
        if (type === Throttle.Type.LIMIT_REQUEST) {
            return this.count(type) < this.maxAttempts;
        } else {
            return this.count(type) < this.banThreshold;
        }

    }

    remainingAttempts() {
        return this.maxAttempts - this.count(Throttle.Type.LIMIT_REQUEST);
    }

}

module.exports = Throttle;

Throttle.Type = {
    LIMIT_REQUEST: 1,
    BAN_IP: 2,
};
