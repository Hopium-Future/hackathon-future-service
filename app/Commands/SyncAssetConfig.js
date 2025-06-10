'use strict'

const { Command } = require('@adonisjs/ace')
const axios = require('axios')
const AssetConfig = use('App/Models/Config/AssetConfig')
const Currencies = use('Config').get('walletCurrencies')
class SyncBinanceConfig extends Command {
    static get signature () {
        return 'add_wallet_currencies'
    }

    static get description () {
        return 'Tell something helpful about this command'
    }

    async handle (args, options) {
        this.info('Dummy implementation for sync:binance:config command')
        // const {data: {data}} = await axios.get('https://www.binance.com/bapi/composite/v2/public/asset/asset/get-all-asset')

        //console.log('__ check currencies', Currencies)

    }
}

module.exports = SyncBinanceConfig
