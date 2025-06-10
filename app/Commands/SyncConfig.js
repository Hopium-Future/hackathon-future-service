'use strict'

const {Command} = require('@adonisjs/ace')
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const AssetConfig = use('App/Models/Config/AssetConfig')
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || null
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || null
const binance = require('node-binance-api')()
    .options({
        APIKEY: BINANCE_API_KEY,
        APISECRET: BINANCE_API_SECRET
    })
const _ = require('lodash')
const bb = require('bluebird')
const AssetValue = use('App/Models/Portfolio/AssetValue')

class SyncConfig extends Command {
    static get signature() {
        return 'sync:f:config'
    }

    static get description() {
        return 'Tell something helpful about this command'
    }

    async handle(args, options) {
        const FuturesPrice = use('App/Models/Futures/FuturesPrice')
        const configs = await FuturesConfig.find({quoteAsset: 'USDT', status: 'TRADING'})
        console.log('__ configs', configs.length)
        const fix = [
            {
                "symbol": "BTCUSDT",
                "max_leverage": 125,
                "max_total_volume": 1000000,
                "max_limit_volume": 250000,
                "max_market_volume": 50000
            },
            {
                "symbol": "ETHUSDT",
                "max_leverage": 100,
                "max_total_volume": 500000,
                "max_limit_volume": 125000,
                "max_market_volume": 50000
            },
            {
                "symbol": "BCHUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "EOSUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "LTCUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "ETCUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "LINKUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "BNBUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "DOTUSDT",
                "max_leverage": 75,
                "max_total_volume": 500000,
                "max_limit_volume": 25000,
                "max_market_volume": 10000
            },
            {
                "symbol": "BATUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "KNCUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "ICXUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "UNIUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "FTMUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "HNTUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "FLMUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "KSMUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "FILUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "LRCUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "BELUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "MANAUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "HOTUSDT",
                "max_leverage": 50,
                "max_total_volume": 50000,
                "max_limit_volume": 20000,
                "max_market_volume": 10000
            },
            {
                "symbol": "XRPUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "TRXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "XLMUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "ADAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "DASHUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "XTZUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "ATOMUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "ONTUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "VETUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "NEOUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "QTUMUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "THETAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "ALGOUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "ZILUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "COMPUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "DOGEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "KAVAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "WAVESUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 10000,
                "max_market_volume": 5000
            },
            {
                "symbol": "MKRUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "YFIUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BALUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CRVUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "RUNEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SUSHIUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "EGLDUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "STORJUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AVAXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ENJUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "TOMOUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "RENUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "NEARUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AAVEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "MATICUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AXSUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ALPHAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "GRTUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "1INCHUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CHZUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SANDUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "RVNUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ONEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DENTUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "OGNUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BAKEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AUDIOUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "C98USDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DYDXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "GALAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "PEOPLEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ROSEUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DUSKUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "RSRUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "XMRUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ZECUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "IOTAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ZRXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "OMGUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SXPUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BANDUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SNXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DEFIUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "TRBUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ZENUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "XEMUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "COTIUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CHRUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "HBARUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CELRUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DGBUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "1000SHIBUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "GTCUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BTCDOMUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "IOTXUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "MASKUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ATAUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "1000XECUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ARUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "KLAYUSDT",
                "max_leverage": 25,
                "max_total_volume": 20000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CTSIUSDT",
                "max_leverage": 25,
                "max_total_volume": 7500,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "LPTUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ENSUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "FLOWUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "IMXUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "GMTUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "APEUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "WOOUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "JASMYUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DARUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "GALUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "OPUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "INJUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "STGUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "FOOTBALLUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "DODOUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "TLMUSDT",
                "max_leverage": 25,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "IOSTUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "RLCUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BLZUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CTKUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "REEFUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ALICEUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "LINAUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "STMXUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CELOUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "UNFIUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SKLUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "MTLUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "NKNUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ANTUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "API3USDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SPELLUSDT",
                "max_leverage": 20,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SFPUSDT",
                "max_leverage": 15,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BLUEBIRDUSDT",
                "max_leverage": 15,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "SOLUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "OCEANUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ANKRUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "LITUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ICPUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ANCUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "ARPAUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AUCTIONUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "APTUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "QNTUSDT",
                "max_leverage": 10,
                "max_total_volume": 10000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "BNXUSDT",
                "max_leverage": 8,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "FTTUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "AMBUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "PHBUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "LDOUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CVXUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CVXUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CVXUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            },
            {
                "symbol": "CVXUSDT",
                "max_leverage": 5,
                "max_total_volume": 5000,
                "max_limit_volume": 5000,
                "max_market_volume": 2500
            }
        ]
        for (let i = 0; i < configs.length; i++) {
            const item = configs[i]
            const ticker = await FuturesPrice.getTicker(item.symbol)
            if (!ticker) {
                console.log('__ not fount last price', item.symbol)
                continue
            }
            const lastPrice = +ticker?.p || 0
            const fixSymbol = _.find(fix, {symbol: item.symbol})
            if(!fixSymbol) continue
            const {
                max_total_volume,
                max_limit_volume,
                max_market_volume,
            }  = fixSymbol

            const newFilter =  []
            for (let j = 0; j < item.filters.length; j++) {
                const filter = item.filters[j]
                const {filterType} = filter
                if (filterType === 'LOT_SIZE') {
                    newFilter.push({
                        ...item.filters[j],
                        maxQty: max_limit_volume / lastPrice,
                        maxQuoteQty: max_limit_volume
                    })
                } else  if (filterType === 'MARKET_LOT_SIZE') {
                    newFilter.push({
                        ...item.filters[j],
                        maxQty: max_market_volume / lastPrice,
                        maxQuoteQty: max_market_volume
                    })
                } else if([
                    'PRICE_FILTER',
                    'MAX_NUM_ORDERS',
                    'MAX_NUM_ALGO_ORDERS',
                    'MIN_NOTIONAL',
                    'PERCENT_PRICE',
                ].includes(filterType)){
                    newFilter.push({
                        ...item.filters[j],
                    })
                }
            }
            newFilter.push({ notional: max_total_volume, filterType: 'MAX_TOTAL_VOLUME' })
            const result = await FuturesConfig.findOneAndUpdate({_id: item._id}, {
                $set: {
                    filters: newFilter,
                }
            })
            console.log('__ check result', result)
        }
    }

