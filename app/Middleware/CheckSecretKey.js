'use strict'

const GeneralException = use('App/Exceptions/GeneralException')

class CheckSecretKey {
    /**
     * @param {object} ctx
     * @param {Request} ctx.request
     * @param {Function} next
     */
    async handle ({ request, response }, next) {
        // call next to advance the request
        if (request.header('api-private-key') !== process.env.LOAN_API_PRIVATE_KEY) {
            return response.status(GeneralException.Error.UNAUTHORIZED.status)
                .send({ status: GeneralException.Error.UNAUTHORIZED.message })
        }
        await next()
    }
}

module.exports = CheckSecretKey
