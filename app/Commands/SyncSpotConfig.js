'use strict'

const {Command} = require('@adonisjs/ace')
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || null
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || null
let binance = null
const SysNoti = use('App/Library/SysNoti')
const ExchangeConfig = use('App/Models/Config/ExchangeConfig')
const AssetConfig = use('App/Models/Config/AssetConfig')
const SwapConfig = use('App/Models/Config/SwapConfig')
const Utils = use('App/Library/Utils')
const _ = require('lodash')
const Promise = require("bluebird");
const AssetValue = use('App/Models/Portfolio/AssetValue')

const FuturesConfig = use("App/Models/Config/FuturesConfig")
if (BINANCE_API_KEY && BINANCE_API_SECRET) {
	try {
		binance = require('node-binance-api')()
			.options({
				APIKEY: BINANCE_API_KEY,
				APISECRET: BINANCE_API_SECRET
			})
	} catch (e) {
		return SysNoti.notify(`[EXCHANGE] Init connection to Binance error`, {
			toSlackExchange: true,
			toSlackMention: [
				SysNoti.SlackUserID.CHANNEL_CURRENT,
				SysNoti.SlackUserID.DEV_TRUNGND
			]
		})
	}
}

class TestFunc extends Command {
	static get signature() {
		return 'sync-spot-config'
	}

	static get description() {
		return 'Tell something helpful about this command'
	}

