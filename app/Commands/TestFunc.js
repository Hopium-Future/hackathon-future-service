'use strict'

const {Command} = require('@adonisjs/ace')
const _ = require("lodash");
const Promise = require("bluebird");
const {FuturesOrder} = require("../Library/Enum");
const RedisSecondary = use('Redis').connection('futures_order_slave') // Read - get
const Currencies = use('Config')
    .get('walletCurrencies')
const ExchangeConfig = use('Config')
    .get('exchange')

const AssetInfo = use('App/Models/Config/AssetInfo')
let processing = false
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const Wallet = use('App/Models/Wallet')

class TestFunc extends Command {
    static get signature() {
        return 'test:func'
    }

    static get description() {
        return 'Tell something helpful about this command'
    }

    async testFunc() {
        const testTime = new Date('2022-06-10T17:10:00.000Z').getTime()
        let startDay = new Date(testTime)
        startDay.setUTCHours(17, 0, 0, 0)
        console.log('__ start day 1', startDay)
        const now = testTime

        if (startDay.getTime() > now) {
            startDay = new Date(startDay.getTime() - 24 * 60 * 60 * 1000)
        }
        let endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000)
        // Trong 30p đầu tiên cập nhật cho ngày hôm trước
        if ((now - startDay.getTime()) < 30 * 60 * 1000) {
            startDay = new Date(startDay.getTime() - 24 * 60 * 60 * 1000)
            endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000)
        }
        const dateLowerBound = startDay
        const dateUpperBound = endDay
        this.logTime = dateLowerBound
        console.log('__ chekc day', dateLowerBound, dateUpperBound)
    }

    async handle() {
        const User = use('App/Models/User')
        // const category = await User.getUserCategory(654036)
        // console.log('__ check user', category, typeof category)
        // const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
        // console.log('__ vndc futures order', await VndcFutureOrder.getSuitablePrice('BTCVNDC', 1670410478000, 1670410511770, 'Buy', true))
        // await VndcFutureOrder.removeProcessing(7462968)
        // return
        // const _options = {"displaying_id":7393491,"price":0.000676,"sl":0.000643,"tp":0.000711}
        // console.log('__ filtores i', filterInput)
        // this.bonus83()
        this.closeOrder()
        // this.fixCloseOrder()
        // this.modifyOrder()
        // this.migrateDcaData()
        // this.processSwap()
        // this.calculateComm()
        // this.processCloseFee()
        // this.processSlTp()
        // this.activeOrder()
        // this.processWrongMargin()
        // this.processAddFundingBalance()
        // this.migrateDcaData()
        // this.fixDcaOrder()
        // this.syncDcaOrder()
        // this.syncPartialOrder()
        // this.processClosePrice()
        // this.processOpenPrice()
        // this.processAddFunding()
        // this.processWrongFundingDca()
        // this.namiLockFix()
    }

    async namiLockFix() {
        const Database = use('Database')
        const [users] = await Database.raw('select tb1.value, tb1.locked_value, tb1.user_id, tb2.onus_user_id from wallets as tb1, users as tb2\n' +
            'where tb1.user_id =  tb2.id\n' +
            '  and tb1.currency = 22\n' +
            '  and tb1.type = 2\n' +
            '  and tb1.value > 0\n' +
            '  and tb2.onus_user_id > 0\n' +
            '  and tb1.locked_value > 0\n' +
            'and tb1.value < tb1.locked_value\n' +
            'order by tb1.value desc\n' +
            ';')

        // users = users.map(item=> {id: item.user_id})
        // Get list transaction from 13:30
        console.log('___ fix length', users.length)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]
            const {user_id, value, locked_value} = user
            if (locked_value - value > 0.0001) {
                if (locked_value - value < 50) {
                    console.log('__ fix', {user_id, value, locked_value})
                    const trans = []
                    trans.push(await Wallet.changeBalance(user_id, 22, locked_value - value, 0, 44, `Bu lock > balance ${user_id}`, null, {
                        allowNegative: true, walletType: Wallet.WalletType.FUTURES
                    }))
                    console.log('__ trans', trans)
                } else {
                    console.log('>>>>>> fix', {user_id, value, locked_value})
                }

            }
        }
    }

    async fixDcaOrder() {


        const dcaOrders = await FutureOrderMongo.find({
            displaying_id: 11888230
        })
            .read('s')
        for (let i = 0; i < dcaOrders.length; i++) {
            const {
                displaying_id,
                user_id,
                raw_profit,
                quantity,
                profit,
                close_price,
                open_price,
                margin_currency,
                opened_at,
                swap,
                side,
            } = dcaOrders[i]
            const newPnl = (side === 'Buy' ? 1 : -1) * (close_price - open_price) * quantity
            const changePnl = newPnl - profit
            console.log('__ pnl', displaying_id, side, close_price, open_price, {profit, changePnl, newPnl})
            const trans = []
            trans.push(await Wallet.changeBalance(user_id, margin_currency, changePnl, null, 608, `Rollback order 22/09 ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                $set: {
                    profit: newPnl,
                }
            })
            console.log('__ trqnas', trans)

        }
    }

    async migrateDcaData() {
        const dcaOrders = await FutureOrderMongo.find({
            // user_id: 654036,
            // status: {$in: [0,1]},
            closed_at: {$gte: new Date('2022-10-03T17:00:00.000Z')},
            'fee_data.close_order': null
        })
            .limit(10000)
            .read('s')
        console.log('__ update', dcaOrders.length)
        await Promise.map(dcaOrders, async order => {
            const {fee_metadata} = order
            const fee_data = {
                place_order: {
                    [fee_metadata?.place_order?.currency]: fee_metadata?.place_order?.value
                },
                close_order: {
                    [fee_metadata?.close_order?.currency]: fee_metadata?.close_order?.value
                }
            }
            const volume_data = {
                place_order: {
                    [fee_metadata?.place_order?.currency]: order.order_value
                },
                close_order: {
                    [fee_metadata?.close_order?.currency]: order.close_order_value
                }
            }
            await await FutureOrderMongo.findOneAndUpdate({_id: order._id}, {
                $set: {
                    fee_data,
                    volume_data
                }
            })
        }, {concurrency: 10})

    }

    async syncDcaOrder() {

        const _startOfDay = new Date('2022-09-11T17:00:00.000Z')
        const _endOfDay = new Date('2022-09-23T17:00:00.000Z')

        const volumes = []
        const fees = []

        for (let i = 0; i < 7; i++) {
            const startOfDay = new Date(_startOfDay.getTime() + i * 24 * 60 * 60 * 1000)
            const endOfDay = new Date(_startOfDay.getTime() + (i + 1) * 24 * 60 * 60 * 1000)

            const dcaOrders = await FutureOrderMongo.find({
                reason_close: 'DCA', main_order_closed_at: null, created_at: {
                    $gte: startOfDay, $lt: endOfDay
                }, status: 2, margin_currency: 72, user_category: 1, promotion_category: {$ne: 1}, _b: false,
            })

                .select({displaying_id: 1, metadata: 1, order_value: 1, fee_metadata: 1})
                .read('s')

            console.log('__ done', dcaOrders.length)
            const clientOpenFeeData = {}
            const clientCloseFeeData = {}
            const mapClientMain = {}
            const mainCloseTime = {}
            const dcaOrderIds = []
            // client -> main
            const mainOrderIds = _.compact(dcaOrders.map(item => {
                dcaOrderIds.push(item.displaying_id)
                const mainOrderId = item?.metadata?.dca_order_metadata?.dca_order?.[0]?.displaying_id
                if (mainOrderId) {
                    mapClientMain[item.displaying_id] = mainOrderId
                    clientOpenFeeData[item.displaying_id] = {
                        open_order_value: item.order_value, open_fee_metadata: item?.fee_metadata?.place_order
                    }
                    return mainOrderId
                }
                return null
            }))
            console.log('__ check mainOrderIds', mainOrderIds.length)
            const chunk = _.chunk(mainOrderIds, 500)
            console.log('__ check chunk ', chunk.length)


            for (let i = 0; i < chunk.length; i++) {
                const ids = chunk[i]
                const orders = await FutureOrderMongo.find({
                    displaying_id: {$in: ids}, status: 2,
                }).select({displaying_id: 1, status: 1, closed_at: 1}).read('s')
                console.log('__ check orders ', orders)
                await Promise.map(orders, async order => {
                    mainCloseTime[order.displaying_id] = order.closed_at
                }, {concurrency: 10})
            }

            await Promise.map(dcaOrderIds, async dcaDisplayingId => {
                const mainId = mapClientMain?.[dcaDisplayingId]
                if (mainId) {
                    const _mainCloseTime = mainCloseTime?.[mainId]
                    if (_mainCloseTime) {
                        console.log('__ set new close time', dcaDisplayingId, _mainCloseTime, typeof _mainCloseTime, {
                            main_order_closed_at: _mainCloseTime, ...clientOpenFeeData[dcaDisplayingId]
                        })
                        await FutureOrderMongo.findOneAndUpdate({displaying_id: dcaDisplayingId}, {
                            $set: {
                                main_order_closed_at: _mainCloseTime, ...clientOpenFeeData[dcaDisplayingId]
                            }
                        })
                    }
                }
            }, {
                concurrency: 50
            })
        }

    }

    async syncPartialOrder() {

        const _startOfDay = new Date('2022-09-11T17:00:00.000Z')
        const _endOfDay = new Date('2022-09-23T17:00:00.000Z')

        const volumes = []
        const fees = []

        for (let i = 0; i < 7; i++) {
            const startOfDay = new Date(_startOfDay.getTime() + i * 24 * 60 * 60 * 1000)
            const endOfDay = new Date(_startOfDay.getTime() + (i + 1) * 24 * 60 * 60 * 1000)

            const dcaOrders = await FutureOrderMongo.find({
                reason_close_code: 6, created_at: {
                    $gte: startOfDay, $lt: endOfDay
                }, status: 2, margin_currency: 72, user_category: 1, promotion_category: {$ne: 1}, _b: false,
            })

                .select({displaying_id: 1, metadata: 1, order_value: 1, fee_metadata: 1, close_order_value: 1})
                .read('s')

            console.log('__ check order, ', dcaOrders.length)

            await Promise.map(dcaOrders, async order => {
                await FutureOrderMongo.findOneAndUpdate({displaying_id: order.displaying_id}, {
                    $set: {
                        close_order_value: order.close_order_value, close_fee_metadata: order?.fee_metadata?.close_order
                    }
                })
            }, {
                concurrency: 50
            })
        }

    }

    async bonus83() {

        const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')
        const order = await FutureOrderMongo.findOne({displaying_id: 12699864}).lean()
        await FuturesOrderCacheRedis.upsertOrderRedis(order)
    }

    async closeOrder() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const priceData=        {COCOSVNDC: 34057, COCOSUSDT: 1.454}


        console.log('__ start', new Date())
        const orders = await FutureOrderMongo.find({
            symbol: {$in: ['COCOSUSDT', 'COCOSVNDC']}, status: {$in: [0, 1]}
            // displaying_id: {
            //     $in: [
            //         14739564,
            //     ]
            // }
            // symbol: {$in: ['CVXVNDC']}, status: {$in: [0, 1]}
            // status: {$in: [1]}, user_category: 1
        })
            // .limit(10)
            .sort({opened_at: -1})
            .read('s')

        console.log('__ orders', orders)

        const orderIds = orders.map(item => item.displaying_id)
        console.log(JSON.stringify(orderIds))
        console.log('__ end', new Date(), orderIds.length)
        // return
        const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
        console.log('__ VndcFutureOrder', orders.length)
        const totalPnl = {
            '22': 0,
            '72': 0
        }
        await Promise.map(orders, async order => {
            try {

                const price = priceData[order.symbol]
                if(!price) return
                const closePrice = price
                const result = await VndcFutureOrder.closeOrder({id: order.user_id}, {
                    displaying_id: order.displaying_id, reason_close_code: VndcFutureOrder.ReasonCloseCode.NORMAL,
                }, null, {
                    price: {
                        bestBid: closePrice,
                        bestAsk: closePrice,
                        lastPrice: closePrice,
                    }
                })

                console.log('__ check ỏder', order.displaying_id, closePrice)
                console.log('__ check ỏder', order.displaying_id, result)
            } catch (e) {
                console.log('eee ', order.displaying_id, e)
            }
        }, {concurrency: 20})

        console.log('__ check total pnl', totalPnl)
        // await Promise.map(orders, async order => {
        //     const result = await VndcFutureOrder.closeOrder({id: order.user_id}, {
        //         displaying_id: order.displaying_id,
        //         reason_close_code: VndcFutureOrder.ReasonCloseCode.NORMAL,
        //     })
        //     console.log('Close order result', result)
        // }, {concurrency: 10})
    }

    async fixCloseOrder() {

        const orders =[
{displaying_id: 12694144, current_pnl: 11620108.690443348, pnl: 0, closed_at: new Date('2023-03-14T10:00:00.000Z'), reason_close_code: 1},
{displaying_id: 12686397, current_pnl: 11620108.690443348, pnl: 0, closed_at: new Date('2023-03-14T19:00:00.000Z'), reason_close_code: 1},
{displaying_id: 12699707, current_pnl: 11620108.690443348, pnl: 0, closed_at: new Date('2023-03-14T12:00:00.000Z'), reason_close_code: 1},
        ]
        const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
        await Promise.map(orders, async order => {
            try {
                const mongoOrder = await FutureOrderMongo.findOne({displaying_id: order.displaying_id})
                const liquidatePrice = await VndcFutureOrder.calculateLiqPrice(mongoOrder)

                const closePrice = order.reason_close_code === 1 ? mongoOrder.sl : liquidatePrice
                console.log('__ check liquidate price', {displaying_id: order.displaying_id, liquidatePrice, sl: mongoOrder.sl, closePrice})

                await FutureOrderMongo.findOneAndUpdate({displaying_id: order.displaying_id}, {
                    $set: {
                        profit: order.pnl,
                        closed_at: order.closed_at,
                        close_price: closePrice,
                        status: 2,
                        reason_close_code: order.reason_close_code,
                        reason_close: VndcFutureOrder.ReasonClose[order.reason_close_code]

                    }
                })

            } catch (e) {
                console.log('eee ', order.displaying_id, e)
            }
        }, {concurrency: 20})

        // await Promise.map(orders, async order => {
        //     const result = await VndcFutureOrder.closeOrder({id: order.user_id}, {
        //         displaying_id: order.displaying_id,
        //         reason_close_code: VndcFutureOrder.ReasonCloseCode.NORMAL,
        //     })
        //     console.log('Close order result', result)
        // }, {concurrency: 10})
    }

    async modifyOrder() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //


        const orders = [
            {
                displaying_id: 11092277,
                new_sl: 58257
            },
            {
                displaying_id: 11094555,
                new_sl: 155.8
            }
        ]

        const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')

        console.log('__ VndcFutureOrder', orders.length)
        for (let i = 0; i < orders.length; i++) {
            const {displaying_id, new_sl} = orders[i]
            try {
                const order = await FutureOrderMongo.findOne({
                    // symbol: {$in: ['CVXVNDC']}, status: {$in: [0, 1]}
                    displaying_id
                    // symbol: {$in: ['CVXVNDC']}, status: {$in: [0, 1]}
                })
                const result = await VndcFutureOrder.modifyOrder({id: order.user_id}, {
                    displaying_id,
                    sl: new_sl,
                    tp: order.tp,
                    price: order.price
                })
                console.log('Close order result', order.displaying_id, result)
            } catch (e) {
                console.log('eee ', e)
            }
        }
        // await Promise.map(orders, async order => {
        //     const result = await VndcFutureOrder.closeOrder({id: order.user_id}, {
        //         displaying_id: order.displaying_id,
        //         reason_close_code: VndcFutureOrder.ReasonCloseCode.NORMAL,
        //     })
        //     console.log('Close order result', result)
        // }, {concurrency: 10})
    }

    async getOpenOrders({user_id, margin_currency}) {
        try {
            user_id = user_id?.toString().trim()

            if (!user_id) return null
            const res = await RedisSecondary.get_open_order(user_id)
            let data = []
            data = res.reduce((result, eachOrder) => {
                if (!eachOrder) return result
                const formatOrder = JSON.parse(eachOrder)
                if ([0, 1].includes(formatOrder.status)
                    && formatOrder.liquidity_broker === 'NAMI'
                    && formatOrder.margin_currency === margin_currency
                    && formatOrder?.metadata?.partial_close_metadata?.is_main_order !== false
                ) result.push(formatOrder)
                return result
            }, [])
            return data
        } catch (error) {
            return error
        }
    }

    async processWrongMargin() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        // const wrongData = await FutureOrderMongo.aggregate([
        //     {
        //         $match: {
        //             closed_at: {$gt: new Date('2022-10-24T17:00:00.000Z')}
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: {user_id: '$user_id', margin_currency: '$margin_currency'},
        //             total: {$sum: '$funding_fee.total'}
        //         }
        //     }
        // ]).read('s')
        // console.log('__ ')
        //
        // const data = wrongData.map(item => {
        //     return {
        //         margin_currency: item._id.margin_currency,
        //         user_id: item._id.user_id,
        //     }
        // })

        // console.log('__ check data', data)

        const data = [
            {"margin_currency": 72, "user_id": 583004},
            {"margin_currency": 22, "user_id": 583004},
        ]

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < data.length; i++) {
            console.log('__ process', i, '/', data.length)
            const {
                margin_currency, user_id
            } = data[i]
            //
            const lock = await Wallet.getLocked(user_id, margin_currency, 2)
            // const [orderData] = await FutureOrderMongo.aggregate([{
            //     $match: {
            //         user_id, status: {$in: [0, 1]}, margin_currency,
            //         'metadata.partial_close_metadata.is_main_order': {$ne: false}
            //     },
            // }, {
            //     $group: {
            //         _id: null, total_margin: {$sum: '$margin'}
            //     }
            // }]).read('s')

            const orders = await this.getOpenOrders({user_id, margin_currency})


            console.log('__ check orders', orders)
            let orderMargin = 0
            // if (orderData) orderMargin = orderData.total_margin
            if (orders.length) orderMargin = _.sumBy(orders, 'margin')
            console.log('Check valid margin', user_id, lock, orderMargin)
            if (orderMargin >= 0 && (lock < -10 || Math.abs(lock - orderMargin) > 0.001)) {
                console.log('Check valid margin', user_id, lock, orderMargin)
                const trans = []

                const recheckLock = await Wallet.getLocked(user_id, margin_currency, 2)
                if (Math.abs(recheckLock - lock) < 0.0001) {
                    trans.push(await Wallet.changeBalance(user_id, margin_currency, 0, orderMargin - recheckLock, 608, `Rollback wrong lock partial close ${user_id}`, null, {
                        allowNegative: true, walletType: Wallet.WalletType.FUTURES
                    }))

                    console.log('__ trans', trans)
                }
            }
        }
    }

    async processWrongFunding() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        // const data = [
        //     {"margin_currency": 72, "user_id": 732208},
        // ]
        // Fix wrong margin

        const data = await FutureOrderMongo.find({
            _m: 311
        })
        const dis = data.map(item => item.displaying_id)
        for (let i = 0; i < data.length; i++) {
            const {
                margin_currency, user_id, funding_fee, displaying_id
            } = data[i]

            if (funding_fee.total < 0) {
                console.log('__ check funding fee', displaying_id, funding_fee)
                const trans = []
                trans.push(await Wallet.changeBalance(user_id, margin_currency, -funding_fee.total, 0, 611, `BALANCE: Future order ${displaying_id} funding fee`, null, {
                    allowNegative: true, walletType: Wallet.WalletType.FUTURES
                }))
                await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                    $set: {
                        funding_fee: {"balance": 0, "margin": 0, "total": 0}
                    }
                })
                console.log('trans', trans)
            }


        }
    }

    async processWrongFundingDca() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        // const data = [
        //     {"margin_currency": 72, "user_id": 732208},
        // ]
        // Fix wrong margin

        console.log('__ start', 1)
        // const data = await FutureOrderMongo.find({
        //     reason_close_code: 5,
        //     symbol: {
        //         $in: [
        //             'BNXUSDT',
        //             'BNXVNDC',
        //         ]
        //     },
        //     funding_fee: null,
        //     status: 2,
        //     side: 'Sell',
        //     opened_at: {
        //         $gt: new Date('2022-12-04T23:59:00.000Z'),
        //         $lt: new Date('2022-12-05T00:01:00.000Z'),
        //     },
        //     closed_at: {$gt: new Date('2022-12-05T00:00:00.000Z')},
        // })
        //     .read('s')

        const fundingRate = 2.5
        const data = await FutureOrderMongo.find({
            displaying_id: {
                $in: [
                    8947091
                ]
            }
        })
            .read('s')
        console.log('__ check data', data)
        const dis = data.map(item => item.displaying_id)
        const wrong = []

        for (let i = 0; i < data.length; i++) {
            const {
                margin_currency, user_id, funding_fee, displaying_id,
            } = data[i]
            const order = data[i]
            const originOrderId = order?.metadata?.dca_order_metadata?.dca_order?.[0]?.displaying_id

            const originData = await FutureOrderMongo.findOne({displaying_id: originOrderId}).lean()
            console.log('__ check fuding origin', originOrderId, originData?.funding_fee)
            const log = {
                originOrderId,
                originFunding: originData?.funding_fee?.total,
                trueOriginFunding: -(originData.order_value - order?.order_value) * fundingRate / 100,

            }
            log.fix = log.originFunding - log.trueOriginFunding
            if (Math.abs(log.originFunding - log.trueOriginFunding) > 1) {

                console.log('__ og', log)
                wrong.push(log)
                // const trans = []
                // trans.push(await Wallet.changeBalance(user_id, margin_currency, log.fix, 0, 611, `BALANCE: Future order ${displaying_id} funding fee`, null, {
                //     allowNegative: true, walletType: Wallet.WalletType.FUTURES
                // }))
                // await FutureOrderMongo.findOneAndUpdate({displaying_id: originOrderId}, {
                //     $set: {
                //         _m: 410,
                //         funding_fee: {"balance": log.trueOriginFunding, "total": log.trueOriginFunding}
                //     }
                // })
                // console.log('trans', trans)
            }


        }
        console.log('__ wrong', wrong)
    }

    async processSwap() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const orders = await FutureOrderMongo.aggregate([{
            $match: {user_category: 1, raw_profit: {$ne: 0}, profit: 0},
        }, {
            $group: {
                _id: {user_id: '$user_id'}, total_swap: {$sum: '$swap'}
            }
        }])

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const {
                "_id": {
                    user_id
                }, total_swap
            } = orders[i]


            const trans = []
            trans.push(await Wallet.changeBalance(user_id, 72, total_swap, null, 608, `Rollback order pay swap ${user_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            console.log('__ trans', trans)
        }
    }

    async processClosePrice() {

        const closePrices = [// {displaying_id: 2450289, close_price: 2816},
            // {displaying_id: 2453815, close_price: 127421},

            {displaying_id: 14729409, close_price: 10469},
            // {displaying_id: 12160184, close_price: 23440.7},


            // -117731202.28425078


            // {displaying_id: 2998727, close_price: 32.895},
            // {displaying_id: 2452330, close_price: 447541840},
            // {displaying_id: 2453522, close_price: 445903350},
        ]

        //     const closePriceBySymbol = {
        //         LUNA2USDT: 2.9333,
        //         LUNA2VNDC: 68667,
        //         '1000LUNCVNDC': 6399,
        //         '1000LUNCUSDT': 0.2734
        //
        // }
        //     const closePrices = await FutureOrderMongo.find({symbol: {$in: ['1000LUNCVNDC', '1000LUNCUSDT', 'LUNA2VNDC', 'LUNA2USDT']}, close_price: {$gt: 0}, closed_at: {$gt: new Date('2022-09-15T11:00:00.000Z')}})
        // 5250569
        for (let i = 0; i < closePrices.length; i++) {
            const {displaying_id, close_price: new_close_price} = closePrices[i]
            // const {displaying_id, symbol} = closePrices[i]
            // const new_close_price = closePriceBySymbol[symbol]
            // console.log('__ check id', displaying_id, symbol, new_close_price)
            const order = await FutureOrderMongo.findOne({displaying_id})
            const {
                user_id, raw_profit, quantity, profit, close_price, open_price, margin_currency, opened_at, swap, side,
            } = order
            const liquidate_order_value = order?.fee_metadata?.liquidate_order?.value

            const changePnl = (side === 'Buy' ? 1 : -1) * (new_close_price - close_price) * quantity

            console.log(' cccc', new_close_price, close_price, changePnl)
            const newPnl = profit + changePnl

            const trans = []

            trans.push(await Wallet.changeBalance(user_id, margin_currency, changePnl, null, 608, `Rollback order 22/09 ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))
            trans.push(await Wallet.changeBalance(user_id, margin_currency, liquidate_order_value, null, 608, `Rollback order 22/09 liquidate fee ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                $set: {
                    profit: newPnl, close_price: new_close_price,
                }
            })

            console.log('__ trans', trans)
        }
    }

    async processOpenPrice() {

        const closePrices = [// {displaying_id: 2450289, close_price: 2816},
            // {displaying_id: 2453815, close_price: 127421},

            {displaying_id: 14687473, open_price: 5623},

            // -117731202.28425078


            // {displaying_id: 2998727, close_price: 32.895},
            // {displaying_id: 2452330, close_price: 447541840},
            // {displaying_id: 2453522, close_price: 445903350},
        ]

        //     const closePriceBySymbol = {
        //         LUNA2USDT: 2.9333,
        //         LUNA2VNDC: 68667,
        //         '1000LUNCVNDC': 6399,
        //         '1000LUNCUSDT': 0.2734
        //
        // }
        //     const closePrices = await FutureOrderMongo.find({symbol: {$in: ['1000LUNCVNDC', '1000LUNCUSDT', 'LUNA2VNDC', 'LUNA2USDT']}, close_price: {$gt: 0}, closed_at: {$gt: new Date('2022-09-15T11:00:00.000Z')}})
        // 5250569
        for (let i = 0; i < closePrices.length; i++) {
            const {displaying_id, open_price: new_open_price} = closePrices[i]
            // const {displaying_id, symbol} = closePrices[i]
            // const new_close_price = closePriceBySymbol[symbol]
            // console.log('__ check id', displaying_id, symbol, new_close_price)
            const order = await FutureOrderMongo.findOne({displaying_id})
            const {
                user_id, raw_profit, quantity, profit, close_price, open_price, margin_currency, opened_at, swap, side,
            } = order
            const liquidate_order_value = order?.fee_metadata?.liquidate_order?.value

            const changePnl = (side === 'Buy' ? 1 : -1) * (open_price - new_open_price) * quantity

            const newPnl = profit + changePnl

            const trans = []

            trans.push(await Wallet.changeBalance(user_id, margin_currency, changePnl, null, 608, `Rollback order 22/09 ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))
            trans.push(await Wallet.changeBalance(user_id, margin_currency, liquidate_order_value, null, 608, `Rollback order 22/09 liquidate fee ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                $set: {
                    profit: newPnl, open_price: new_open_price,
                }
            })

            console.log('__ trans', trans)
        }
    }

    async processCloseFee() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //
        const orders = await FutureOrderMongo.find({

            $and: [//			{$or: [{closed_at: {$lt: ISODate('2022-07-13T12:30:00.000Z')}}, {closed_at: {$gt: ISODate('2022-07-13T13:00:00.000Z')}}]},
// 				{closed_at: {$gte: new Date('2022-07-13T12:30:00.000Z'), $lt: new Date('2022-07-13T13:00:00.000Z')}},
                {profit: {$lt: 0}, status: 2}, // {reason_close_code: {$in: [1, 3]}},
                {
                    displaying_id: {
                        $in: [2200956, 2207214, 2207293, 2309441, 2308703, 2309402, 2207243, 2299484, 2309469, 2223370, 2311520, 2309441]
                    }
                }]
        })

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const {
                user_id, raw_profit, swap, displaying_id, fee_metadata: {
                    place_order: {value: place_fee_value, currency: place_fee_currency},
                    close_order: {value: close_fee_value, currency: close_fee_currency},
                }
            } = orders[i]

            const newFee = place_fee_value
            const bias = close_fee_value - newFee

            const trans = []

            trans.push(await Wallet.changeBalance(user_id, close_fee_currency, bias, null, 608, `Process wrong fee ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                $set: {
                    'fee_metadata.close_order.value': newFee
                }
            })

            console.log('__ trans', trans)
        }
    }

    async activeOrder() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const orders = await FutureOrderMongo.find(
            // {user_id: {$gt: 0}, status: 2, close_price: {$gt: 0}, reason_close_code: 3, closed_at: {$gte: new Date('2023-03-08T13:00:00.000Z'), $lt: new Date('2023-03-08T16:00:00.000Z')}}
            {

                $and: [//			{$or: [{closed_at: {$lt: ISODate('2022-07-13T12:30:00.000Z')}}, {closed_at: {$gt: ISODate('2022-07-13T13:00:00.000Z')}}]},
// 				{closed_at: {$gte: new Date('2022-07-13T12:30:00.000Z'), $lt: new Date('2022-07-13T13:00:00.000Z')}},
//                     {profit: {$lt: 0}, status: 2}, // {reason_close_code: {$in: [1, 3]}},
                    {
                        displaying_id: {
                            $in: [

                                14296990]
                        }
                    }]
            }
        )

        // const orders = await FutureOrderMongo.find({
        //     profit: {$lt: 0},
        //     status: 2,
        //     reason_close_code: {$in: [1, 3]},
        //     closed_at: {$gt: new Date('2022-10-26T15:40:00.000Z'), $lt: new Date('2022-10-26T16:00:00.000Z')}
        // })

        const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')
        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i]
            await FuturesOrderCacheRedis.upsertOrderRedis(order)
        }
    }

    async processSlTp() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const orders = await FutureOrderMongo.find(
            // {user_id: {$gt: 0}, status: 2, close_price: {$gt: 0}, reason_close_code: 3, closed_at: {$gte: new Date('2023-03-08T13:00:00.000Z'), $lt: new Date('2023-03-08T16:00:00.000Z')}}
            {

                $and: [//			{$or: [{closed_at: {$lt: ISODate('2022-07-13T12:30:00.000Z')}}, {closed_at: {$gt: ISODate('2022-07-13T13:00:00.000Z')}}]},
// 				{closed_at: {$gte: new Date('2022-07-13T12:30:00.000Z'), $lt: new Date('2022-07-13T13:00:00.000Z')}},
                    {profit: {$lt: 0}, status: 2}, // {reason_close_code: {$in: [1, 3]}},
                    {
                        displaying_id: {
                            $in: [
                                14760599
                            ]
                        }
                    }]
            }
        )

        // const orders = await FutureOrderMongo.find({
        //     profit: {$lt: 0},
        //     status: 2,
        //     reason_close_code: {$in: [1, 3]},
        //     closed_at: {$gt: new Date('2022-10-26T15:40:00.000Z'), $lt: new Date('2022-10-26T16:00:00.000Z')}
        // })

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const {
                user_id, raw_profit, swap, displaying_id, margin_currency, fee_data
            } = orders[i]


            const liquidate_order_value = orders[i]?.fee_metadata?.liquidate_order?.value
            const place_fee_value = orders[i]?.fee_metadata?.place_order?.value
            const close_fee_value = orders[i]?.fee_metadata?.close_order?.value
            const place_fee_currency = orders[i]?.fee_metadata?.place_order?.currency
            const close_fee_currency = orders[i]?.fee_metadata?.close_order?.currency
            const funding_fee = orders[i]?.funding_fee?.total
            let backVndc = -raw_profit + swap
            if (liquidate_order_value > 0) {
                backVndc += liquidate_order_value
            }
            if (funding_fee !== 0) {
                backVndc += -funding_fee
            }

            if (place_fee_currency === margin_currency) backVndc += place_fee_value
            if (close_fee_currency === margin_currency) backVndc += close_fee_value

            const trans = []

            trans.push(await Wallet.changeBalance(user_id, margin_currency, backVndc, null, 608, `Rollback order 28/07 ${displaying_id}`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            if (place_fee_currency && place_fee_currency !== margin_currency) {
                trans.push(await Wallet.changeBalance(user_id, place_fee_currency, place_fee_value, null, 608, `Rollback order 28/07 ${displaying_id}`, null, {
                    allowNegative: true, walletType: Wallet.WalletType.FUTURES
                }))
            }
            if (close_fee_currency && close_fee_currency !== margin_currency) {
                trans.push(await Wallet.changeBalance(user_id, close_fee_currency, close_fee_value, null, 608, `Rollback order 28/07 ${displaying_id}`, null, {
                    allowNegative: true, walletType: Wallet.WalletType.FUTURES
                }))
            }

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                $set: {
                    profit: 0,
                    reason_close: '',
                    reason_close_code: 0,
                    swap: 0,
                    fee_metadata: {},
                    fee_data: {},
                    funding_fee: {},
                    volume_data: {}
                }
            })

            console.log('__ trans', trans)
        }
    }

    async processAddFundingBalance() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const orders = await FutureOrderMongo.find({

            $and: [
                {
                    displaying_id: {
                        $in: [
                            14414263, 14420120, 14420140, 14420154, 14419320
                        ]
                    }
                }
            ]
        }).read('s')
        // const orders = await FutureOrderMongo.find({status: 2, 'funding_fee.total': 0, side: 'Buy', symbol: 'BANDVNDC', opened_at: {$lt: new Date('2022-11-05T08:00:00.000Z')}, closed_at: {$gt: new Date('2022-11-05T08:00:00.000Z')}});

        // const orders = await FutureOrderMongo.find({
        //     profit: {$lt: 0},
        //     status: 2,
        //     reason_close_code: {$in: [1, 3]},
        //     closed_at: {$gt: new Date('2022-10-26T15:40:00.000Z'), $lt: new Date('2022-10-26T16:00:00.000Z')}
        // })

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i]
            const {
                user_id, raw_profit, swap, displaying_id, margin_currency, fee_data, order_value, funding_fee
            } = orders[i]


            console.log('__ chekc order', order)
            const trans = []

            // const funding = 0.914902 / 100 * order_value
            const funding = order?.funding_fee?.total
            console.log('__ funding', displaying_id, funding)
            if (!(funding > 0)) continue
            trans.push(await Wallet.changeBalance(user_id, margin_currency, funding, null, 611, `Future order ${displaying_id} funding fee`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            // await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
            //     // $inc: {
            //     //     "funding_fee.total": +funding,
            //     //     "funding_fee.balance": +funding,
            //     // }
            //     $set: {
            //
            //         funding_fee: {total: funding, balance: funding},
            //     }
            // })

            console.log('__ trans', trans)
        }
    }

    async processAddFunding() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        const orders = await FutureOrderMongo.find({

            $and: [//			{$or: [{closed_at: {$lt: ISODate('2022-07-13T12:30:00.000Z')}}, {closed_at: {$gt: ISODate('2022-07-13T13:00:00.000Z')}}]},
//                 {profit: {$lt: 0}, status: 2}, // {reason_close_code: {$in: [1, 3]}},
// 				{closed_at: {$gte: new Date('2022-07-13T12:30:00.000Z'), $lt: new Date('2022-07-13T13:00:00.000Z')}},
//                 {opened_at: {$lte: new Date('2022-11-05T00:00:00.000Z'),}},
//                 {
//                     status: 2,
//                     reason_close_code: {$in: [1, 3]},
//                     side: 'Sell',
//                     symbol: {$in: ['SXPVNDC', 'SXPUSDT']},
//                     displaying_id: {$nin: [13481319,
//                             13481188,
//                             13480391,
//                             13476552,
//                             13475971,]},
//                     closed_at: {
//                         $gte: new Date('2023-04-04T00:07:17.481Z'),
//                         $lt: new Date('2023-04-04T00:19:11.481Z'),
//                     }
//                 }
                {
                    displaying_id: {
                        $in: [
                            14548129, 14548113, 14548151, 14548173, 14548189, 14548174
                        ]
                    }
                }
            ]
        }).read('s')
        // const orders = await FutureOrderMongo.find({status: 2, 'funding_fee.total': 0, side: 'Buy', symbol: 'BANDVNDC', opened_at: {$lt: new Date('2022-11-05T08:00:00.000Z')}, closed_at: {$gt: new Date('2022-11-05T08:00:00.000Z')}});

        // const orders = await FutureOrderMongo.find({
        //     profit: {$lt: 0},
        //     status: 2,
        //     reason_close_code: {$in: [1, 3]},
        //     closed_at: {$gt: new Date('2022-10-26T15:40:00.000Z'), $lt: new Date('2022-10-26T16:00:00.000Z')}
        // })

        // const orders = await FutureOrderMongo.find(({status: 2, _maintain: 1, reason_close_code: {$in: [1, 3]}, closed_at: {$gte: new Date('2022-07-14T17:00:00.000Z'), $lt: new Date('2022-07-14T19:00:00.000Z')}}))
        for (let i = 0; i < orders.length; i++) {
            const {
                user_id, raw_profit, swap, displaying_id, margin_currency, fee_data, order_value, funding_fee
            } = orders[i]

            if (funding_fee?.total > 0) {
                continue
            }
            const trans = []

            const funding = 1.5 / 100 * order_value
            console.log('__ funding', displaying_id, funding)
            trans.push(await Wallet.changeBalance(user_id, margin_currency, funding, null, 611, `Future order ${displaying_id} funding fee`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {
                // $inc: {
                //     "funding_fee.total": +funding,
                //     "funding_fee.balance": +funding,
                // }
                $set: {

                    funding_fee: {total: funding, balance: funding},
                }
            })

            console.log('__ trans', trans)
        }
    }

    async processMissFunding() {
        // if (process.env.FLAG_ENALBLE_FUTURESCOMMISSIONSLOGTASK === '0') {
        //     return
        // }

        // Rollback order
        // Hoàn lại pnl -> loại tiền là bảo hiểm
        // Hoàn lại phí giao dịch -> loại tiền là bảo hiểm
        //

        console.log('____ 1')
        const orders = await FutureOrderMongo.find({
            symbol: {
                $in: [
                    'BNXUSDT',
                    'BNXVNDC',
                ]
            },
            funding_fee: null,
            // close_price: {$gt: 0},
            status: 1,
            // opened_at: {$lt: ISODate('2022-11-28T08:00:00.000Z')},
            // closed_at: {$gt: ISODate('2022-11-28T08:00:00.000Z')},
            opened_at: {$lt: new Date('2022-12-04T14:00:00.000Z')},
            // closed_at: {$gt: new Date('2022-12-04T14:00:00.000Z')},

        }).read('s')
        console.log('____ 2')
        console.log('__ ordres', orders)
        const fundingData = {
            'BNXUSDT': -1.350432,
        }

        let total = 0
        for (let i = 0; i < orders.length; i++) {
            const {
                user_id,
                raw_profit,
                swap,
                displaying_id,
                margin_currency,
                fee_data,
                order_value,
                funding_fee,
                side,
                symbol
            } = orders[i]

            const originSymbol = symbol.replace('VNDC', 'USDT')
            const fundingRate = fundingData[originSymbol]

            if (funding_fee?.total > 0) {
                continue
            }
            const trans = []

            let funding = fundingRate / 100 * order_value * (side === 'Buy' ? -1 : 1)
            console.log('__ funding', displaying_id, funding)
            trans.push(await Wallet.changeBalance(user_id, margin_currency, funding, null, 611, `Future order ${displaying_id} funding fee`, null, {
                allowNegative: true, walletType: Wallet.WalletType.FUTURES
            }))
            total += funding

            await FutureOrderMongo.findOneAndUpdate({displaying_id}, {

                $inc: {
                    // margin: +updateData.margin,
                    "funding_fee.total": +funding,
                    "funding_fee.balance": +funding,
                    // "funding_fee.margin": +updateData.margin
                }
                // $set: {
                //     funding_fee: {total: funding, balance: funding},
                // }
            })

            console.log('__ trans', trans)
        }
        console.log('__ chekc total ', total)
    }

}

module.exports = TestFunc