    async handle3(args, options) {
        const FuturesPrice = use('App/Models/Futures/FuturesPrice')
        const configs = await FuturesConfig.find({quoteAsset: 'VNDC', status: 'TRADING'})
        for (let i = 0; i < configs.length; i++) {
            const item = configs[i]
            const ticker = await FuturesPrice.getTicker(item.symbol)
            if (!ticker) {
                console.log('__ not fount last price', item.symbol)
                continue
            }
            const lastPrice = +ticker?.p || 0
            const spread = +ticker?.ap - ticker.bp
            // console.log('__ check last price', item.symbol, lastPrice, spread / lastPrice)
            console.log('__ check last price', item.symbol, lastPrice)
            // console.log('__ check NamiSymbols', NamiSymbols[namiPair])

            let minDifferenceRatio = Math.abs(spread / lastPrice * 3)
            for (let j = 0; j < item.filters.length; j++) {
                const filter = item.filters[j]
                const {filterType} = filter
                // if (filterType === 'PERCENT_PRICE') {
                //     item.filters[j] = {
                //         multiplierDown: 0.5,
                //         multiplierUp: 2,
                //         multiplierDecimal: '4',
                //         minDifferenceRatio: minDifferenceRatio,
                //         filterType: 'PERCENT_PRICE'
                //     }
                // }
                if (filterType === 'LOT_SIZE') {
                    const top = [
                        'BTCVNDC',
                        'ETHVNDC',
                        'BNBVNDC',
                        'ADAVNDC',

                        'SOLVNDC',
                        'MATICVNDC',
                        'DOTVNDC',
                        'AVAXVNDC',
                    ]

                    if (top.includes(item.symbol)) {
                        item.filters[j] = {
                            ...item.filters[j],
                            maxQty: Math.floor(5000000000 / lastPrice)
                        }
                    } else {
                        item.filters[j] = {
                            ...item.filters[j],
                            maxQty: Math.floor(1000000000 / lastPrice)
                        }
                    }


                }
            }


            const newFilter = [...item.filters]
            console.log('__ chekc new filters', newFilter)
            const result = await FuturesConfig.findOneAndUpdate({_id: item._id}, {
                $set: {
                    filters: item.filters,
                }
            })
            console.log('__ check result', result)
        }

        // await FuturesConfig.insertMany(configs)

    }

