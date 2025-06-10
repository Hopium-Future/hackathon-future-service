'use strict'

const BaseQueue = use('App/Queues/BaseQueue')
const Error = use('Config')
    .get('error')
const SpotService = use('App/Services/SpotService')
const SwapService = use('App/Services/SwapService')

class OrderQueue extends BaseQueue {
    static async doTask (options = {}) {
        try {
            const { _type } = options
            let data = null
            if (_type === 'place') {
                data = await SpotService.place(options)
            } else if (_type === 'close') {
                data = await SpotService.close(options)
            } else if (_type === 'confirm_swap_order') {
                data = await SwapService.confirmSwapOrder(options)
            } else if (_type === 'swap_pre_order') {
                data = await SwapService.preOrder(options)
            } else if (_type === 'get_swap_price') {
                data = await SwapService.getSwapPrice(options)
            }
            return {
                status: 'ok',
                data
            }
        } catch (error) {
            Logger.info('Process exchange job', options, error)
            let _error = Error.UNKNOWN
            if (error?.message && Error?.[error?.message]) {
                _error = error
            }
            return { status: _error.message }
        }
    }
}

module.exports = OrderQueue

OrderQueue.Task = {
    PLACE_ORDER: 'place',
    CLOSE_ORDER: 'close',
    MODIFY_ORDER: 'modify'
}

OrderQueue.Event = {
    OPEN_ORDER_RESULT: 'open_result',
    CLOSE_ORDER_RESULT: 'close_result',
    MODIFY_ORDER_RESULT: 'modify_result'
}
