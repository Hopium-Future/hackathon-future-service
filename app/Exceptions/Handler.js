'use strict'

const GeneralException = use('App/Exceptions/GeneralException')

/**
 * This class handles all exceptions thrown during
 * the HTTP request lifecycle.
 *
 * @class ExceptionHandler
 */
class ExceptionHandler {
    /**
     * Handle exception thrown during the HTTP lifecycle
     *
     * @method handle
     *
     * @param  {Object} error
     * @param  {Object} options.request
     * @param  {Object} options.response
     *
     * @return {void}
     */
    async handle (error, {
        request,
        response
    }) {
        try {
            console.error(`Unknown error on ${request.originalUrl()}`, error)
            response.send({ status: 'error' })
        } catch (err) {
            console.error('Error in error handler', error)
        }
    }

    /**
     * Report exception for logging or debugging.
     *
     * @method report
     *
     * @param  {Object} error
     * @param  {Object} options.request
     *
     * @return {void}
     */
    async report (error, { request }) {
        console.error('Adonis handle', error)
    }
}

module.exports = ExceptionHandler
