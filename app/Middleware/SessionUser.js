'use strict'

class SessionUser {
    /**
     * @param {object} ctx
     * @param {Request} ctx.request
     * @param {Function} next
     */
    async handle (ctx, next) {
        try {
            const authHeader = ctx.request.header('x-auth-user')
            if (!authHeader) {
                return
            }
            try {
                const user = JSON.parse(authHeader)
                if (!user || !user.id) {
                    throw new Error('Invalid user')
                }
                ctx.user = user
            } catch (e) {
                return
            }
        } catch (e) {
            console.error('Parse proxy metadata error', e)
        } finally {
            // call next to advance the request
            await next()
        }
    }
}

module.exports = SessionUser