    async handle() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        this.info('Task FuturesCommissionsLogTask handle')
        try {
            const _ = require("lodash")

            const Promise = require("bluebird")
            const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
            const OnusCommissionLog = use('App/Models/Commission/OnusCommissionLog')

            const WalletCurrencies = use('Config')
                .get('walletCurrencies')
            const Database = use('Database')

            let startDay = new Date('2022-07-30T17:00:00.000Z')
            let endDay = new Date('2022-07-31T17:00:00.000Z')
            // Trong 30p đầu tiên cập nhật cho ngày hôm trước
            const dateLowerBound = startDay
            const dateUpperBound = endDay
            this.logTime = dateLowerBound
            const futuresOrderData = await FutureOrderMongo.aggregate([
                {
                    $match: {
                        status: 2,
                        // user_id: 655712,
                        close_price: {$gt: 0},
                        liquidity_broker: {$in: ['NAMI']},
                        user_category: 1,
                        promotion_category: {$ne: 1},
                        _b: false,
                        closed_at: {
                            $gte: dateLowerBound,
                            $lt: dateUpperBound
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            // user_id: '$user_id',
                            margin_currency: '$margin_currency',
                            open_fee_currency: '$fee_metadata.place_order.currency',
                            close_fee_currency: '$fee_metadata.close_order.currency'
                        },
                        total_volume: {$sum: '$order_value'},
                        total_open_fee: {$sum: '$fee_metadata.place_order.value'},
                        total_close_fee: {$sum: '$fee_metadata.close_order.value'}

                    }
                }
            ]).read('s')

            function getAssetCode(currency) {
                switch (currency) {
                    case WalletCurrencies.VNDC:
                        return 'vndc'
                    case WalletCurrencies.NAO:
                        return 'nao'
                    case WalletCurrencies.NAC:
                        return 'nami'
                    case WalletCurrencies.ONUS:
                        return 'onus'
                    case WalletCurrencies.USDT:
                        return 'usdt'
                    default:
                        return 'undefined'
                }
            }

            const feeMetadata = {}
            const feeUsdtMetadata = {}
            const volumeMetadata = {}
            const volumeUsdtMetadata = {}
            for (let i = 0; i < futuresOrderData.length; i++) {
                const item = futuresOrderData[i]
                const user_id='all'
                const
                    {
                        _id: {
                            // user_id,
                            open_fee_currency,
                            close_fee_currency,
                            margin_currency
                        },
                        total_open_fee,
                        total_close_fee,
                        total_volume
                    } = item

                const openFeeCurrencyText = getAssetCode(open_fee_currency)
                const closeFeeCurrencyText = getAssetCode(close_fee_currency)

                if (margin_currency === 72) {
                    _.set(volumeMetadata, `userId_${user_id}.vndc`, _.get(volumeMetadata, `userId_${user_id}.vndc`, 0) + total_volume)
                    _.set(feeMetadata, `userId_${user_id}.${openFeeCurrencyText}`, _.get(feeMetadata, `userId_${user_id}.${openFeeCurrencyText}`, 0) + total_open_fee)
                    _.set(feeMetadata, `userId_${user_id}.${closeFeeCurrencyText}`, _.get(feeMetadata, `userId_${user_id}.${closeFeeCurrencyText}`, 0) + total_close_fee)
                } else if (margin_currency === 22) {
                    _.set(volumeUsdtMetadata, `userId_${user_id}.usdt`, _.get(volumeUsdtMetadata, `userId_${user_id}.usdt`, 0) + total_volume)
                    _.set(feeUsdtMetadata, `userId_${user_id}.${openFeeCurrencyText}`, _.get(feeUsdtMetadata, `userId_${user_id}.${openFeeCurrencyText}`, 0) + total_open_fee)
                    _.set(feeUsdtMetadata, `userId_${user_id}.${closeFeeCurrencyText}`, _.get(feeUsdtMetadata, `userId_${user_id}.${closeFeeCurrencyText}`, 0) + total_close_fee)
                }
            }


            console.log('__ check fee', feeMetadata, feeUsdtMetadata)
            // Get list user
            const listUser = []
            futuresOrderData.map(item => {
                const {_id: {user_id}} = item
                if (!listUser.includes(user_id)) listUser.push(user_id)
            })
            // Check if user has master ref onus
            // Check broker status of user
            const userBrokerData = {}
            const BULK_SIZE = 200
            const listUserChunked = _.chunk(listUser, BULK_SIZE)

            console.log('__ check list user', listUserChunked)

            console.log('__ userBrokerData', userBrokerData)
            const commissionData = {}
            // Xử lý data ref ở đây
            const newFuturesOrderData = []


            const mergeKeys = _.uniq([...Object.keys(feeMetadata), ...Object.keys(feeUsdtMetadata)])
            for (let i = 0; i < mergeKeys.length; i++) {
                const key = mergeKeys[i]
                const userIdText = key.replace('userId_', '')
                const user_id = +userIdText
                newFuturesOrderData.push({
                    user_id,
                    total_volume: _.get(volumeMetadata, `userId_${userIdText}.vndc`, 0),
                    total_volume_usdt: _.get(volumeUsdtMetadata, `userId_${userIdText}.usdt`, 0),
                    total_fee: feeMetadata[key],
                    total_fee_usdt: feeUsdtMetadata[key],
                })
            }

            console.log('__ check new futures order data', newFuturesOrderData, commissionData)

            // await Promise.map(newFuturesOrderData, async item => {
            //     const {user_id, total_fee, total_volume, total_volume_usdt, total_fee_usdt} = item
            //     if (userBrokerData[user_id]) {
            //         const {hasBroker, auth_id} = userBrokerData[user_id]
            //         if (hasBroker) {
            //             const metadata = {
            //                 volume: {vndc: total_volume, usdt: total_volume_usdt},
            //                 commission: {
            //                     vndc: (total_fee?.vndc || 0) * 0.4,
            //                     nao: (total_fee?.nao || 0) * 0.4,
            //                     onus: (total_fee?.onus || 0) * 0.4,
            //                     nami: (total_fee?.nami || 0) * 0.4
            //                 },
            //                 commission_usdt: {
            //                     usdt: (total_fee_usdt?.usdt || 0) * 0.3,
            //                     nao: (total_fee_usdt?.nao || 0) * 0.3,
            //                     onus: (total_fee_usdt?.onus || 0) * 0.3,
            //                     nami: (total_fee_usdt?.nami || 0) * 0.3
            //                 }
            //             }
            //             commissionData[auth_id] = metadata
            //
            //             await OnusCommissionLog.findOneAndUpdate({
            //                     user_id,
            //                     onus_user_id: auth_id,
            //                     time: this.logTime
            //                 }, {
            //                     user_id,
            //                     onus_user_id: auth_id,
            //                     time: this.logTime,
            //                     metadata
            //                 },
            //                 { upsert: true, new: true, setDefaultsOnInsert: true })
            //         }
            //     }
            // }, {concurrency: 50})
            Logger.info('Check commissionData', commissionData)
        } catch (e) {
            Logger.error('FuturesCommissionsLogTask error', e)
        }

    }

	async syncBinanceConfig(listToSync) {
		// Get asset config

		const allAsset = await FuturesConfig.find({})


	}
}

module.exports = TestFunc
