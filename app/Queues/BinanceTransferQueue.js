'use strict'

const BaseQueue = use('App/Queues/BaseQueue')
const Error = use('Config')
    .get('error')

class BinanceTransferQueue extends BaseQueue {
    static async doTask (options = {}) {
        try {
            const { _type } = options
            let data = null
            if (_type === 'binance_execution') {
                data = await use('App/Services/BinanceSpotService').processBinanceExecutionOrder(options)
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

    static async onBinanceExecution (match) {
        // TODO remove
        Logger.info('Pass match', match)
        return this.addTaskRaw(`binance_spot:match_order`, match)
    }
}

module.exports = BinanceTransferQueue

BinanceTransferQueue.Task = {
    PLACE_ORDER: 'place',
    CLOSE_ORDER: 'close',
    MODIFY_ORDER: 'modify'
}

BinanceTransferQueue.Event = {
    OPEN_ORDER_RESULT: 'open_result',
    CLOSE_ORDER_RESULT: 'close_result',
    MODIFY_ORDER_RESULT: 'modify_result'
}