    async handle2(args, options) {
        const FutureConfig = use('Config').get('futureContract')
        const NamiSymbols = FutureConfig.symbols
        this.info('Dummy implementation for sync:f:config command')
        const config = await binance.futuresExchangeInfo()
        const {symbols} = config
        const configs = []
        for (let i = 0; i < symbols.length; i++) {
            const item = symbols[i]
            if (item.quoteAsset !== 'USDT') continue
            const baseAssetConfig = await AssetConfig.getOneCached({assetCode: item.baseAsset})
            const quoteAssetConfig = await AssetConfig.getOneCached({assetCode: item.quoteAsset})
            const marginAssetConfig = await AssetConfig.getOneCached({assetCode: item.marginAsset})
            const namiPair = (item.pair).replace('USDT', 'VNDC')

            if (!baseAssetConfig || !quoteAssetConfig || !marginAssetConfig) {
                console.log('__ check configs', namiPair,
                    baseAssetConfig?.id,
                    quoteAssetConfig?.id,
                    marginAssetConfig?.id,
                )
                continue
            }
            if (!NamiSymbols[namiPair]) continue
            // console.log('__ check NamiSymbols', NamiSymbols[namiPair])
            for (let j = 0; j < item.filters.length; j++) {
                const filter = item.filters[j]
                console.log('__ check filters', filter)
                const {filterType} = filter
                if (filterType === 'MIN_NOTIONAL') {
                    item.filters[j] = {
                        ...filter, notional: 100000
                    }
                } else if (filterType === 'PERCENT_PRICE') {
                    item.filters[j] = {
                        multiplierDown: 0.5,
                        multiplierUp: 2,
                        multiplierDecimal: '4',
                        minDifferenceRatio: 0.0005,
                        filterType: 'PERCENT_PRICE'
                    }
                } else if (filterType === 'PRICE_FILTER') {
                    const Big = require('big.js')
                    let newTickSize = +Big(+filter.tickSize).div(0.0001)
                    newTickSize = newTickSize >= 1 ? 1 : newTickSize
                    item.filters[j] = {
                        minPrice: +filter.minPrice * 23400,
                        maxPrice: +filter.maxPrice * 23400,
                        filterType: 'PRICE_FILTER',
                        tickSize: newTickSize
                    }
                }

            }
            console.log('__ check filter 1111', item.filters)
            await FuturesConfig.updateOne({pair: namiPair}, {
                $set: {
                    ...item,
                    maintMarginPercent: +item.maintMarginPercent,
                    requiredMarginPercent: +item.requiredMarginPercent,
                    triggerProtect: +item.triggerProtect,
                    liquidationFee: +item.liquidationFee,
                    marketTakeBound: +item.marketTakeBound,
                    liquidityBroker: 'BINANCE_FUTURES',
                    baseAssetId: baseAssetConfig.id,
                    quoteAssetId: 72,
                    marginAssetId: 72,
                    quoteAsset: 'VNDC',
                    marginAsset: 'VNDC',
                    symbol: namiPair,
                    pair: namiPair,
                }
            })


        }

        console.log('__ cehck configs ', configs)
        // await FuturesConfig.insertMany(configs)

    }
}

module.exports = SyncConfig
