'use strict'

const Task = use('Task')
const FuturesService = use('App/Services/FuturesService')

class ScanRecentTrade extends Task {
    static get schedule () {
        return '*/2 * * * *'
    }

    async handle () {
        await FuturesService.trimRecentTrade()
    }
}

module.exports = ScanRecentTrade
