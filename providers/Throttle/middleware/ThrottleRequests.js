'use strict';
const GeneralException = use('App/Exceptions/GeneralException');

const Crypto = require('crypto');


class ThrottleRequests {

    constructor(throttle) {
        this.throttle = throttle;
        this.ENABLED_THIS_MIDDLEWARE = process.env.NODE_ENV === 'production' || process.env.ENALBLE_THROTTLE_HANDLING === '1'

    }

    static isWhitelistIp(ip) {
        const WhitelistIp = process.env.WHITE_LIST_IP || '';
        let ips = [];
        try {
            ips = WhitelistIp !== ''
                ? WhitelistIp.split(',').map(item => item)
                : [];
        } catch (e) {
            console.error('__ WhitelistIp', e);
        }
        return ips.indexOf(ip) >= 0
    }

    /**
     *
     * Handle an incoming request.
     *
     * @param   {Request}     request
     * @param   {Response}    response
     * @param   {Function}    next
     * @param   {Number}      maxAttempts     [optional, default = 60]
     * @param   {Number}      decayInSeconds    [optional, default = 1]
     * @param   {String}      uid
     * @return  {Response|Function}
     *
     * @public
     */
    async handle(
        {
            request,
            response
        }, next, [maxAttempts = 60, decayInSeconds = 60, banThreshold = 5, banInSeconds = 60 * 60, uidKey = null],
        uid = false) {


        const ip = request.header('cf-connecting-ip') || request.ip() || request.header('x-forwarded-for') ||
            request.request.connection.remoteAddress;
        let _maxAttempts = parseInt(maxAttempts),
            _decayInSeconds = parseInt(decayInSeconds),
            _banThreshold = parseInt(banThreshold),
            _banInSeconds = parseInt(banInSeconds)
        if (ThrottleRequests.isWhitelistIp(ip)) {
            _maxAttempts = 1000
        }
        if (this.ENABLED_THIS_MIDDLEWARE) {
            const signature = this._resolveSignature(request, uid);
            this.throttle.resource(
                signature,
                _maxAttempts,
                _decayInSeconds,
                _banThreshold,
                _banInSeconds,
            );
            //Check ban
            if (!this.throttle.isBanned()) {
                return response.status(GeneralException.Error.IP_BANNED.status).send({status: GeneralException.Error.IP_BANNED.message});
            }
            //Check rate limit
            if (!this.throttle.attempt()) {
                this.throttle.incrementExpiration();
                this._addHeaders(
                    response,
                    _maxAttempts,
                    this.throttle.remainingAttempts(),
                    this.throttle.store.secondsToExpiration(this.throttle.key),
                );

                // throw new Error('Too Many Attempts.')
                return response.status(GeneralException.Error.TOO_MANY_REQUEST.status).send({status: GeneralException.Error.TOO_MANY_REQUEST.message});
            }

            this._addHeaders(
                response,
                _maxAttempts,
                this.throttle.remainingAttempts(),
            );
        }

        await next();
    }

    /**
     * Resolve signature.
     *
     * @param   {Request}     request
     * @param   {String}      uid
     * @return  {String}
     *
     * @private
     */
    _resolveSignature(request, uid) {
        const ip = request.header('cf-connecting-ip') || request.ip() || request.header('x-forwarded-for') ||
            request.request.connection.remoteAddress;
        let generator = Crypto.createHash('sha1');
        if (uid === false) {
            generator.update(`${request.method()}|${request.url()}|${ip}`);
        } else {
            generator.update(uid);
        }
        return generator.digest('hex');
    }

    /**
     * Add the limit header information to the given response.
     *
     * @param   {Response}    response
     * @param   {Number}      maxAttempts
     * @param   {Number}      remainingAttempts
     * @param   {Number}      retryAfter          [optional, default = null]
     * @return  {void}
     *
     * @private
     */
    _addHeaders(response, maxAttempts, remainingAttempts, retryAfter = null) {
        response.header('X-RateLimit-Limit', maxAttempts);
        response.header('X-RateLimit-Remaining', remainingAttempts);
        if (retryAfter !== null) {
            response.header('Retry-After', retryAfter);
            response.header('X-RateLimit-Reset', new Date().getTime() + (retryAfter * 1000));
        }
    }

}

module.exports = ThrottleRequests;
