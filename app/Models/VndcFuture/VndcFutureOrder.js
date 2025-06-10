'use strict'

const WalletCurrency = use('Config')
    .get('walletCurrencies')
const Model = use('Model')
const FuturesLeverage = use('App/Models/Futures/FuturesLeverage')
const Error = use('Config')
    .get('error')
const FuturesPrice = use('App/Models/Futures/FuturesPrice')
const FutureContractConfig = use('Config')
    .get('futureContract')
const FutureOrder = use('App/Models/Future/FutureOrder')
const Wallet = use('App/Models/Wallet')
const WalletService = use('App/Services/WalletService')
const UserService = use('App/Services/UserService')
const LoanService = use('App/Services/LoanService')
const { WalletType } = use('App/Library/Enum').Wallet
const AssetConfig = use('App/Models/Config/AssetConfig')
const TransactionHistory = use('App/Models/TransactionHistory')
const Big = require('big.js')

const VNDCFuturesService = use('App/Services/VNDCFuturesService')
const { NamiFuturesOrder: NamiFuturesOrderEnum } = use("App/Library/Enum")
const NamiFuturesService = use('App/Services/NamiFuturesService')
const FuturesService = use('App/Services/FuturesService')
const OnusService = use('App/Services/OnusService')
const NotificationService = use('App/Services/NotificationService')
const Na3Service = use('App/Services/Na3Service')
const { FuturesOrder: FuturesOrderEnum, FuturesConfig: FuturesConfigEnum } = use("App/Library/Enum")
const { Type: OrderLogType } = use('App/Models/Mongo/FuturesOrderLog')

const RedisStreamCache = use('Redis').connection('stream_cache')
const Utils = use('App/Library/Utils')
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const Redis = use('Redis')
// const FCM = use('FCM')
const VndcFutureFee = use('App/Models/VndcFuture/VndcFutureFee')
const User = use('App/Models/User')
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const Env = use('Env')
const Redlock = require('redlock')
const _ = require('lodash')
const format = require("string-template")

const FuturesLocker = use('Redis').connection('futures_locker')
const Logger = use('Logger')
const OrderLocker = new Redlock([Redis], { retryCount: 100, retryDelay: 200 })
const BeeQueueFutures0 = use('BeeQueue').connection('futures')
const BeeQueueFutures1 = use('BeeQueue').connection('futures1')
const BeeQueueFutures2 = use('BeeQueue').connection('futures2')
const BeeQueueFutures3 = use('BeeQueue').connection('futures3')
const BeeQueueFutures4 = use('BeeQueue').connection('futures4')
const BeeQueueFutures5 = use('BeeQueue').connection('futures5')
const BeeQueueFutures6 = use('BeeQueue').connection('futures6')
const BeeQueueFutures7 = use('BeeQueue').connection('futures7')
const BeeQueueFutures8 = use('BeeQueue').connection('futures8')

// NẾU THÊM QUEUE, CHECK SỐ LƯỢNG CONCURRENT JOB CỦA QUEUE.
const FutureQueues = [
    BeeQueueFutures0, BeeQueueFutures1, BeeQueueFutures2, BeeQueueFutures3,
    BeeQueueFutures4,
    BeeQueueFutures5,
    BeeQueueFutures6,
    BeeQueueFutures7,
    BeeQueueFutures8
]
const { generate } = require('randomstring')

const SysNoti = use('App/Library/SysNoti')
const { isNumber } = require("lodash")

const { formatNumberToDecimal, getMMR } = use("App/Library/Utils")

// Đánh dấu user đã gửi notification gần đây
const UserPreferencesServices = use('App/Services/UserPreferencesService')

const RedisFuturesOrderMaster = use('Redis').connection('futures_order_master')
const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')

// order:<DISPLAYING_ID>

// KAKFA PRODUCER
const KafkaProducer = use('KafkaProducer')

class VndcFutureOrder extends Model {
    static boot () {
        super.boot()
        this.processingOrders = []
        this.startQueue()
    }

    static startQueue () {
        Logger.info('START VndcFutureOrder Queue')
        FutureQueues.forEach(BeeQueueFutures => {
            this.startIndividualQueue(BeeQueueFutures, 'normal')
        })
    }

    static async claimFuturesLock (displayingId, closeType) {
        let [lastReasonClose, errorCode] = await FuturesLocker.claim_futures_lock('close_futures', displayingId, closeType, 60)
        Logger.info('claimFuturesLock', { displayingId, closeType, lastReasonClose, errorCode })
        lastReasonClose = +lastReasonClose
        errorCode = +errorCode
        return { lastReasonClose, errorCode }
    }

    static async claimFuturesPlaceOrderLock (userId, requestId) {
        let [lastReasonClose, errorCode] = await FuturesLocker.claim_futures_lock('place_futures', `${userId}:${requestId}`, Date.now(), 60)
        Logger.info('claimFuturesPlaceOrderLock', { requestId, lastReasonClose, errorCode })
        lastReasonClose = +lastReasonClose
        errorCode = +errorCode
        return { lastReasonClose, errorCode }
    }

    static async checkFuturesLock (displayingId) {
        const lastReasonClose = await FuturesLocker.get(`close_futures:${displayingId}`)
        Logger.info('checkFuturesLock', { displayingId, lastReasonClose })
        return lastReasonClose
    }

    static startIndividualQueue (BeeQueueFutures) {
        BeeQueueFutures.process(100, this.processQueue.bind(this))
        BeeQueueFutures.on('succeeded', (job, result) => {
            Logger.info(`Futures order queue Job ${job.data} succeeded with result: ${result}`)
            console.log(new Date(), `Futures order queue Job ${job.data} succeeded with result: ${result}`)
        })
        BeeQueueFutures.on('error', (job, result) => {
            Logger.error(`Job error`, job.data, result)
            const { action, userId, _requestId, input } = job?.data

            const userCategory = input.product === 2 ? User.UserCategory.FRAME_NAMI : null
            FuturesService.processingOrderError({ id: userId, user_category: userCategory }, { error: result })
        })
        BeeQueueFutures.on('failed', async (job, err) => {
            Logger.error(`Job error [failed]`, job.data, err)
            const { action, userId, _requestId, input } = job.data

            const userCategory = input.product === 2 ? User.UserCategory.FRAME_NAMI : null
            FuturesService.processingOrderError({ id: userId, user_category: userCategory }, { error: err })
        })
    }

    // redis
    static getOrderKey (symbol, userId, displaying_id) {
        return `ORDER:${symbol}:${userId}:${displaying_id}`
    }

    static async getOrderRedis (displaying_id) {
        let data = await RedisFuturesOrderMaster.get_single_order(displaying_id)
        try {
            if (data && typeof data === 'string') {
                data = JSON.parse(data)
            }
        } catch (e) {
            console.error('getOrderRedis', e)
        }
        return data
    }

    // TODO add task before open/close order
    static async addToQueue (user, action, input) {
        if (!input.sl) input.sl = null
        if (!input.tp) input.tp = null
        let lastPrice
        let existingOrder
        let symbol = null
        if (action === 'place') {
            symbol = input.symbol
            lastPrice = await FuturesPrice.getBookTicker(symbol)
        } else if (action === 'close' || action === 'partial_close') {
            const order = await this.getOrderRedis(+input.displaying_id)
            if (!order) {
                if (input.special_mode === this.SpecialMode.DCA_ORDER) {
                    return
                }
                throw Error.NOT_FOUND_ORDER
            }
            symbol = order.symbol
            lastPrice = await FuturesPrice.getBookTicker(symbol)
            existingOrder = order
        }
        if (!lastPrice) {
            throw Error.PRICE_CHANGED
        }

        lastPrice.time = new Date().getTime()
        const requestId = `Req_${generate({ length: 6, readable: true, capitalization: 'uppercase' })}`

        let delayDuration = 0
        const jobData = {
            userId: user.id,
            telegramId: user?.telegram_id || null,
            action,
            input,
            _onQueueTime: Date.now(),
            _requestId: requestId,
            _order: existingOrder
        }

        // Delay if large order
        let orderValue
        if (action === 'close' && existingOrder && existingOrder.order_value) {
            orderValue = existingOrder.order_value
        } else if (action === 'place') {
            orderValue = (input.side === FutureOrder.Side.SELL ? lastPrice.bestBid : lastPrice.bestAsk) * +input.quantity
        } else if (action === 'partial_close') {
            orderValue = +input.closeVolume
        }

        if (symbol.includes('USDT')) {
            orderValue *= 23500
        }
        if (orderValue == null || orderValue > 100000 * 23500) {
            jobData._onQueuePrice = lastPrice
            delayDuration = 5000
        } else if (orderValue > 40000 * 23500) {
            jobData._onQueuePrice = lastPrice
            delayDuration = 4000
        } else if (orderValue > 20000 * 23500) {
            jobData._onQueuePrice = lastPrice
            delayDuration = 3000
        } else if (orderValue > 10000 * 23500 ) {
            delayDuration = 1500
            jobData._onQueuePrice = lastPrice
        } else if (orderValue > 5000 * 23500 ) {
            delayDuration = 1000
            jobData._onQueuePrice = lastPrice
        }else if (orderValue > 1000 * 23500 ) {
            delayDuration = 500
            jobData._onQueuePrice = lastPrice
        }  else {
            jobData._onQueuePrice = lastPrice
        }
        const delayedSymbols = ['BTCVNDC', 'ETHVNDC', 'BNBVNDC', 'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'BTCVNST', 'ETHVNST', 'BNBVNST']

        const ticker = await FuturesPrice.getTicker(symbol)
        const highFundingRate = ticker && Math.abs(ticker?.r) * 100 > 0.1
        const now = new Date()
        const hour = now.getHours()
        const min = now.getMinutes()
        const sec = now.getSeconds()
        const _ms = now.getMilliseconds()
        if (![delayedSymbols].includes(symbol)
            && (
                (sec < 10 && min === 0 && hour % 2 === 0)
                || (_ms > 950 && sec === 59 && min === 59 && hour % 2 === 1)
            )
        ) {
            let fundingDelay = 500
            if (highFundingRate) {
                fundingDelay += 5500
                if (sec <= 4) {
                    fundingDelay += 1500 + Math.floor(Math.random() * 1000)
                    if (orderValue >= 100e6) {
                        fundingDelay += 1500
                    }
                }
            }
            delayDuration = Math.max(fundingDelay, delayDuration / 2)
            jobData._inFundingTime = true
        }

        // Pick a queue
        let idToHash // Should be a character
        if (existingOrder && existingOrder.displaying_id) {
            const idString = existingOrder.displaying_id.toString()
            idToHash = idString.slice(-1)
        } else {
            idToHash = requestId.toString()
                .slice(-1)
        }
        const BeeQueueFutures = FutureQueues[idToHash.charCodeAt() % FutureQueues.length]

        const jobCreator = BeeQueueFutures.createJob(jobData)
            .timeout(60000)
        Logger.info(`Request ${requestId} delayDuration`, delayDuration)
        if (delayDuration > 0) {
            jobCreator.delayUntil(Date.now() + delayDuration)
        }

        const job = await jobCreator.save()

        if (action === 'place') {
            // Add temporary order into Redis
            const created_at = input.created_at || input.opened_at || new Date().toISOString()
            const tempOrder = {
                displaying_id: requestId,
                liquidity_broker: FutureContractConfig.liquidityBroker.NAMI,
                user_id: user.id,
                ...input,
                status: FutureOrder.Status.OPENING, // open_price: openPrice,
                created_at
            }
            Logger.info(`Request place order requestId = ${requestId}`, tempOrder, job.data)
            return tempOrder
        } if (action === 'close') {
            // Add temporary order into Redis
            let order
            if (existingOrder) {
                order = {
                    ...existingOrder, status: FutureOrder.Status.CLOSING
                    // close_price: (existingOrder.side === this.Side.BUY ? lastPrice.bestBid : lastPrice.bestAsk),
                }
            } else {
                order = {}
            }
            Logger.info(`Request close order orderId = ${input.displaying_id}, requestId = ${requestId}`, order, job.data)
            return order
        } if (action === 'partial_close') {
            const order = { displaying_id: input.displaying_id }
            Logger.info(`Request partial close order orderId = ${input.displaying_id}, requestId = ${requestId}`, order, job.data)
            return order
        }
    }

    /**
     * @param job
     * {data: {
     *     userId: ,
     *     action: 'place' OR 'close' OR 'close_partial' OR 'dca'
     *     input: { ... },
     *     _requestId: 'Req_123456',
     *     _price: {bid:, ask:, },
     *     _order: { ... }, // Only available when close order
     * }}
     */
    static async processQueue (job) {
        try {
            const {
                _requestId: requestId,
                action,
                userId,
                telegramId,
                input,
                _price,
                _onQueueTime,
                _onQueuePrice,
                _inFundingTime
            } = job.data
            const jobCreatedTime = _.get(job, 'options.timestamp')
            if (jobCreatedTime != null && Date.now() - jobCreatedTime > 180 * 1000) { // Too slow job
                Logger.info(`Cannot place order because the request time is too long, request time = ${jobCreatedTime}`)
                throw Error.REQUEST_TIMED_OUT
            }
            let locker
            if (action === 'place') {
                try {
                    locker = await OrderLocker.lock(`lock_futures_userId:${userId}`, 10000)
                    return await this.place({ id: userId, telegram_id: telegramId }, input, {
                        price: _price,
                        requestId,
                        _onQueuePrice,
                        _onQueueTime,
                        _inFundingTime
                    })
                } catch (e) {
                    throw e
                } finally {
                    locker && await locker.unlock()
                }
            } else if (action === 'close') {
                try {
                    locker = await OrderLocker.lock(`lock_futures_userId:${userId}`, 10000)
                    return await this.closeOrder({ id: userId, telegram_id: telegramId }, input, {
                        price: _price,
                        requestId,
                        _onQueuePrice,
                        _onQueueTime,
                        _inFundingTime
                    })
                } catch (e) {
                    throw e
                } finally {
                    locker && await locker.unlock()
                }
            } else if (action === 'partial_close') {
                try {
                    return await this.partialCloseOrder({ id: userId, telegram_id: telegramId }, input, {
                        price: _price,
                        requestId,
                        _onQueuePrice,
                        _onQueueTime,
                        _inFundingTime
                    })
                } catch (e) {
                    throw e
                }
            }
        } catch (e) {
            Logger.error('processQueue', e)
            throw e
        }
    }

    static checkIsBetaVndcFuturesUser (userId) {
        const BETA_VNDC_FUTURES_USER = Env.get('BETA_VNDC_FUTURES_USER', '')
        const IS_BETA_VNDC_FUTURES = +Env.get('IS_BETA_VNDC_FUTURES', 0)
        if (!IS_BETA_VNDC_FUTURES) return true
        const bannedUsers = BETA_VNDC_FUTURES_USER !== '' ? BETA_VNDC_FUTURES_USER.split(',')
            .map(item => +item) : []
        return bannedUsers.indexOf(userId) >= 0
    }

    static checkIsNotifyUser (userId) {
        const NOTIFY_VNDC_FUTURES_USER = Env.get('NOTIFY_VNDC_FUTURES_USER', '')
        const notifyUsers = NOTIFY_VNDC_FUTURES_USER !== '' ? NOTIFY_VNDC_FUTURES_USER.split(',')
            .map(item => +item) : []
        return notifyUsers.indexOf(userId) >= 0
    }

    static getCurrencyFromSymbol (symbol) {
        if (symbol?.endsWith('VNDC')) return WalletCurrency.VNDC
        if (symbol?.endsWith('VNST')) return WalletCurrency.VNST
        if (symbol?.endsWith('USDT')) return WalletCurrency.USDT
        throw Error.BAD_SYMBOL
    }

    static getFuturesProductInfo ({ userCategory, walletType, product }) {
        return {
            userCategory: User.UserCategory.FRAME_NAMI,
            walletType: WalletType.MAIN,
            product: this.Product.FRAME_NAMI
        }
    }

    static async checkOrderCondition (user, input) {
        const { symbol, order_value, product } = input
        const orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id: user.id })
        const countOrderNAO = orders?.filter(e => e.user_category === User.UserCategory.FRAME_NAMI)?.length ?? 0
        const countOrderNami = orders?.length - (countOrderNAO ?? 0)
        if (+product === this.Product.FRAME_NAMI && countOrderNAO >= 50) throw Error.MAX_NUM_ORDERS
        if (+product !== this.Product.FRAME_NAMI && countOrderNami >= 50) throw Error.MAX_NUM_ORDERS
        const totalVol = _.sumBy(orders, o => (o.symbol === symbol && !(o?.metadata?.partial_close_metadata?.is_main_order === false) ? o.order_value : 0))
        let maxNotional = 0
        const limitTotalVolume = await this.getFilter(symbol, FuturesConfigEnum.FilterType.MAX_TOTAL_VOLUME)
        if (limitTotalVolume?.notional > 0) {
            maxNotional = limitTotalVolume.notional
        }

        if (maxNotional > 0 && (totalVol + order_value) > maxNotional) {
            throw {
                ...Error.MAX_TOTAL_VOLUME,
                data: { max_notional: maxNotional }
            }
        }
    }

    static async countOrders (user) {
        const orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id: user.id })
        return orders && orders.length ? orders.length : 0
    }

    static async precheckPlaceOrder (user, input, _additionalData = {}) {
        if (!this.checkIsBetaVndcFuturesUser(user.id)) {
            throw Error.PRICE_CHANGED
        }
        const filterStatus = await this.filterOrderInput({ ...input, user_id: user.id })
        if (filterStatus) throw filterStatus
        // Get total order
        const orderValue = await this.getOrderValue(input, null)
        await this.checkOrderCondition(user, { ...input, order_value: orderValue })
        if (input?.metadata?.partial_close_metadata?.partial_close_from) return
        // Check balance
        const marginCurrency = this.getCurrencyFromSymbol(input.symbol)
        let checkBalance = this.calculateMargin(orderValue, input.symbol, input.leverage)
        const partnerType = await UserService.getPartnerType(user.id)
        const { walletType, product } = this.getFuturesProductInfo({ product: input.product })
        const feeRate = await VndcFutureFee.getOpenFeeRatio(partnerType, walletType, VndcFutureFee.FeeType.TAKER)
        const fee = +Big(orderValue).times(feeRate)
        checkBalance += Math.max(fee, 0)

        const wallet = await Wallet.getWallet(user.id, marginCurrency, walletType)
        const available = Math.max(+wallet.value, 0) - Math.max(+wallet.lockedValue, 0)
        const balance = +wallet.value
        Logger.info(`Precheck balance user #${user.id}, bal=${checkBalance}, Avbl=${available}, Bal=${balance}`)
        if ((checkBalance > available) || (checkBalance > balance)) {
            const maxLoanValue = await LoanService.getMaxLoan(user.id)
            Logger.info(`Precheck balance user with loan #${user.id}, bal=${checkBalance}, Avbl=${available}, Loan=${maxLoanValue}, Bal=${balance}`)
            if (checkBalance > available + maxLoanValue) {
                throw Error.BALANCE_INSUFFICIENT
            }
        }
    }

    static calculateVndcFee (order, checkClosePrice) {
        let close_order_fee = 0.1 / 100
        const { user_category } = order
        if (user_category === 1) {
            close_order_fee = 0.06 / 100
        }
        const orderValue = checkClosePrice * order.quantity // VNDC & VNST
        return orderValue * close_order_fee // VNDC & VNST
    }

    static async filterOrderInput (input = {}) {
        const DEFAULT_INPUT = {
            side: null,
            type: null,
            symbol: null,
            price: 0, // For price
            quantity: 0,
            quoteQty: 0,
            useQuoteQty: false,
            sl: 0,
            tp: 0,
            user_id: null,
            isClosePosition: false
        }
        const _input = _.defaults(input, DEFAULT_INPUT)
        const { side, type, symbol, quantity, quoteQty, useQuoteQty, sl, tp, price, user_id, leverage, isClosePosition } = _input
        if (!user_id) throw Error.UNAUTHORIZED
        if (Object.values(this.Type)
            .indexOf(type) < 0) {
            throw Error.INVALID_ORDER_TYPE
        }
        if (Object.values(this.Side)
            .indexOf(side) < 0) {
            throw Error.INVALID_SIDE
        }
        // Check symbol
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL
        if (!(config && config.status === "TRADING")) throw Error.TRADE_NOT_ALLOWED

        if (leverage) {
            if (config?.leverageConfig?.max < +leverage || config?.leverageConfig?.min > +leverage) {
                throw Error.INVALID_LEVERAGE
            }
        }

        // Với vndc thì lastprice là p
        const ticker = await FuturesPrice.getTicker(config.symbol)
        const { p: lastPrice, ap: ask, bp: bid } = ticker
        Logger.info('Futures filterOrderInput', { input, ticker })
        if (!lastPrice) throw Error.PRICE_CHANGED
        switch (type) {
            case NamiFuturesOrderEnum.Type.MARKET:
                if (sl && ((side === this.Side.BUY && sl >= lastPrice) || (side === this.Side.SELL && sl <= lastPrice))) throw Error.SL_FILTER
                if (tp && ((side === this.Side.BUY && tp <= lastPrice) || (side === this.Side.SELL && tp >= lastPrice))) throw Error.TP_FILTER
                break
            case NamiFuturesOrderEnum.Type.LIMIT:
                if (!price || (side === this.Side.BUY && price >= ask) || (side === this.Side.SELL && price <= bid)) throw Error.PRICE_FILTER
                if (sl && ((side === this.Side.BUY && sl >= price) || (side === this.Side.SELL && sl <= price))) throw Error.SL_FILTER
                if (tp && ((side === this.Side.BUY && tp <= price) || (side === this.Side.SELL && tp >= price))) throw Error.TP_FILTER
                break
            case NamiFuturesOrderEnum.Type.STOP:
                if (!price || (side === this.Side.BUY && price <= bid) || (side === this.Side.SELL && price >= ask)) throw Error.PRICE_FILTER
                if (sl && ((side === this.Side.BUY && sl >= price) || (side === this.Side.SELL && sl <= price))) throw Error.SL_FILTER
                if (tp && ((side === this.Side.BUY && tp <= price) || (side === this.Side.SELL && tp >= price))) throw Error.TP_FILTER
                break
            default:
                if (!price || (side === this.Side.BUY && price <= bid) || (side === this.Side.SELL && price >= ask)) throw Error.PRICE_FILTER
                if (sl && ((side === this.Side.BUY && sl >= price) || (side === this.Side.SELL && sl <= price))) throw Error.SL_FILTER
                if (tp && ((side === this.Side.BUY && tp <= price) || (side === this.Side.SELL && tp >= price))) throw Error.TP_FILTER
                break
        }
        if (config.filters && config.filters.length) {
            for (let i = 0; i < config.filters.length; i++) {
                const filter = config.filters[i]
                switch (filter.filterType) {
                    case FuturesConfigEnum.FilterType.PRICE_FILTER: {
                        const { minPrice, maxPrice, tickSize } = filter

                        if ([NamiFuturesOrderEnum.Type.LIMIT, NamiFuturesOrderEnum.Type.STOP].includes(type) && (price < +minPrice || price > +maxPrice || Utils.isInvalidPrecision(+price, +tickSize))) {
                            throw Error.PRICE_FILTER
                        }
                        if (sl && (sl < +minPrice || sl > +maxPrice || Utils.isInvalidPrecision(+sl, +tickSize))) {
                            throw Error.SL_FILTER
                        }
                        if (tp && (tp < +minPrice || tp > +maxPrice || Utils.isInvalidPrecision(+tp, +tickSize))) {
                            throw Error.TP_FILTER
                        }
                        break
                    }

                    case FuturesConfigEnum.FilterType.LOT_SIZE: {
                        if (type === NamiFuturesOrderEnum.Type.MARKET) break
                        const { minQty, maxQty, stepSize, maxQuoteQty } = filter

                        if (!useQuoteQty) {
                            if (quantity < +minQty || quantity > +maxQty) {
                                throw Error.LOT_SIZE
                            }
                            if (Utils.isInvalidPrecision(+quantity, +stepSize)) {
                                throw Error.LOT_SIZE
                            }
                        } else if (quoteQty > +maxQuoteQty) {
                            throw Error.LOT_SIZE
                        }

                        break
                    }
                    case FuturesConfigEnum.FilterType.MARKET_LOT_SIZE: {
                        if (type !== NamiFuturesOrderEnum.Type.MARKET) break
                        const { minQty, maxQty, stepSize, maxQuoteQty } = filter
                        if (!useQuoteQty) {
                            if (quantity < +minQty || quantity > +maxQty) {
                                throw Error.LOT_SIZE
                            }
                            if (Utils.isInvalidPrecision(+quantity, +stepSize)) {
                                throw Error.LOT_SIZE
                            }
                        } else if (quoteQty > +maxQuoteQty) {
                            if (!isClosePosition) throw Error.LOT_SIZE
                        }

                        break
                    }
                    case FuturesConfigEnum.FilterType.PERCENT_PRICE: {
                        const { multiplierUp, multiplierDown, minDifferenceRatio, multiplierDecimal } = filter

                        let activePrice = lastPrice
                        const checkPriceMultiplier = []
                        const checkPriceDifference = []

                        const checkSlTpMultiplier = []
                        const checkSlTpDifference = []
                        if (type === NamiFuturesOrderEnum.Type.LIMIT || type === NamiFuturesOrderEnum.Type.STOP) {
                            activePrice = price
                            // Need check active price
                            if (activePrice > 0 && lastPrice > 0) {
                                checkPriceMultiplier.push(+((activePrice) / lastPrice).toFixed(+multiplierDecimal))
                                checkPriceDifference.push(+(Math.abs(activePrice - lastPrice) / lastPrice).toFixed(+multiplierDecimal))
                            }
                        }

                        if (sl) {
                            checkSlTpMultiplier.push(+((sl) / activePrice).toFixed(+multiplierDecimal))
                            checkSlTpDifference.push(+(Math.abs(activePrice - sl) / activePrice).toFixed(+multiplierDecimal))
                        }
                        if (tp) {
                            checkSlTpMultiplier.push(+((tp) / activePrice).toFixed(+multiplierDecimal))
                            checkSlTpDifference.push(+(Math.abs(activePrice - tp) / activePrice).toFixed(+multiplierDecimal))
                        }

                        const percentUp = (multiplierUp - 1) * 100
                        const percentDown = (1 - multiplierDown) * 100
                        const differencePercent = minDifferenceRatio * 100
                        checkPriceMultiplier.forEach(multiplier => {
                            if (multiplier > multiplierUp || multiplier < multiplierDown) {
                                throw {
                                    ...Error.PERCENT_PRICE,
                                    message: format(Error.PERCENT_PRICE.message, { percentUp, percentDown }),
                                    data: { percentUp, percentDown }
                                }
                            }
                        })
                        checkPriceDifference.forEach(multiplier => {
                            if (+Math.abs(multiplier) < minDifferenceRatio) {
                                throw {
                                    ...Error.MIN_DIFFERENCE_ACTIVE_PRICE,
                                    message: format(Error.MIN_DIFFERENCE_ACTIVE_PRICE.message, { differencePercent }),
                                    data: { differencePercent }
                                }
                            }
                        })
                        checkSlTpMultiplier.forEach(multiplier => {
                            if (multiplier > multiplierUp || multiplier < multiplierDown) {
                                throw {
                                    ...Error.PERCENT_SL_TP_PRICE,
                                    message: format(Error.PERCENT_SL_TP_PRICE.message, { percentUp, percentDown }),
                                    data: { percentUp, percentDown }
                                }
                            }
                        })
                        checkSlTpDifference.forEach(multiplier => {
                            if (+Math.abs(multiplier) < minDifferenceRatio) {
                                throw {
                                    ...Error.MIN_DIFFERENCE_SL_TP_PRICE,
                                    message: format(Error.MIN_DIFFERENCE_SL_TP_PRICE.message, { differencePercent }),
                                    data: { percentUp, percentDown, differencePercent }
                                }
                            }
                        })
                        break
                    }
                    // Check min notional
                    case FuturesConfigEnum.FilterType.MIN_NOTIONAL: {
                        const { notional: minNotional } = filter
                        let orderValue = 0
                        let activePrice = lastPrice
                        if (type === NamiFuturesOrderEnum.Type.LIMIT || type === NamiFuturesOrderEnum.Type.STOP) {
                            activePrice = price
                        }

                        if (useQuoteQty) {
                            orderValue = quoteQty
                        } else {
                            orderValue = quantity * activePrice
                        }
                        if (orderValue < +minNotional * (1 - 0.12 / 100)) {
                            throw { ...Error.MIN_NOTIONAL, message: format(Error.MIN_NOTIONAL.message, { minNotional }) }
                        }
                        break
                    }
                    default:
                        break
                }
            }
        }
        return null
    }

    static async filterModifyOrderInput (input = {}) {
        const DEFAULT_INPUT = { order: null, sl: 0, tp: 0, user_id: null }
        const _input = _.defaults(input, DEFAULT_INPUT)
        let { order, sl, tp, user_id, price: newActivePrice } = _input
        const {
            side,
            type,
            status,
            symbol,
            quantity,
            price,
            leverage,
            fee_currency,
            margin_currency,
            fee,
            margin
        } = order
        if (status === this.Status.CLOSED) throw Error.NOT_FOUND_ORDER

        // Return
        const lastBookTicker = await FuturesPrice.getBookTicker(symbol)
        if (!lastBookTicker) throw Error.PRICE_CHANGED
        const { bestBid: bid, bestAsk: ask } = lastBookTicker

        Logger.info('Modify order', { input, order, lastBookTicker })
        if ([NamiFuturesOrderEnum.Type.LIMIT, NamiFuturesOrderEnum.Type.STOP].includes(type)) {
            if (!newActivePrice) {
                newActivePrice = order.price
            }
        }

        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL
        if (!(config && config.status === "TRADING")) throw Error.TRADE_NOT_ALLOWED

        // Kiểm tra nếu sửa sl

        if (order.status === this.Status.ACTIVE && sl && sl !== order.sl) {
            const checkClosePrice = side === this.Side.BUY ? bid : ask
            const estimatePnl = this.calculateProfit(order.symbol, order.side, order.open_price, checkClosePrice, quantity)
            let openFee = 0
            if (fee_currency === margin_currency && typeof fee === 'number' && fee > 0) {
                openFee = fee
            }
            const checkFeeVndc = this.calculateVndcFee(order, checkClosePrice)
            if (order.user_category === 1 && (estimatePnl - checkFeeVndc - openFee) <= -margin * 0.8) {
                // Send notification
                // Không cho sửa khi lệnh 80% pnl
                throw Error.SL_FILTER_MARGIN_CALL
            }
        }

        if (config.filters && config.filters.length) {
            for (let i = 0; i < config.filters.length; i++) {
                const filter = config.filters[i]
                switch (filter.filterType) {
                    case FuturesConfigEnum.FilterType.PRICE_FILTER: {
                        const { minPrice, maxPrice, tickSize } = filter

                        if (status === this.Status.PENDING && [NamiFuturesOrderEnum.Type.LIMIT, NamiFuturesOrderEnum.Type.STOP].includes(type)) {
                            if (newActivePrice < +minPrice || newActivePrice > +maxPrice || Utils.isInvalidPrecision(+newActivePrice, +tickSize)) throw Error.PRICE_FILTER
                        }
                        if (sl && (sl < +minPrice || sl > +maxPrice || Utils.isInvalidPrecision(+sl, +tickSize))) {
                            throw Error.SL_FILTER
                        }
                        if (tp && (tp < +minPrice || tp > +maxPrice || Utils.isInvalidPrecision(+tp, +tickSize))) {
                            throw Error.TP_FILTER
                        }
                        break
                    }
                    case FuturesConfigEnum.FilterType.PERCENT_PRICE: {
                        const { minDifferenceRatio } = filter
                        const ticker = await FuturesPrice.getTicker(config.symbol)
                        const lastPrice = +ticker?.p || 0

                        if (!(lastPrice > 0)) break
                        if (sl > 0 && sl !== order.sl) {
                            if (+(Math.abs(sl - lastPrice) / lastPrice).toFixed(4) < minDifferenceRatio) {
                                throw {
                                    ...Error.MIN_DIFFERENCE_SL_TP_PRICE,
                                    message: format(Error.MIN_DIFFERENCE_SL_TP_PRICE.message, { differencePercent: minDifferenceRatio * 100 }),
                                    data: { differencePercent: minDifferenceRatio * 100 }
                                }
                            }
                        }
                        if (tp > 0 && tp !== order.tp) {
                            if (+(Math.abs(tp - lastPrice) / lastPrice).toFixed(4) < minDifferenceRatio) {
                                throw {
                                    ...Error.MIN_DIFFERENCE_SL_TP_PRICE,
                                    message: format(Error.MIN_DIFFERENCE_SL_TP_PRICE.message, { minDifferenceRatio: minDifferenceRatio * 100 }),
                                    data: { differencePercent: minDifferenceRatio * 100 }
                                }
                            }
                        }
                        break
                    }
                    default:
                        break
                }
            }
        }

        if (type === NamiFuturesOrderEnum.Type.MARKET || status === this.Status.ACTIVE) {
            if (sl && ((side === this.Side.BUY && sl >= bid) || (side === this.Side.SELL && sl <= ask))) {
                throw Error.SL_FILTER
            }
            if (tp && ((side === this.Side.BUY && tp <= ask) || (side === this.Side.SELL && tp >= bid))) {
                throw Error.TP_FILTER
            }
        } else if (type === NamiFuturesOrderEnum.Type.LIMIT && status === this.Status.PENDING) {
            if (!newActivePrice || (side === this.Side.BUY && newActivePrice >= ask) || (side === this.Side.SELL && newActivePrice <= bid)) throw Error.PRICE_FILTER
            if (sl && ((side === this.Side.BUY && sl >= newActivePrice) || (side === this.Side.SELL && sl <= newActivePrice))) {
                throw Error.SL_FILTER
            }
            if (tp && ((side === this.Side.BUY && tp <= newActivePrice) || (side === this.Side.SELL && tp >= newActivePrice))) {
                throw Error.TP_FILTER
            }
        } else if (type === NamiFuturesOrderEnum.Type.STOP && status === this.Status.PENDING) {
            if (!newActivePrice || (side === this.Side.BUY && newActivePrice <= ask) || (side === this.Side.SELL && newActivePrice >= bid)) throw Error.PRICE_FILTER
            if (sl && ((side === this.Side.BUY && sl >= newActivePrice) || (side === this.Side.SELL && sl <= newActivePrice))) throw Error.SL_FILTER
            if (tp && ((side === this.Side.BUY && tp <= newActivePrice) || (side === this.Side.SELL && tp >= newActivePrice))) throw Error.TP_FILTER
        }
        return null
    }

    // TODO fix here
    static async closeOrder (user, options = {}, extraOptions = {}) {
        let locker
        const lock_displaying_id = options.displaying_id
        const {
            lastReasonClose,
            errorCode
        } = await this.claimFuturesLock(lock_displaying_id, this.ReasonCloseCode.NORMAL)
        if (errorCode) {
            Logger.error(`lock_futures_order_reject closeOrder Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }

        try {
            const _options = _.defaults(options, {
                displaying_id: null,
                vndc_service_close_price: null,
                reason_close_code: this.ReasonCloseCode.NORMAL,
                special_mode: this.SpecialMode.NORMAL,
                is_liquidation_loan: false
            })

            locker = await OrderLocker.lock(`lock_futures_order:${_options.displaying_id}`, 20000)
            const { displaying_id, reason_close_code, special_mode } = _options
            // Note cannot revert any action in bitmex
            let order = await this.getOrderRedis(displaying_id)

            if (
                _options?.metadata?.partial_close_metadata?.is_market
                && !_options.metadata?.partial_close_metadata?.is_main_order
            ) {
                order = _options
            }

            if (!order || order.user_id !== user.id) throw Error.NOT_FOUND_ORDER
            if (order.order_value < 0) throw Error.NOT_FOUND_ORDER
            const marginCurrency = order.margin_currency
            const {
                bitmex_main_order_id,
                bitmex_tp_order_id,
                bitmex_sl_order_id,
                symbol,
                status,
                quantity,
                open_price,
                type,
                side,
                close_mode,
                fee_metadata,
                fee_data,
                volume_data,
                swap,
                user_metadata
            } = order

            let priceSide = side
            if (order?.metadata?.partial_close_metadata?.is_market && !order.metadata?.partial_close_metadata?.is_main_order) {
                priceSide = side === this.Side.BUY ? this.Side.SELL : this.Side.BUY
            }
            // Market type
            const needAddHistory = true

            const balanceLog = { balance_before: 0, balance_after: 0, balance_currency: marginCurrency }
            const { walletType, product } = this.getFuturesProductInfo({ userCategory: order.user_category })
            if (order.status === this.Status.ACTIVE) {
                let refClosePrice
                if (extraOptions._onQueuePrice != null) {
                    let suitablePrice
                    if (extraOptions._onQueueTime) {
                        suitablePrice = await this.getSuitablePrice(symbol, extraOptions._onQueueTime, Date.now(), side, true)
                    }
                    // Get queue bid, ask
                    let queueBestBid = extraOptions._onQueuePrice.bestBid
                    let queueBestAsk = extraOptions._onQueuePrice.bestAsk
                    if (!(extraOptions._onQueuePrice.bestBid <= extraOptions._onQueuePrice.lastPrice && extraOptions._onQueuePrice.bestAsk >= extraOptions._onQueuePrice.lastPrice)) {
                        queueBestBid = extraOptions._onQueuePrice.lastPrice
                        queueBestAsk = extraOptions._onQueuePrice.lastPrice
                    }

                    const lastPrice = await FuturesPrice.getBookTicker(symbol)
                    let lastBestBid = lastPrice.bestBid
                    let lastBestAsk = lastPrice.bestAsk
                    if (!(lastPrice.bestBid <= lastPrice.lastPrice && lastPrice.bestAsk >= lastPrice.lastPrice)) {
                        lastBestBid = lastPrice.lastPrice
                        lastBestAsk = lastPrice.lastPrice
                    }

                    if (priceSide === this.Side.BUY) {
                        refClosePrice = Math.min(queueBestBid, lastBestBid)
                        if (isNumber(suitablePrice) && suitablePrice > 0) {
                            refClosePrice = Math.min(refClosePrice, suitablePrice)
                        }

                        if (
                            extraOptions?._inFundingTime
                            && isNumber(suitablePrice) && suitablePrice > 0
                            && isNumber(extraOptions?._onQueuePrice?.bestBid) && extraOptions?._onQueuePrice?.bestBid > 0
                            && isNumber(extraOptions?._onQueuePrice?.lastPrice) && extraOptions?._onQueuePrice?.lastPrice > 0
                            && isNumber(lastPrice?.lastPrice) && lastPrice?.lastPrice > 0
                        ) {
                            refClosePrice = Math.min(extraOptions?._onQueuePrice?.bestBid, extraOptions?._onQueuePrice?.lastPrice, suitablePrice, lastPrice?.lastPrice)
                        }
                    } else {
                        refClosePrice = Math.max(queueBestAsk, lastBestAsk)
                        if (isNumber(suitablePrice) && suitablePrice > 0) {
                            refClosePrice = Math.max(refClosePrice, suitablePrice)
                        }
                        if (
                            extraOptions?._inFundingTime
                            && isNumber(suitablePrice) && suitablePrice > 0
                            && isNumber(extraOptions?._onQueuePrice?.bestAsk) && extraOptions?._onQueuePrice?.bestAsk > 0
                            && isNumber(extraOptions?._onQueuePrice?.lastPrice) && extraOptions?._onQueuePrice?.lastPrice > 0
                            && isNumber(lastPrice?.lastPrice) && lastPrice?.lastPrice > 0

                        ) {
                            refClosePrice = Math.max(extraOptions?._onQueuePrice?.bestAsk, extraOptions?._onQueuePrice?.lastPrice, suitablePrice, lastPrice?.lastPrice)
                        }
                    }
                    Logger.info(`Price for ${extraOptions.requestId}, queue ${JSON.stringify(extraOptions._onQueuePrice)}, inFunding ${JSON.stringify(extraOptions?._inFundingTime)}, price ${JSON.stringify(lastPrice)}, suit ${suitablePrice} => ${refClosePrice}`)
                } else {
                    let priceTicker
                    if (extraOptions.price != null) {
                        priceTicker = extraOptions.price
                    } else {
                        priceTicker = await FuturesPrice.getBookTicker(symbol)
                        if (!priceTicker) throw Error.PRICE_CHANGED
                    }

                    let tickerBestBid = priceTicker.bestBid
                    let tickerBestAsk = priceTicker.bestAsk
                    if (!(priceTicker.bestBid <= priceTicker.lastPrice && priceTicker.bestAsk >= priceTicker.lastPrice)) {
                        tickerBestBid = priceTicker.lastPrice
                        tickerBestAsk = priceTicker.lastPrice
                    }
                    refClosePrice = (priceSide === this.Side.BUY ? tickerBestBid : tickerBestAsk)
                }
                const orderValueVndc = quantity * refClosePrice
                let closeFeeCur = null
                if (order.fee_metadata.close_order) closeFeeCur = order.fee_metadata.close_order.currency
                let feeWalletType = walletType

                const partnerType = order?.partner_type || 0
                // tính fee với volume đóng
                const { feeValue: closeOrderFee, feeCurrency } = await VndcFutureFee.getFutureFee(user, {
                    walletType: feeWalletType,
                    value: orderValueVndc,
                    symbol,
                    type: VndcFutureFee.Type.CLOSE_ORDER,
                    partnerType,
                    feeType: VndcFutureFee.FeeType.TAKER
                }, WalletCurrency.LUSDT)
                if (_options?.vndc_service_close_price > 0) {
                    refClosePrice = _options?.vndc_service_close_price
                    Logger.info(`Close order ${displaying_id} with refClosePrice = ${refClosePrice}`)
                }
                const openOrderFee = (order.fee || 0)
                const closePrice = refClosePrice
                const buyProfit = 0
                // profit lệnh không bao gồm fee
                let rawProfit = this.calculateProfit(order.symbol, order.side, order.open_price, closePrice, order.quantity)
                if (order.metadata?.partial_close_metadata?.partial_close_from) {
                    rawProfit = -rawProfit
                }
                if (feeCurrency === marginCurrency) {
                    feeWalletType = walletType
                    order.fee = (order.fee || 0) + closeOrderFee
                    order.fee_currency = marginCurrency
                }
                if (order.fee_metadata && typeof order.fee_metadata === 'object') {
                    order.fee_metadata = {
                        ...order.fee_metadata,
                        close_order: { value: closeOrderFee, currency: feeCurrency }
                    }
                }
                if (order.fee_data && typeof order.fee_data === 'object') {
                    order.fee_data = {
                        ...order.fee_data,
                        close_order: {
                            ...order.fee_data?.close_order,
                            [feeCurrency]: order.fee_data?.close_order?.[feeCurrency] + closeOrderFee || closeOrderFee
                        }
                    }
                }
                if (order.volume_data && typeof order.volume_data === 'object') {
                    order.volume_data = {
                        ...order.volume_data,
                        close_order: {
                            ...order.volume_data?.close_order,
                            [feeCurrency]: order.volume_data?.close_order?.[feeCurrency] + order.order_value || order.order_value
                        }
                    }
                }
                const feeMarginCurrency = (order.fee_data?.place_order?.[marginCurrency] || 0) + (order.fee_data?.close_order?.[marginCurrency] || 0)
                // profit lệnh bao gồm fee
                let profit = rawProfit - order.fee
                if (new Date(order.opened_at).getTime() > new Date('2022-09-08T04:00:00.000Z').getTime()) {
                    profit -= (swap || 0)
                }
                // Fix loss over margin
                if (profit < -order.margin) {
                    profit = -order.margin
                    // tinh lai raw profit sau khi dam bao balance de tru phi
                    rawProfit = profit + order.fee
                    if (order.pending_swap > 0) {
                        rawProfit += order.pending_swap
                    }
                }

                order.profit = +Big(rawProfit).minus(feeMarginCurrency)
                    .toFixed(8)
                order.raw_profit = +Big(rawProfit)
                    .toFixed(8)
                order.close_price = closePrice
                order.close_order_value = closePrice * order.quantity
                order.closed_at = new Date()
                order.profit_metadata = {
                    usdt: profit,
                    loan: 0
                }
                if (order?.metadata?.caller_user_id && order?.metadata?.follow_order_id) {
                    const shareValue = await FuturesService.calculateSharingProfitToCaller({
                        displaying_id: order.displaying_id,
                        profit: order.profit,
                        fee_data: order.fee_data
                    })
                    Logger.info(`Close order ${order.displaying_id} share to caller ${order?.metadata?.caller_user_id} value=${shareValue}`)
                    order.share_to_master = +shareValue
                }
                if (_options.is_liquidation_loan) {
                    order.is_liquidation_loan = true
                }

                // Process balance
                const transactionHistories = []
                let useLoan = false
                let loanValue = 0
                let assetAvailable = 0

                if (profit < 0) {
                    const wallet = await Wallet.getWallet(user.id, marginCurrency, walletType)
                    // Check asset available sau khi trừ phí mở và margin
                    assetAvailable = Math.max(+wallet.value, 0) - Math.max(+wallet.lockedValue - openOrderFee - order.margin, 0)
                    assetAvailable = Math.max(assetAvailable, 0)
                    if (assetAvailable < Math.abs(profit)) {
                        // nếu không đủ asset để trả cho pnl + fee đóng thì sử dụng loan
                        useLoan = true
                    }
                }
                try {
                    // Process margin
                    // Unlock margin
                    transactionHistories.push(await WalletService.changeBalance(user.id, order.margin_currency, 0, -order.margin, TransactionHistory.Category.FUTURE_PLACE_ORDER_MARGIN, `Close future order ${order.displaying_id} return margin`, {
                        allowNegative: true,
                        walletType,
                        metadata: {
                            source: {
                                collection: 'futureorders',
                                filter: { displaying_id: order.displaying_id }
                            }
                        }
                    }))
                    if (useLoan) {
                        // nếu sử dụng khoản vay
                        if (rawProfit < 0) {
                            // nếu pnl âm thì lock loan
                            if (Math.abs(rawProfit) > assetAvailable) {
                                loanValue = Math.abs(rawProfit) - assetAvailable
                                assetAvailable = 0
                                // lock lại khoản vay
                                transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, null, loanValue, TransactionHistory.Category.FUTURE_CLOSE_ORDER_LOAN_PROFIT, `Close future order ${order.displaying_id} lock loan raw profit`, {
                                    allowNegative: true,
                                    walletType,
                                    metadata: {
                                        source: {
                                            collection: 'futureorders',
                                            filter: { displaying_id: order.displaying_id }
                                        }
                                    }
                                }))
                            } else {
                                // không vay cho khoản pnl
                                assetAvailable -= Math.abs(rawProfit)
                            }
                        } else {
                            // nếu pnl dương thì available tăng lên
                            assetAvailable += rawProfit
                        }
                    }
                    if (rawProfit + loanValue !== 0) {
                        // trừ rawProfit vào tài sản usdt
                        transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, rawProfit + loanValue, 0, TransactionHistory.Category.FUTURE_CLOSE_ORDER_PROFIT, `Close future order ${order.displaying_id} raw profit`, {
                            allowNegative: true,
                            walletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: order.displaying_id }
                                }
                            }
                        }))
                    }
                    let openFee = openOrderFee
                    if (openOrderFee > 0) {
                        if (useLoan) {
                            if (openOrderFee > assetAvailable) {
                                // nếu phí mở lớn hơn usdt available tính lại khoản vay
                                loanValue += openOrderFee - assetAvailable
                                // tính lại openFee nếu usdt không đủ trả
                                openFee = assetAvailable
                                assetAvailable = 0
                            } else {
                                // usdt đủ trả phí mở
                                assetAvailable -= openOrderFee
                            }
                        }
                        if (openFee > 0) {
                            // unlock fee mở bằng usdt
                            transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, null, -openFee, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close future order ${order.displaying_id} unlock open fee`, {
                                allowNegative: true,
                                walletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id }
                                    }
                                }
                            }))
                            // kết toán fee mở bằng usdt
                            transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, -openFee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close future order ${order.displaying_id} open fee`, {
                                allowNegative: true,
                                walletType: feeWalletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id }
                                    }
                                }
                            }))
                        }
                    }

                    let closeFee = closeOrderFee
                    if (feeCurrency === marginCurrency) {
                        if (useLoan) {
                            if (assetAvailable > 0) {
                                closeFee = assetAvailable
                            } else {
                                closeFee = 0
                            }
                            // số vay để trả phí đóng
                            const loanCloseFee = closeOrderFee - assetAvailable
                            loanValue += loanCloseFee
                            // lock lại khoản vay phí đóng
                            transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, null, loanCloseFee, TransactionHistory.Category.FUTURE_PLACE_ORDER_LOAN_FEE, `Close future order ${order.displaying_id} lock loan close fee`, {
                                allowNegative: true,
                                walletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id}
                                    }
                                }
                            }))
                        }

                        if (closeFee > 0) {
                            // trừ phí đóng bằng usdt
                            transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, -closeFee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close future order ${order.displaying_id} close fee`, {
                                allowNegative: true,
                                walletType: feeWalletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id}
                                    }
                                }
                            }))
                        }
                    } else if (closeOrderFee > 0) {
                        transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, -closeOrderFee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close future order ${order.displaying_id} close fee`, {
                            allowNegative: true,
                            walletType: feeWalletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: order.displaying_id}
                                }
                            }
                        }))
                    }

                    if (loanValue > 0 && _options.is_liquidation_loan) {
                        // thanh lý toàn phần gọi qua
                        const afterWallet = await Wallet.getWallet(user.id, marginCurrency, walletType)
                        const afterBalance = Math.max(+afterWallet.value, 0)
                        Logger.info(`closeAllOrderByLoan checkBalance orderId=${order.displaying_id} loanValue=${loanValue} afterBalance=${afterBalance}`)
                        if (afterBalance > 0) {
                            const liquidationLoan = Math.min(loanValue, afterBalance)
                            // tính lại khoản vay sau khi tài sản bị thanh lý toàn phần sang usdt
                            loanValue = Math.max(loanValue - liquidationLoan, 0)
                            transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, null, -liquidationLoan, TransactionHistory.Category.FUTURE_LIQUIDATION_LOAN_VALUE, `Close future order ${order.displaying_id} liquidation loan unlock loan value`, {
                                allowNegative: true,
                                walletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id}
                                    }
                                }
                            }))
                            transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, -liquidationLoan, null, TransactionHistory.Category.FUTURE_LIQUIDATION_LOAN_VALUE, `Close future order ${order.displaying_id} liquidation loan remove loan value`, {
                                allowNegative: true,
                                walletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: order.displaying_id}
                                    }
                                }
                            }))
                        }
                    }
                    if (order?.metadata?.follow_order_id && order?.metadata?.caller_user_id && order?.share_to_master > 0) {
                        transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, -order.share_to_master, null, TransactionHistory.Category.FUTURE_SHARE_TO_MASTER, `Close future order ${order.displaying_id} share to caller ${order?.metadata?.caller_user_id}`, {
                            allowNegative: true,
                            walletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: order.displaying_id}
                                }
                            }
                        }))
                        transactionHistories.push(await WalletService.changeBalance(order.metadata.caller_user_id, marginCurrency, order.share_to_master, null, TransactionHistory.Category.FUTURE_SHARE_TO_MASTER, `User ${user.id} share profit for signal ${order?.metadata?.follow_order_id}`, {
                            allowNegative: true,
                            walletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: order.displaying_id}
                                }
                            }
                        }))
                    }
                } catch (e) {
                    console.log('close order error ', e)
                    if (transactionHistories && transactionHistories.length) {
                        await WalletService.rollbackWallet(transactionHistories)
                    }

                    FutureOrder.notifyFutureError(`Thay đổi balance user ${user.id} lỗi, không close được lệnh`)
                    console.error(`Thay đổi balance user ${user.id} lỗi, không close được lệnh 1`, e)
                    throw Error.UNKNOWN
                }

                if (loanValue > 0) {
                    await LoanService.liquidateLoanAsset(user.id, order.displaying_id, loanValue)
                }
                if (loanValue > 0) {
                    order.profit_metadata = {
                        usdt: +Big(profit).plus(loanValue),
                        loan: -loanValue
                    }
                }

                if (user_metadata) {
                    FuturesService.setRecentTrade({
                        displaying_id,
                        username: user_metadata?.username,
                        photo_url: user_metadata?.photo_url,
                        symbol,
                        side: side === this.Side.BUY ? this.Side.SELL : this.Side.BUY,
                        order_value: order.close_order_value
                    })
                }
                // Return margin
            } else if (order.status === this.Status.PENDING) {
                let returnFee = 0
                let returnFeeCurrency = order.margin_currency
                let pendingBonus = 0
                if (order.fee_metadata && typeof order.fee_metadata === 'object') {
                    returnFee = _.get(order, 'fee_metadata.place_order.value', 0)
                    returnFeeCurrency = _.get(order, 'fee_metadata.place_order.currency', order.margin_currency)
                    pendingBonus = _.get(order, 'fee_metadata.place_order.pendingBonus', 0)
                }
                const transactionHistories = []
                const feeWalletType = walletType

                if (!(order.metadata?.partial_close_metadata?.is_main_order === false)) {
                    try {
                        transactionHistories.push(await WalletService.changeBalance(user.id, order.margin_currency, 0, -order.margin, TransactionHistory.Category.FUTURE_PLACE_ORDER_MARGIN, `Close pending future order ${order.displaying_id} unlock margin`, {
                            allowNegative: true,
                            walletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: order.displaying_id }
                                }
                            }
                        }))

                        if (pendingBonus !== 1) {
                            if (returnFeeCurrency === order.margin_currency) {
                                if (returnFee > 0) {
                                    if (order.fee > 0) {
                                        transactionHistories.push(await WalletService.changeBalance(user.id, returnFeeCurrency, 0, -order.fee, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close pending future order ${order.displaying_id} unlock open fee`, {
                                            allowNegative: true,
                                            walletType: feeWalletType,
                                            metadata: {
                                                commissionType: 'PENDING',
                                                source: {
                                                    collection: 'futureorders',
                                                    filter: {displaying_id: order.displaying_id}
                                                }
                                            }
                                        }))
                                    }
                                    transactionHistories.push(await WalletService.changeBalance(user.id, returnFeeCurrency, returnFee - (order.fee || 0), null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close pending future order ${order.displaying_id} return fee`, {
                                        allowNegative: true,
                                        walletType: feeWalletType,
                                        metadata: {
                                            commissionType: 'PENDING',
                                            source: {
                                                collection: 'futureorders',
                                                filter: { displaying_id: order.displaying_id }
                                            }
                                        }
                                    }))
                                }
                            } else {
                                transactionHistories.push(await WalletService.changeBalance(user.id, returnFeeCurrency, returnFee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Close pending future order ${order.displaying_id} return fee`, {
                                    allowNegative: true,
                                    walletType: feeWalletType,
                                    metadata: {
                                        commissionType: 'PENDING',
                                        source: {
                                            collection: 'futureorders',
                                            filter: { displaying_id: order.displaying_id }
                                        }
                                    }
                                }))
                            }
                        }
                    } catch (e) {
                        if (transactionHistories && transactionHistories.length) {
                            await WalletService.rollbackWallet(transactionHistories)
                        }
                        FutureOrder.notifyFutureError(`Thay đổi balance user ${user.id} lỗi, không đặt được lệnh`)
                        console.error(`Thay đổi balance user ${user.id} lỗi, không close được lệnh 2`, e)
                        throw Error.UNKNOWN
                    }
                }
                order.closed_at = new Date()
            } else if (order.status === this.Status.CLOSED) {
                throw Error.ORDER_ALREADY_CLOSED
            }
            await LoanService.saveLoanUser(user.id, 'remove')
            order.status = this.Status.CLOSED
            order.reason_close_code = reason_close_code
            order.reason_close = this.ReasonClose[+reason_close_code]
            if (reason_close_code === this.ReasonCloseCode.HIT_TP) {
                order.promote_program = this.getPromoteProgram(order)
            }

            try {
                if (extraOptions.requestId) {
                    const requestId = { ...order.request_id || {} }
                    requestId.close = extraOptions.requestId
                    order.request_id = requestId
                }
            } catch (e) {
                Logger.error(e)
            }
            // Update after change balance
            await FuturesOrderCacheRedis.upsertOrderRedis(order)

            if (order.metadata?.dca_order_metadata && special_mode !== this.SpecialMode.DCA_ORDER) {
                if (order.metadata.dca_order_metadata.is_main_order) {
                    for (let i = 0; i < order.metadata.dca_order_metadata.dca_order.length; i++) {
                        const element = order.metadata.dca_order_metadata.dca_order[i]
                        if (element.status === this.Status.PENDING) {
                            if (await this.checkIsProcessing(element.displaying_id)) throw Error.TOO_MANY_REQUESTS
                            await this.setIsProcessing({ displaying_id: element.displaying_id })
                            await this.addToQueue(user, 'close', {
                                displaying_id: element.displaying_id,
                                special_mode: this.SpecialMode.DCA_ORDER
                            })
                            this.removeProcessing(element.displaying_id)
                            // await this.closeOrder(user, {
                            //     displaying_id: element.displaying_id, special_mode: this.SpecialMode.DCA_ORDER
                            // })
                            order.metadata.dca_order_metadata.dca_order[i].status = this.Status.CLOSED
                        }
                    }
                } else {
                    const displayingMainOrder = order.metadata.dca_order_metadata.dca_order[0].displaying_id
                    if (await this.checkIsProcessing(displayingMainOrder)) throw Error.TOO_MANY_REQUESTS
                    await this.setIsProcessing({ displaying_id: displayingMainOrder })
                    try {
                        const mainOrder = await this.getOrderRedis(displayingMainOrder)
                        if (!mainOrder || mainOrder.status !== this.Status.ACTIVE || mainOrder.user_id !== +user.id) {
                            throw Error.NOT_FOUND_ORDER
                        }
                        for (let i = 0; i < mainOrder.metadata.dca_order_metadata.dca_order.length; i++) {
                            const element = mainOrder.metadata.dca_order_metadata.dca_order[i]
                            if (element.displaying_id === +displaying_id) {
                                mainOrder.metadata.dca_order_metadata.dca_order[i].status = this.Status.CLOSED
                                break
                            }
                        }
                        // await RedisFuturesOrderMaster.upsert_single_order(mainOrder.symbol, mainOrder.user_id, mainOrder.displaying_id, JSON.stringify(mainOrder))
                        await FuturesOrderCacheRedis.upsertOrderRedis(mainOrder)
                        await this.removeProcessing(displayingMainOrder)
                    } catch (e) {
                        if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(displayingMainOrder)
                        throw e
                    }
                }
                // Update 2
                await FuturesOrderCacheRedis.upsertOrderRedis(order)
            }

            // Add futures portfolio log
            if (needAddHistory) {
                Logger.notice('FUTURE_CLOSE_ORDER', {
                    log_type: 'FUTURE_CLOSE_ORDER',
                    ...order,
                    ...balanceLog
                })
            }

            if (order?.metadata?.partial_close_metadata?.is_main_order) {
                Logger.info('Process closing all child of order: ', order.displaying_id)
                await this.closeAllChildOrder(order.displaying_id)
                FuturesService.updateOpeningOrder({ id: user.id, user_category: order.user_category })
            } else if (order?.metadata?.partial_close_metadata?.is_market && !order.metadata?.partial_close_metadata?.is_main_order) {
                const preOrder = await this.getOrderRedis(order.metadata.partial_close_metadata?.partial_close_from)
                if (!preOrder) {
                    throw Error.NOT_FOUND_ORDER
                }
                // const mainLocker = await OrderLocker.lock(`lock_futures_order:${preOrder.displaying_id}`, 20000)
                VNDCFuturesService.putOrderLog(preOrder, {
                    ...order,
                    type: OrderLogType.PARTIAL_CLOSE,
                    closeType: order.type,
                    action_by: null
                })
                preOrder.fee *= (preOrder.order_value - order.order_value) / preOrder.order_value
                preOrder.order_value = +Big(preOrder.order_value - order.order_value).toFixed(8)
                preOrder.margin -= order.margin
                preOrder.quantity -= order.quantity
                const ids = preOrder?.metadata?.partial_close_metadata?.partial_close_orders || []
                ids.push({
                    displaying_id: order.displaying_id,
                    close_type: this.Type.MARKET,
                    status: this.Status.CLOSED,
                    close_volume: order.order_value
                })
                preOrder.fee_metadata.place_order.value -= order.fee_metadata?.place_order?.value
                preOrder.metadata = {
                    ...preOrder.metadata,
                    partial_close_metadata: { partial_close_orders: ids, is_main_order: true, total_open_fee: order.fee }
                }

                preOrder.fee_data = {
                    ...preOrder.fee_data,
                    place_order: this.cloneAndModifyObject(preOrder.fee_data?.place_order, { minusObject: order.fee_data?.place_order })
                }
                preOrder.volume_data = {
                    ...preOrder.volume_data,
                    place_order: this.cloneAndModifyObject(preOrder.volume_data?.place_order, { minusObject: order.volume_data?.place_order })
                }
                if (preOrder.fee_data) {
                    preOrder.fee = preOrder.fee_data.place_order[preOrder.margin_currency] ? preOrder.fee_data.place_order[preOrder.margin_currency] : 0
                }
                if (preOrder.funding_fee) {
                    preOrder.funding_fee = order.funding_fee
                        ? {
                            total: (preOrder.funding_fee?.total ?? 0) - (order.funding_fee?.total ?? 0),
                            balance: (preOrder.funding_fee?.balance ?? 0) - (order.funding_fee?.balance ?? 0),
                            margin: (preOrder.funding_fee?.margin ?? 0) - (order.funding_fee?.margin ?? 0)
                        } : null
                }
                // order.metadata = undefined
                // await RedisFuturesOrderMaster.upsert_single_order(preOrder.symbol, preOrder.user_id, preOrder.displaying_id, JSON.stringify(preOrder))

                if (preOrder.order_value <= 0) {
                    preOrder.status = this.Status.CLOSED
                    preOrder.reason_close = 'Normal'
                    preOrder.reason_close_code = this.ReasonCloseCode.NORMAL
                    preOrder.profit = 0
                    preOrder.closed_at = order.closed_at
                    preOrder.close_price = 0
                }

                await FuturesOrderCacheRedis.upsertOrderRedis(preOrder)

                await this.removeProcessing(preOrder.displaying_id)
                // mainLocker && await mainLocker.unlock()
            } else if (order?.metadata?.partial_close_metadata?.partial_close_from && !order?.metadata?.partial_close_metadata?.is_market && !order.metadata?.partial_close_metadata?.is_main_order) {
                const preOrder = await this.getOrderRedis(order.metadata?.partial_close_metadata?.partial_close_from)
                if (!preOrder) throw Error.NOT_FOUND_ORDER
                if (await this.checkIsProcessing(preOrder.displaying_id)) throw Error.TOO_MANY_REQUESTS
                await this.setIsProcessing({ displaying_id: preOrder.displaying_id })
                for (let i = 0; i < preOrder.metadata.partial_close_metadata.partial_close_orders.length; i++) {
                    const element = preOrder.metadata.partial_close_metadata.partial_close_orders[i]
                    if (element.displaying_id === order.displaying_id) {
                        preOrder.metadata.partial_close_metadata.partial_close_orders[i].status = this.Status.CLOSED
                        break
                    }
                }
                // await RedisFuturesOrderMaster.upsert_single_order(preOrder.symbol, preOrder.user_id, preOrder.displaying_id, JSON.stringify(preOrder))
                await FuturesOrderCacheRedis.upsertOrderRedis(preOrder)

                await this.removeProcessing(preOrder.displaying_id)
            }
            if (options.processing_close_by_condition?.current === options.processing_close_by_condition?.total) {
                NamiFuturesService.doneClosingAllOrder(user)
            }
            FuturesService.updateOpeningOrder({ id: user.id, user_category: order.user_category })
            // NamiFuturesService.updateHistoryOrder(user)

            try {
                if (reason_close_code === this.ReasonCloseCode.NORMAL && order.close_price > 0) {
                    // Order from onus
                    if (order.user_category === 1) {
                        await OnusService.pushNotificationOnus(order.user_id, {
                            type: OnusService.NotificationType.CLOSE_NORMAL,
                            arguments: [`#${order.displaying_id}`, order.close_price, order.profit, order.margin_currency === 72 ? 'VNDC' : 'USDT']
                        })
                    } else {
                        // CB7: "{side} {baseAsset}/{quoteAsset} is <b>closed 🔒</b>\nID: <b>{displayingId}</b>\nOpen price: <b>{openPrice}</b>\nClose price: <b>{closePrice}</b>\nPnL: <b>{pnl} USDT ({roe}%)</b>"
                        await NotificationService.pushNotification(
                            user.id,
                            user?.telegram_id,
                            NotificationService.Template.FUTURE_CLOSE_POSITION,
                            {
                                side: order.side === this.Side.BUY ? '🟢PUMP' : '🔴DUMP',
                                baseAsset: order?.symbol?.slice(0, -4)?.toUpperCase(),
                                quoteAsset: order?.symbol?.slice(-4)?.toUpperCase(),
                                displayingId: order.displaying_id,
                                openPrice: order.open_price,
                                closePrice: order.close_price,
                                pnl: `${+order.raw_profit >= 0 ? '+' : ''}${formatNumberToDecimal(+order.raw_profit, 4)}`,
                                roe: `${+order.raw_profit >= 0 ? '+' : ''}${formatNumberToDecimal((+order.raw_profit / +order.margin) * 100, 2)}`,
                                webAppUrl: `${process.env.NA3_WEB_APP_URL}/futures/${order.symbol}?tab=history`
                            }
                        )
                    }
                }
            } catch (e) {
                Logger.error('Push noti vndc error', e)
            }

            if (reason_close_code !== this.ReasonCloseCode.NORMAL) {
                // Notification to client
                // TODO send notification to user
                // FCM.sendToUser(user.id, 'order_closed', JSON.stringify(order))
            }
            KafkaProducer.sendMessage(NamiFuturesOrderEnum.KafkaEvent.CLOSED, order, { key: `order_${order.displaying_id}` })
            await this.removeProcessing(lock_displaying_id)
        } catch (e) {
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async closeAllOrderByLoan (user) {
        try {
            const closeOrders = await FuturesOrderCacheRedis.listOrderByUserId({ user_id: user.id })
            const listProfitCloseOrders = []
            const listLossCloseOrders = []
            for (const order of closeOrders) {
                let closeFeeCur = null
                const partnerType = order?.partner_type || 0
                if (order?.fee_metadata?.close_order) closeFeeCur = order.fee_metadata.close_order.currency
                const { feeValue: closeOrderFee, feeCurrency } = await VndcFutureFee.getFutureFee(user, {
                    walletType: WalletType.MAIN,
                    value: order.order_value,
                    symbol: order.symbol,
                    type: VndcFutureFee.Type.CLOSE_ORDER,
                    partnerType
                }, closeFeeCur)
                const closePrice = await this.getLastPrice(order.symbol, order.side)
                const rawProfit = this.calculateProfit(order.symbol, order.side, order.open_price, closePrice, order.quantity)

                let fee = order?.fee || 0
                if (feeCurrency === order.margin_currency) {
                    fee += closeOrderFee
                }
                const profit = rawProfit - fee
                if (profit > 0) {
                    listProfitCloseOrders.push({
                        displaying_id: order.displaying_id,
                        profit
                    })
                } else {
                    listLossCloseOrders.push({
                        displaying_id: order.displaying_id,
                        profit
                    })
                }
            }
            listProfitCloseOrders.sort((a, b) => b.profit - a.profit)
            listLossCloseOrders.sort((a, b) => b.profit - a.profit)
            for (let i = 0; i < listProfitCloseOrders.length; i++) {
                await this.setIsProcessing({ displaying_id: listProfitCloseOrders[i].displaying_id })
                await this.addToQueue(user, 'close', {
                    displaying_id: listProfitCloseOrders[i].displaying_id,
                    special_mode: 1,
                    is_liquidation_loan: true
                })
                await this.removeProcessing(listProfitCloseOrders[i].displaying_id)
            }
            setTimeout(async () => {
                for (let i = 0; i < listLossCloseOrders.length; i++) {
                    await this.setIsProcessing({ displaying_id: listLossCloseOrders[i].displaying_id })
                    await this.addToQueue(user, 'close', {
                        displaying_id: listLossCloseOrders[i].displaying_id,
                        special_mode: 1,
                        is_liquidation_loan: true
                    })
                    await this.removeProcessing(listLossCloseOrders[i].displaying_id)
                }
                Logger.info('closeAllOrderByLoan', user.id, listProfitCloseOrders, listLossCloseOrders)
            }, 2000)
            return closeOrders
        } catch (e) {
            Logger.error('closeAllOrderByLoanError', e?.message)
            return []
        } finally {
            await LoanService.saveLoanUser(user.id, 'remove')
        }
    }

    static async closeAllOrderByCondition (user, type, pair, product = this.Product.NAMI_APP, options) {
        const closeOrders = await this.findAllOrderByCondition(user, type, pair, product, options)
        for (let i = 0; i < closeOrders.length; i++) {
            await this.setIsProcessing({ displaying_id: closeOrders[i].displaying_id })
            await this.addToQueue(user, 'close', {
                displaying_id: closeOrders[i].displaying_id,
                processing_close_by_condition: { total: closeOrders.length, current: i + 1 }
            })
            await this.removeProcessing(closeOrders[i].displaying_id)
        }
        Logger.info('closeAllOrderByCondition', arguments, closeOrders)
        return closeOrders
    }

    static async findAllOrderByCondition (user, type, pair, product = this.Product.NAMI_APP, options) {
        const { mode } = options
        const { userCategory } = this.getFuturesProductInfo({ product })
        const { ALL, PROFIT, LOSS, PAIR, ALL_PENDING, ALL_PAIR_PENDING } = VndcFutureOrder.CloseAllOrderType
        let closeOrders = []
        const marginCurrency = this.getCurrencyFromSymbol(pair)
        const ordersRedis = (await FuturesOrderCacheRedis.listOrderByUserId({ user_id: user.id })).filter(e => e.user_category === userCategory)

        switch (type) {
            case ALL: {
                closeOrders = ordersRedis.filter(e => e.status === this.Status.ACTIVE && e.margin_currency === marginCurrency)
                break
            }
            case PROFIT:
            case LOSS: {
                const openOrders = await ordersRedis.filter(e => e.status === this.Status.ACTIVE && e.margin_currency === marginCurrency)
                for (const order of openOrders) {
                    let closeFeeCur = null
                    if (order?.fee_metadata?.close_order) closeFeeCur = order.fee_metadata.close_order.currency
                    const { feeValue: closeOrderFee, feeCurrency } = await VndcFutureFee.getFutureFee(user, {
                        walletType: WalletType.MAIN,
                        value: order.order_value,
                        symbol: order.symbol,
                        type: VndcFutureFee.Type.CLOSE_ORDER,
                        isEco: false,
                        isOnusUser: order.user_category === 1
                    }, closeFeeCur)
                    const closePrice = await this.getLastPrice(order.symbol, order.side)
                    const rawProfit = this.calculateProfit(order.symbol, order.side, order.open_price, closePrice, order.quantity)

                    let fee = order?.fee || 0
                    if (feeCurrency === order.margin_currency) {
                        fee += closeOrderFee
                    }
                    const profit = rawProfit - fee
                    if (type === PROFIT && profit > 0) {
                        closeOrders.push(order)
                    }
                    if (type === LOSS && profit <= 0) {
                        closeOrders.push(order)
                    }
                }
                break
            }
            case PAIR: {
                closeOrders = await ordersRedis.filter(e => e.status === this.Status.ACTIVE && e.symbol === pair)
                break
            }
            case ALL_PENDING: {
                closeOrders = await ordersRedis.filter(e => e.status === this.Status.PENDING && e.margin_currency === marginCurrency)
                break
            }
            case ALL_PAIR_PENDING: {
                closeOrders = await ordersRedis.filter(e => e.status === this.Status.PENDING && e.symbol === pair)
                break
            }
            default:
                throw Error.INVALID_TYPE_CLOSE_ALL_ORDER
        }

        if (mode === VndcFutureOrder.CloseAllOrderMode.INDIVIDUAL) {
            closeOrders = closeOrders.filter(e => !e.master_id)
        }

        return closeOrders.map(e => ({
            displaying_id: e.displaying_id,
            symbol: e.symbol,
            side: e.side,
            type: e.type,
            order_value: e.order_value,
            quantity: e.quantity,
            leverage: e.leverage,
            fee: e.fee,
            open_price: e.open_price,
            status: e.status,
            margin: e.margin
        }))
    }

    static async place (user, options, extraOptions = {}) {
        const DEFAULT_INPUT = {
            side: null,
            type: null,
            symbol: null,
            price: 0, // Price with limit/stop order
            quantity: 0,
            quoteQty: 0,
            useQuoteQty: false,
            margin: 0,
            leverage: 0,
            sl: 0,
            tp: 0,
            orderDca: null,
            product: 0
        }
        const _input = _.defaults(options, DEFAULT_INPUT)
        const {
            side,
            price,
            type,
            symbol,
            sl,
            tp,
            equivalent_quantity,
            equivalent_currency,
            orderDca
        } = _input
        const marginCurrency = this.getCurrencyFromSymbol(symbol)
        let { leverage, quantity, quoteQty, useQuoteQty } = _input
        const transfer_quantity = quantity
        const hold_quantity = 0
        const openTime = new Date()
        // Leverage

        if (!leverage) {
            const { [symbol]: _leverage } = await FuturesLeverage.getFutureLeverageCached(user.id, symbol)
            leverage = _leverage
        }
        const isPartialClose = _input?.metadata?.partial_close_metadata?.partial_close_from

        if (options.leverage && isPartialClose) {
            leverage = options.leverage
        }

        const lastPrice = await FuturesPrice.getBookTicker(symbol)
        if (!lastPrice) throw Error.BAD_SYMBOL
        let lastBestBid = lastPrice.bestBid
        let lastBestAsk = lastPrice.bestAsk
        if (!(lastPrice.bestBid <= lastPrice.lastPrice && lastPrice.bestAsk >= lastPrice.lastPrice)) {
            lastBestBid = lastPrice.lastPrice
            lastBestAsk = lastPrice.lastPrice
        }
        const orderValue = await this.getOrderValue(_input)
        let openPrice
        if (type === NamiFuturesOrderEnum.Type.LIMIT || type === NamiFuturesOrderEnum.Type.STOP) {
            openPrice = 0
        } else if (extraOptions._onQueuePrice != null) {
            // Get queue bid, ask
            let queueBestBid = extraOptions._onQueuePrice.bestBid
            let queueBestAsk = extraOptions._onQueuePrice.bestAsk
            if (!(extraOptions._onQueuePrice.bestBid <= extraOptions._onQueuePrice.lastPrice && extraOptions._onQueuePrice.bestAsk >= extraOptions._onQueuePrice.lastPrice)) {
                queueBestBid = extraOptions._onQueuePrice.lastPrice
                queueBestAsk = extraOptions._onQueuePrice.lastPrice
            }

            let suitablePrice
            if (extraOptions._onQueueTime) {
                suitablePrice = await this.getSuitablePrice(symbol, extraOptions._onQueueTime, Date.now(), side, true)
            }
            if (side === this.Side.BUY) {
                openPrice = Math.max(queueBestAsk, lastBestAsk)
                if (isNumber(suitablePrice) && suitablePrice > 0) {
                    openPrice = Math.max(openPrice, suitablePrice)
                }
                if (
                    extraOptions?._inFundingTime
                    && isNumber(suitablePrice) && suitablePrice > 0
                    && isNumber(extraOptions?._onQueuePrice?.bestAsk) && extraOptions?._onQueuePrice?.bestAsk > 0
                    && isNumber(extraOptions?._onQueuePrice?.lastPrice) && extraOptions?._onQueuePrice?.lastPrice > 0
                    && isNumber(lastPrice?.lastPrice) && lastPrice?.lastPrice > 0

                ) {
                    openPrice = Math.max(extraOptions?._onQueuePrice?.bestAsk, extraOptions?._onQueuePrice?.lastPrice, suitablePrice, lastPrice?.lastPrice)
                }
            } else {
                openPrice = Math.min(queueBestBid, lastBestBid)
                if (isNumber(suitablePrice) && suitablePrice > 0) {
                    openPrice = Math.min(openPrice, suitablePrice)
                }
                if (
                    extraOptions?._inFundingTime
                    && isNumber(suitablePrice) && suitablePrice > 0
                    && isNumber(extraOptions?._onQueuePrice?.bestBid) && extraOptions?._onQueuePrice?.bestBid > 0
                    && isNumber(extraOptions?._onQueuePrice?.lastPrice) && extraOptions?._onQueuePrice?.lastPrice > 0
                    && isNumber(lastPrice?.lastPrice) && lastPrice?.lastPrice > 0
                ) {
                    openPrice = Math.min(extraOptions?._onQueuePrice?.bestBid, extraOptions?._onQueuePrice?.lastPrice, suitablePrice, lastPrice?.lastPrice)
                }
            }
            Logger.info(`Price for ${extraOptions.requestId}, queue ${JSON.stringify(extraOptions._onQueuePrice)}, inFunding ${JSON.stringify(extraOptions?._inFundingTime)} , price ${JSON.stringify(lastPrice)}, suit ${suitablePrice} => ${openPrice}`)
        } else {
            let lastPrice
            if (extraOptions.price != null) {
                lastPrice = extraOptions.price
            } else {
                lastPrice = await FuturesPrice.getBookTicker(symbol)
                if (!lastPrice) throw Error.BAD_SYMBOL
            }

            let lastBestBid = lastPrice.bestBid
            let lastBestAsk = lastPrice.bestAsk
            if (!(lastPrice.bestBid <= lastPrice.lastPrice && lastPrice.bestAsk >= lastPrice.lastPrice)) {
                lastBestBid = lastPrice.lastPrice
                lastBestAsk = lastPrice.lastPrice
            }
            openPrice = side === this.Side.SELL ? lastBestBid : lastBestAsk
        }

        let assetAvailable; let assetBalance; let
            assetLock
        const userCategory = 2
        const { walletType, product } = this.getFuturesProductInfo({ userCategory })

        const wallet = await Wallet.getWallet(user.id, marginCurrency, walletType)
        assetAvailable = Math.max(+wallet.value, 0) - Math.max(+wallet.lockedValue, 0)
        assetBalance = +wallet.value
        assetLock = +wallet.lockedValue

        const promotionCategory = 0

        let ignoreBalance = false
        if (isPartialClose) {
            ignoreBalance = true
        }

        let feeWalletType = walletType
        const { partnerType, username, photoUrl } = await UserService.checkIsBot(user.id)
        const needAddHistory = true

        let { feeValue: fee, feeCurrency } = await VndcFutureFee.getFutureFee(user, {
            walletType: feeWalletType,
            symbol,
            value: orderValue,
            type: VndcFutureFee.Type.PLACE_ORDER,
            isEco: false,
            isOnusUser: userCategory === 1,
            ignoreBalance,
            partnerType,
            feeType: type === NamiFuturesOrderEnum.Type.MARKET ? VndcFutureFee.FeeType.TAKER : VndcFutureFee.FeeType.MAKER
        }, WalletCurrency.LUSDT)
        fee = !ignoreBalance ? fee : 0
        if (feeCurrency === marginCurrency) {
            feeWalletType = walletType
        }

        const feeMetaData = {
            place_order: { value: fee, currency: feeCurrency },
            close_order: { currency: feeCurrency }
        }
        const feeData = { place_order: { [feeCurrency]: fee } }
        const volumeData = { place_order: { [feeCurrency]: orderValue } }
        let margin = this.calculateMargin(orderValue, symbol, leverage)
        const maintenanceMargin = await this.calculateMaintenanceMargin(orderValue, symbol)

        if (options.margin && isPartialClose && !options?.metadata?.partial_close_metadata?.isMarket) {
            margin = options.margin
        }

        const checkBalance = feeCurrency === marginCurrency && fee > 0 ? +Big(margin).plus(fee).toFixed(8) : +Big(margin).toFixed(8)

        let maxLoanValue = 0
        let useLoan = false
        if (!isPartialClose) {
            if (((checkBalance > assetAvailable) || (checkBalance > assetBalance)) && !ignoreBalance) {
                maxLoanValue = await LoanService.getMaxLoan(user.id)
                if (checkBalance > assetAvailable + maxLoanValue) {
                    Logger.info(`User ${user.id} BALANCE_INSUFFICIENT dat lenh loi khong du so du: orderBln=${checkBalance}, avbl=${assetAvailable}, loan=${maxLoanValue}, bln=${assetBalance}`)
                    throw Error.BALANCE_INSUFFICIENT
                }
                useLoan = true
            }
            if (assetLock < -1000 && !ignoreBalance) {
                Logger.info(`User ${user.id} BALANCE_INSUFFICIENT dat lenh loi khong du so du: lock am tai khoan = ${assetLock}`)
                FutureOrder.notifyFutureError(`[VNDC Futures] lock âm tài khoản ${user.id} kiểm tra lại`)

                throw Error.BALANCE_INSUFFICIENT
            }
        }
        const newOrderId = await RedisFuturesOrderMaster.get_new_order_id()
        const transactionHistories = []
        const spinHistories = []
        let loanValue = 0
        if (!isPartialClose) {
            try {
                if (fee < 0 && type === NamiFuturesOrderEnum.Type.MARKET) {
                    // AMBASSADOR duoc cong them hoa hong vao vi usdt
                    transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, -fee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Ambassador place future order ${newOrderId} open fee`, {
                        walletType: feeWalletType,
                        metadata: {
                            source: {
                                collection: 'futureorders',
                                filter: { displaying_id: newOrderId }
                            },
                            commissionType: type === this.Type.MARKET ? 'APPROVED' : 'PENDING'
                        }
                    }))
                }
                if (fee > 0) {
                    if (feeCurrency === marginCurrency) {
                        // user thường và phí la usdt
                        if (useLoan && fee > assetAvailable) {
                            loanValue = fee - Math.max(assetAvailable, 0)
                            // lock khoản vay để trả phí
                            transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, null, loanValue, TransactionHistory.Category.FUTURE_PLACE_ORDER_LOAN_FEE, `Place future order ${newOrderId} lock loan open fee`, {
                                walletType: feeWalletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: newOrderId }
                                    },
                                    commissionType: type === this.Type.MARKET ? 'APPROVED' : 'PENDING'
                                }
                            }))
                        }
                        if (fee - loanValue > 0) {
                            // trừ phí trả bằng USDT
                            transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, (loanValue - fee), null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Place future order ${newOrderId} lock open fee`, {
                                walletType: feeWalletType,
                                metadata: {
                                    source: {
                                        collection: 'futureorders',
                                        filter: { displaying_id: newOrderId }
                                    },
                                    commissionType: type === this.Type.MARKET ? 'APPROVED' : 'PENDING'
                                }
                            }))
                        }
                    } else {
                        transactionHistories.push(await WalletService.changeBalance(user.id, feeCurrency, -fee, null, TransactionHistory.Category.FUTURE_PLACE_ORDER_FEE, `Place future order ${newOrderId} open fee`, {
                            allowNegative: true,
                            walletType: feeWalletType,
                            metadata: {
                                source: {
                                    collection: 'futureorders',
                                    filter: { displaying_id: newOrderId }
                                },
                                commissionType: type === this.Type.MARKET ? 'APPROVED' : 'PENDING'
                            }
                        }))
                    }
                }
                // lock margin
                transactionHistories.push(await WalletService.changeBalance(user.id, marginCurrency, 0, margin, TransactionHistory.Category.FUTURE_PLACE_ORDER_MARGIN, `Place future order ${newOrderId} lock margin`, {
                    walletType,
                    metadata: {
                        source: {
                            collection: 'futureorders',
                            filter: { displaying_id: newOrderId }
                        }
                    }
                }))

                // Check if invalid balance
                const afterWallet = await Wallet.getOrCreateWallet(user.id, marginCurrency, walletType)
                // {value: +value, lockedValue: +lock}
                if (afterWallet.value < -0.00001) {
                    Logger.info(`User ${user.id} BALANCE_INSUFFICIENT afterWallet.value < 0`, afterWallet)
                    throw Error.BALANCE_INSUFFICIENT
                }
            } catch (e) {
                Logger.debug('CHANGE_BALANCE_ERROR', transactionHistories, spinHistories)
                if (transactionHistories && transactionHistories.length) {
                    await WalletService.rollbackWallet(transactionHistories)
                }
                Logger.error('CHANGE_BALANCE_ERROR ', e)
                FutureOrder.notifyFutureError(`Thay đổi balance user ${user.id} lỗi, không đặt được lệnh`)
                console.error(`Thay đổi balance user ${user.id} lỗi, không close được lệnh 3`, e)
                if (e === Error.BALANCE_INSUFFICIENT) throw e
                throw Error.UNKNOWN
            }
        }
        if (useLoan) {
            await LoanService.saveLoanUser(user.id, 'add')
        }

        if (useQuoteQty && quoteQty && !options.metadata?.partial_close_metadata) {
            if (type === NamiFuturesOrderEnum.Type.MARKET) {
                quantity = +Big(orderValue).div(openPrice)
            } else {
                quantity = +Big(orderValue).div(price)
            }
        }

        if (isPartialClose) {
            openPrice = options.open_price
        }

        const orderData = {
            liquidity_broker: this.LiquidityBroker.NAMI,
            displaying_id: newOrderId,
            user_id: user.id,
            status: type === NamiFuturesOrderEnum.Type.MARKET ? (orderDca ? this.Status.CLOSED : this.Status.ACTIVE) : this.Status.PENDING,
            side,
            type,
            symbol,
            quantity,
            leverage,
            sl,
            tp,
            price,
            equivalent_quantity,
            equivalent_currency,
            transfer_quantity,
            hold_quantity,
            open_price: openPrice,
            opened_at: openTime,
            fee: feeCurrency === marginCurrency ? Math.max(loanValue, 0) : 0,
            fee_currency: marginCurrency,
            margin,
            margin_currency: marginCurrency,
            maintenance_margin: maintenanceMargin,
            order_value: orderValue,
            origin_order_value: orderValue,
            order_value_currency: marginCurrency,
            fee_metadata: feeMetaData,
            fee_data: feeData,
            volume_data: volumeData,
            request_id: extraOptions.requestId ? { place: extraOptions.requestId } : {},
            _b: !needAddHistory,
            partner_type: partnerType,
            user_category: userCategory,
            promotion_category: promotionCategory,
            swap: 0,
            created_at: openTime, // new Date(), // Nếu new Date() thì created_at sẽ muộn hơn opened_at
            updated_at: openTime, // new Date(), // Nếu new Date() thì updated_at sẽ muộn hơn opened_at
            metadata: _input.metadata ? _input.metadata : (orderDca ? {
                dca_order_metadata: {
                    dca_order: [{ displaying_id: +orderDca }],
                    is_main_order: false
                }
            } : null),
            user_metadata: {
                username,
                photo_url: photoUrl
            }
        }

        await FuturesOrderCacheRedis.upsertOrderRedis(orderData)

        KafkaProducer.sendMessage(NamiFuturesOrderEnum.KafkaEvent.CREATED, orderData, {
            key: `order_${orderData.displaying_id}` // Key để đảm bảo các message cùng key sẽ được gửi đến cùng 1 partition để đảm bảo thứ tự
        })

        if (orderDca) {
            const order = await this.getOrderRedis(+orderDca)
            if (!order || order.status != this.Status.ACTIVE) {
                throw Error.NOT_FOUND_ORDER
            }
            const preLiqPrice = await this.calculateLiqPrice(order)
            const preOrder = { ...order, liq_price: +preLiqPrice }
            if (!order.metadata?.dca_order_metadata?.dca_order) {
                order.metadata = {
                    ...order.metadata,
                    dca_order_metadata: {
                        dca_order: [{ displaying_id: orderData.displaying_id, status: orderData.status }],
                        is_main_order: true
                    }
                }
            } else {
                order.metadata.dca_order_metadata.dca_order.push({
                    displaying_id: orderData.displaying_id,
                    status: orderData.status
                })
            }
            if (orderData.type === NamiFuturesOrderEnum.Type.MARKET) {
                const config = await FuturesConfig.getOneCached({ symbol: order.symbol })
                let decimal = FutureOrder.getDecimalScale(+(_.find(config.filters, { filterType: 'PRICE_FILTER' }).tickSize))
                if (!decimal) decimal = 0
                const totalQuantity = order.quantity + orderData.quantity
                order.open_price = +((order.open_price * order.quantity + orderData.open_price * orderData.quantity) / totalQuantity).toFixed(decimal)
                const preOpenPriceToFixed = +preOrder.open_price.toFixed(decimal)
                if (order.open_price === preOpenPriceToFixed) {
                    order.open_price = +((preOrder.open_price * order.quantity + orderData.open_price * orderData.quantity) / totalQuantity).toFixed(decimal + 2)
                }
                order.margin += orderData.margin
                order.order_value += orderData.order_value
                order.quantity += orderData.quantity
                order.leverage = +(order.order_value / order.margin).toFixed()
                order.maintenance_margin = await this.calculateMaintenanceMargin(order.order_value, order.symbol)

                const now = new Date()

                if (+order.leverage > +config?.leverageConfig?.max) {
                    order.leverage = +config?.leverageConfig?.max
                }
                if (+order.leverage < +config?.leverageConfig?.min) {
                    order.leverage = +config?.leverageConfig?.min
                }

                order.last_dca = now

                if (order.fee_data) {
                    if (order.fee_data.place_order?.[feeCurrency]) {
                        order.fee_data.place_order[feeCurrency] += fee
                    } else order.fee_data.place_order[feeCurrency] = fee
                    order.fee += orderData.fee
                }
                if (order.volume_data) {
                    if (order.volume_data.place_order?.[feeCurrency]) {
                        order.volume_data.place_order[feeCurrency] += orderData.order_value
                    } else order.volume_data.place_order[feeCurrency] = orderData.order_value
                }
                orderData.closed_at = now
                orderData.reason_close = 'DCA'
                orderData.reason_close_code = this.ReasonCloseCode.DCA_ORDER
                // await RedisFuturesOrderMaster.upsert_single_order(orderData.symbol, orderData.user_id, orderData.displaying_id, JSON.stringify(orderData))
                await FuturesOrderCacheRedis.upsertOrderRedis(orderData)
            }
            // await RedisFuturesOrderMaster.upsert_single_order(order.symbol, order.user_id, order.displaying_id, JSON.stringify(order))
            await FuturesOrderCacheRedis.upsertOrderRedis(order)
            KafkaProducer.sendMessage(NamiFuturesOrderEnum.KafkaEvent.UPDATED, order, { key: `order_${order.displaying_id}` })

            const liqPrice = await this.calculateLiqPrice(order)

            if (orderData.type === NamiFuturesOrderEnum.Type.MARKET) {
                VNDCFuturesService.putOrderLog(preOrder, {
                    orderId: order.displaying_id,
                    type: OrderLogType.ADD_VOLUME,
                    order_value: order.order_value,
                    leverage: order.leverage,
                    margin: order.margin,
                    open_price: order.open_price,
                    side: orderData.side,
                    typeOrder: orderData.type,
                    fee_metadata: { place_order: orderData.fee_metadata.place_order },
                    fee_data: { place_order: orderData.fee_data.place_order },
                    liq_price: liqPrice,
                    child_id: orderData.displaying_id,
                    action_by: null
                })
            }
        }
        if (orderData.status === this.Status.ACTIVE) {
            try {
                if (userCategory === User.UserCategory.FRAME_ONUS) {
                    OnusService.pushNotificationOnus(user.id, {
                        type: orderData.side === this.Side.BUY ? OnusService.NotificationType.OPEN_BUY : OnusService.NotificationType.OPEN_SELL,
                        arguments: [orderData.type, `#${newOrderId}`, openPrice, orderData.margin_currency === 72 ? 'VNDC' : 'USDT']
                    })
                } else {
                    // CB6: "{side} {baseAsset}/{quoteAsset} is <b>filled ✅</b>\nID: {displayingId}\nOpen price: <b>{openPrice}</b>"
                    NotificationService.pushNotification(
                        user.id,
                        user?.telegram_id,
                        NotificationService.Template.FUTURE_OPEN_POSITION,
                        {
                            side: orderData.side === this.Side.BUY ? '🟢PUMP' : '🔴DUMP',
                            baseAsset: orderData?.symbol?.slice(0, -4)?.toUpperCase(),
                            quoteAsset: orderData?.symbol?.slice(-4)?.toUpperCase(),
                            displayingId: orderData.displaying_id,
                            openPrice: orderData.open_price,
                            webAppUrl: `${process.env.NA3_WEB_APP_URL}/futures/${orderData.symbol}?tab=position`
                        }
                    )
                    if (orderData.type == 'Limit') {
                        NotificationService.sendChatBotNotify({
                            template: NotificationService.Template.FUTURES_OPEN_POSITION,
                            userId: user.id,
                            context: {
                                side: orderData.side,
                                baseAsset: orderData?.symbol?.slice(0, -4)?.toUpperCase(),
                                quoteAsset: orderData?.symbol?.slice(-4)?.toUpperCase(),
                                leverage: orderData.leverage,
                                orderId: orderData.displaying_id,
                                openPrice: orderData.open_price,
                                webAppUrl: `${process.env.NA3_WEB_APP_URL}/futures/${orderData.symbol}?tab=position`,
                                time: (new Date()).toISOString()
                            }
                        })
                    }
                }
            } catch (e) {
                Logger.error('OnusService.push noti error', e)
            }
        }
        try {
            if (this.checkIsNotifyUser(orderData.user_id)) {
                SysNoti.notify(`👏 Người dùng: ${orderData.user_id} vừa mở vị thế #${orderData.displaying_id} ${orderData.side} ${orderData.type} ${orderData.symbol} khối lượng ${(orderData.order_value || 0).toLocaleString()} tại giá ${(orderData.open_price || 0).toLocaleString()}`, {
                    toSlackFuture: true,
                    toSlackMention: [SysNoti.SlackUserID.DEV_TRUNGND]
                }).catch()
            }
        } catch (e) {
            Logger.error('Notify futures user error', e)
        }

        if (needAddHistory) {
            Logger.notice('FUTURE_PLACE_ORDER', { log_type: 'FUTURE_PLACE_ORDER', ...orderData })
        }

        if (isPartialClose) {
            try {
                const order = await this.getOrderRedis(orderData.metadata.partial_close_metadata.partial_close_from)
                const ids = order.metadata?.partial_close_metadata?.partial_close_orders ? order.metadata.partial_close_metadata.partial_close_orders : []
                ids.push({
                    displaying_id: orderData.displaying_id,
                    close_type: orderData.type,
                    status: VndcFutureOrder.Status.PENDING,
                    close_volume: orderData.order_value
                })
                order.metadata = {
                    ...order.metadata,
                    partial_close_metadata: { partial_close_orders: ids, is_main_order: true, total_open_fee: order.fee }
                }
                // console.log('ORDER____', order.metadata.partial_close_metadata.partial_close_orders)
                // await RedisFuturesOrderMaster.upsert_single_order(order.symbol, order.user_id, order.displaying_id, JSON.stringify(order))
                await FuturesOrderCacheRedis.upsertOrderRedis(order)
            } catch (error) {
                console.error('Error in place queue', error)
            }
        }
        // Process socket
        FuturesService.updateOpeningOrder({ id: user.id, user_category: userCategory })
        FuturesService.setRecentTrade({
            displaying_id: orderData.displaying_id,
            username,
            photo_url: photoUrl,
            symbol: orderData.symbol,
            side: orderData.side,
            order_value: orderData.order_value
        })
        // NamiFuturesService.updateHistoryOrder(user);
    }

    static cloneAndModifyObject (object, { rate, minusObject }) {
        if (!object) return {}
        const clone = _.cloneDeep(object)
        if (rate) {
            Object.keys(clone).forEach(key => {
                if (key !== '$init') clone[key] = +Big((clone[key]) * rate).toFixed(8)
            })
        }
        if (minusObject) {
            Object.keys(clone).forEach(key => {
                if (key !== '$init') clone[key] = +Big(clone[key] - minusObject[key]).toFixed(8)
            })
        }
        return clone
    }

    static async partialCloseOrder (user, options = {}, extraOptions = {}) {
        let locker
        const { displaying_id, closeVolume, closeQuantity, price, closeType, useQuoteQty = false } = options
        const lock_displaying_id = options.displaying_id
        try {
            const _options = _.defaults(options, {
                displaying_id: null,
                reason_close_code: this.ReasonCloseCode.NORMAL,
                special_mode: this.SpecialMode.NORMAL
            })
            const order = await this.getOrderRedis(displaying_id)
            if (!order || order.user_id !== user.id) throw Error.NOT_FOUND_ORDER
            if (order.order_value < 0) throw Error.NOT_FOUND_ORDER

            const filterStatus = await this.filterOrderInput({
                user_id: user.id,
                side: order.side === "Buy" ? "Sell" : "Buy",
                type: closeType,
                symbol: order.symbol,
                price,
                quantity: closeQuantity,
                quoteQty: closeVolume,
                useQuoteQty
            })
            if (filterStatus) throw filterStatus
            if (closeType === 'Market') {
                await this.processMarketPartialCloseOrder(user, order, options, extraOptions)
            } else {
                const orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id: user.id })
                const countOrders = orders?.filter(e => +e.user_category === +order.user_category)?.length ?? 0
                if (countOrders >= 50) throw Error.MAX_NUM_ORDERS
                await this.processLimitOrStopPartialCloseOrder(user, order, {
                    price,
                    closeVolume,
                    closeQuantity,
                    closeType,
                    useQuoteQty
                })
            }

            await this.removeProcessing(lock_displaying_id)
        } catch (e) {
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        }
    }

    static async processMarketPartialCloseOrder (user, order, { closeVolume, closeQuantity, actionBy }, extraOptions) {
        const lock_displaying_id = order.displaying_id
        let locker
        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject partialCloseMarket Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }
        // const newOrderId = await Counter.getCount(Counter.Name.FUTURE_ORDER_COUNTER)
        const newOrderId = await RedisFuturesOrderMaster.get_new_order_id()
        const rate = closeVolume / order.order_value

        try {
            locker = await OrderLocker.lock(`lock_futures_order:${order.displaying_id}`, 20000)

            const clone = {
                ...order,
                _id: undefined,
                tp: undefined,
                sl: undefined,
                fee: 0,
                type: this.Type.MARKET,
                symbol: order.symbol,
                user_id: order.user_id,
                user_category: order.user_category,
                side: order.side === this.Side.BUY ? this.Side.SELL : this.Side.BUY,
                displaying_id: newOrderId,
                order_value: +Big(closeVolume).toFixed(8) || +Big(closeQuantity * order.order_value).toFixed(8),
                margin: +Big(rate * order.margin),
                quantity: closeQuantity || +Big(closeVolume).div(order.open_price),
                metadata: {
                    partial_close_metadata: {
                        partial_close_from: order.displaying_id,
                        is_market: true,
                        is_main_order: false,
                        total_open_fee: order.fee
                    }
                },
                opened_at: new Date().toISOString(),
                reason_close: 'PARTIAL CLOSE',
                reason_close_code: this.ReasonCloseCode.PARTIAL_CLOSE,
                created_at: new Date().toISOString(),
                fee_metadata: {
                    ...order.fee_metadata,
                    place_order: {
                        value: +Big(rate * order?.fee_metadata?.place_order?.value),
                        currency: order.fee_metadata?.place_order?.currency
                    }
                },
                fee_data: { place_order: this.cloneAndModifyObject(order.fee_data?.place_order, { rate }) },
                volume_data: { place_order: this.cloneAndModifyObject(order.volume_data?.place_order, { rate }) },
                funding_fee: order.funding_fee
                    ? {
                        total: (order.funding_fee?.total ?? 0) * rate,
                        balance: (order.funding_fee?.balance ?? 0) * rate,
                        margin: (order.funding_fee?.margin ?? 0) * rate
                    } : {
                        total: 0,
                        balance: 0,
                        margin: 0
                    },
                action_by: actionBy
            }

            const originOrder = await this.getOrderRedis(order.displaying_id)
            const newVolume = originOrder.order_value - clone.order_value
            if (newVolume < 0) throw Error.INVALID_CLOSE_VOLUME
            clone.fee = clone.fee_data.place_order[order.margin_currency] ? clone.fee_data.place_order[order.margin_currency] : 0
            // const totalOpenedValue = await this.sumTotalLimitPartialCloseOrders(order.user_id, order.displaying_id)
            // if ((totalOpenedValue + clone.order_value) > order.order_value) throw Error.INVALID_CLOSE_VOLUME

            // await FuturesOrderCacheRedis.upsertOrderRedis(clone)
            await this.closeOrder(user, clone, extraOptions)
            await this.removeProcessing(lock_displaying_id)
        } catch (e) {
            Logger.error('partial_market_close_order_error', e)
            // if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async processLimitOrStopPartialCloseOrder (user, order, {
        price,
        closeVolume,
        closeQuantity,
        closeType,
        useQuoteQty = false
    }) {
        const lock_displaying_id = order.displaying_id
        let locker
        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject partialCloseLimit Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }
        try {
            locker = await OrderLocker.lock(`lock_futures_order:${order.displaying_id}`, 20000)
            const rate = +Big(closeVolume).div(order.order_value)
            const clone = {
                // displaying_id: newOrderId,
                price,
                symbol: order.symbol,
                leverage: order.leverage,
                order_value: closeVolume || closeQuantity * +Big(order.open_price),
                quantity: closeQuantity || +Big(closeVolume).div(order.open_price),
                type: closeType,
                side: order.side === this.Side.BUY ? this.Side.SELL : this.Side.BUY,
                metadata: {
                    partial_close_metadata: {
                        partial_close_from: order.displaying_id,
                        is_market: false,
                        is_main_order: false,
                        total_open_fee: order.fee
                    }
                },
                margin: rate * order.margin,
                open_price: order.open_price,
                useQuoteQty,
                quoteQty: useQuoteQty ? closeVolume : undefined,
                reason_close_code: this.ReasonCloseCode.PARTIAL_CLOSE,
                product: +order.user_category === User.UserCategory.FRAME_NAMI ? this.Product.FRAME_NAMI : null
            }
            const totalOpenedValue = await this.sumTotalLimitPartialCloseOrders(order.user_id, order.displaying_id)
            if ((totalOpenedValue + clone.order_value) > order.order_value) throw Error.INVALID_CLOSE_VOLUME
            const result = await this.addToQueue(user, 'place', clone)
            if (!result) throw Error.SERVICE_UNAVAILABLE
            FuturesService.updateOpeningOrder({ id: user.id, user_category: order.user_category })
        } catch (e) {
            Logger.error('partial_limit_close_order_error', e)
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async sumTotalLimitPartialCloseOrders (user_id, displaying_id) {
        try {
            const orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id })
            return _.sumBy(orders, o => (o?.metadata?.partial_close_metadata?.partial_close_from === displaying_id && o.status === this.Status.PENDING ? o.order_value : 0))
        } catch (error) {
            console.log(error)
            throw Error.INVALID_CLOSE_VOLUME
        }
    }

    static async modifyOrder (user, options = {}) {
        let locker
        const lock_displaying_id = options.displaying_id
        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject modifyOrder Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }
        try {
            const _options = _.defaults(options, { displaying_id: null, sl: 0, tp: 0, price: 0 })
            locker = await OrderLocker.lock(`lock_futures_order:${_options.displaying_id}`, 20000)
            const { displaying_id, sl, tp, price } = _options
            const order = await this.getOrderRedis(displaying_id)
            if (!order) throw Error.NOT_FOUND_ORDER
            const marginCurrency = order.margin_currency
            const preOrder = { ...order }
            const filterInput = await this.filterModifyOrderInput({
                ..._options,
                price: price > 0 ? price : order.price,
                sl: sl ? (sl > 0 ? sl : order.sl) : null,
                tp: tp ? (tp > 0 ? tp : order.tp) : null,
                user_id: order.user_id,
                order
            })
            if (filterInput) throw filterInput
            if (+_options.sl > 0 && +_options.sl !== +order.sl) {
                order.sl = _options.sl
            }
            if (!_options.sl) order.sl = null
            if (+_options.tp > 0 && +_options.tp !== +order.tp) {
                order.tp = _options.tp
            }
            if (!_options.tp) order.tp = null
            // await RedisFuturesOrderMaster.upsert_single_order(order.symbol, order.user_id, order.displaying_id, JSON.stringify(order))
            await FuturesOrderCacheRedis.upsertOrderRedis(order)
            // Sync dữ liệu vào mongo

            await VNDCFuturesService.putOrderLog(preOrder, {
                orderId: order.displaying_id,
                type: OrderLogType.MODIFY,
                price: order.price,
                sl: order.sl,
                tp: order.tp,
                action_by: options.action_by ? 'master' : null
            })

            const needAddHistory = true
            if (needAddHistory) {
                Logger.notice('FUTURE_MODIFY_ORDER', { log_type: 'FUTURE_MODIFY_ORDER', ...order })
            }

            KafkaProducer.sendMessage(NamiFuturesOrderEnum.KafkaEvent.UPDATED, order, { key: `order_${order.displaying_id}` })
            await this.removeProcessing(lock_displaying_id)
            FuturesService.updateOpeningOrder({ id: order.user_id, user_category: order.user_category })
        } catch (e) {
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async editMarginOrder (user, options = {}) {
        let locker
        const lock_displaying_id = options.displaying_id

        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject editMarginOrder Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }

        try {
            const _options = _.defaults(options, { displaying_id: null, margin_change: 0, type: null })
            locker = await OrderLocker.lock(`lock_futures_order:${_options.displaying_id}`, 20000)

            const { displaying_id, margin_change_rate, type } = _options
            let { margin_change } = _options

            if (type !== FuturesOrderEnum.EditMarginType.ADD) throw Error.REMOVE_FUTURES_MARGIN_INVALID_AMOUNT
            if (!margin_change_rate && (margin_change <= 0 || (type !== FuturesOrderEnum.EditMarginType.ADD && type !== FuturesOrderEnum.EditMarginType.REMOVE))) {
                throw Error.REMOVE_FUTURES_MARGIN_INVALID_AMOUNT
            }
            const order = await this.getOrderRedis(displaying_id)
            if (!order) throw Error.NOT_FOUND_ORDER

            if (margin_change_rate) {
                margin_change = +Big(order.margin).times(margin_change_rate).toFixed(8)
            }

            const { walletType, product } = this.getFuturesProductInfo({ userCategory: order.user_category })
            const marginCurrency = order.margin_currency
            const preOrder = { ...order }

            let limitProfitRate = -80
            let limitMarginRate = 20
            if (order.leverage > 1 && order.leverage <= 5) {
                limitProfitRate = -75
                limitMarginRate = 25
            }
            if (order.leverage > 5 && order.leverage <= 10) {
                limitProfitRate = -70
                limitMarginRate = 30
            }
            if (order.leverage > 10 && order.leverage <= 15) {
                limitProfitRate = -60
                limitMarginRate = 40
            }
            if (order.leverage > 15 && order.leverage <= 25) {
                limitProfitRate = -50
                limitMarginRate = 50
            }
            if (order.leverage > 25 && type === FuturesOrderEnum.EditMarginType.REMOVE) throw Error.MODIFY_FUTURES_MARGIN_INVALID_LEVERAGE

            if (!order.initial_margin) {
                order.initial_margin = order.order_value / order.leverage
            }

            // Chi cho phep sua margin khi lenh da active :D ok
            if (order.status !== this.Status.ACTIVE) {
                throw Error.INVALID_ORDER_STATUS
            }
            if (type === FuturesOrderEnum.EditMarginType.ADD) {
                const checkassetAvailable = +margin_change
                const assetAvailable = await Wallet.getAvailable(order.user_id, marginCurrency, walletType)
                if (assetAvailable < checkassetAvailable) throw Error.BALANCE_INSUFFICIENT

                order.margin += +margin_change
            }
            if (type === FuturesOrderEnum.EditMarginType.REMOVE) {
                if (order.margin <= margin_change) throw Error.REMOVE_FUTURES_MARGIN_INVALID_AMOUNT
                const ticker = await FuturesPrice.getTicker(order.symbol)
                const { ap: ask, bp: bid } = ticker
                const refClosePrice = order.side === FutureOrder.Side.SELL ? ask : bid
                const profit = order.side === FutureOrder.Side.SELL ? (order.open_price - refClosePrice) * order.quantity : (refClosePrice - order.open_price) * order.quantity
                if (margin_change_rate) {
                    order.margin -= +Big(order.margin).times(margin_change_rate).toFixed(8)
                } else {
                    order.margin -= +margin_change
                }
                const orderValueVndc = order.quantity * refClosePrice
                let closeFeeCur = null
                if (order.fee_metadata.close_order) closeFeeCur = order.fee_metadata.close_order.currency
                const {
                    feeValue: closeOrderFee,
                    feeCurrency: closeFeeCurrency
                } = await VndcFutureFee.getFutureFee({ id: order.user_id }, {
                    walletType,
                    value: orderValueVndc,
                    symbol: order.symbol,
                    type: VndcFutureFee.Type.CLOSE_ORDER,
                    isEco: false,
                    isOnusUser: order.user_category === 1
                }, closeFeeCur)
                let totalFee = order.fee
                if (closeFeeCurrency === order.margin_currency) {
                    totalFee += closeOrderFee
                }
                // check profit rate
                const profitRate = ((profit - totalFee) / +order.margin) * 100
                Logger.info('Profit rate when modify margin: ', options, profitRate)
                if (profitRate <= limitProfitRate) throw Error.REMOVE_FUTURES_MARGIN_INVALID_PROFIT_RATIO
                // check margin rate
                const marginRate = (+order.margin / +order.initial_margin) * 100
                if (marginRate < limitMarginRate) throw Error.REMOVE_FUTURES_MARGIN_INVALID_PROFIT_RATIO
            }

            const transactionHistories = []
            try {
                if (type === FuturesOrderEnum.EditMarginType.ADD) {
                    transactionHistories.push(await WalletService.changeBalance(order.user_id, order.margin_currency, 0, margin_change, TransactionHistory.Category.FUTURE_PLACE_ORDER_MARGIN, `Modify order ${order.displaying_id} add margin`, {
                        walletType,
                        metadata: {
                            source: {
                                collection: 'futureorders',
                                filter: { displaying_id: order.displaying_id }
                            }
                        }
                    }))
                }
                if (type === FuturesOrderEnum.EditMarginType.REMOVE) {
                    transactionHistories.push(await WalletService.changeBalance(order.user_id, order.margin_currency, 0, -margin_change, TransactionHistory.Category.FUTURE_PLACE_ORDER_MARGIN, `Modify order ${order.displaying_id} remove margin`, {
                        walletType,
                        metadata: {
                            source: {
                                collection: 'futureorders',
                                filter: { displaying_id: order.displaying_id }
                            }
                        }
                    }))
                }
            } catch (e) {
                if (transactionHistories && transactionHistories.length) {
                    await WalletService.rollbackWallet(transactionHistories)
                }

                FutureOrder.notifyFutureError(`Thay đổi balance user ${order.user_id} lỗi, không thay đổi ký quỹ`)
                console.error(`Thay đổi balance user ${order.user_id} lỗi, không thay đổi ký quỹ 4`, e)
                throw Error.UNKNOWN
            }

            // await RedisFuturesOrderMaster.upsert_single_order(order.symbol, order.user_id, order.displaying_id, JSON.stringify(order))
            await FuturesOrderCacheRedis.upsertOrderRedis(order)

            await VNDCFuturesService.putOrderLog(preOrder, {
                orderId: order.displaying_id,
                type: OrderLogType.MODIFY_MARGIN,
                margin: order.margin,
                action_by: margin_change_rate ? 'master' : null
            })

            const needAddHistory = true
            if (needAddHistory) {
                Logger.notice('FUTURE_EDIT_MARGIN', { log_type: 'FUTURE_EDIT_MARGIN', ...order })
            }

            await this.removeProcessing(lock_displaying_id)
            FuturesService.updateOpeningOrder({ id: order.user_id, user_category: order.user_category })
        } catch (e) {
            Logger.error('modify_margin_error', e)
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async changeFeeCurrencyOrder (user, options = {}) {
        let locker
        const lock_displaying_id = options.displaying_id

        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject changeFeeCurrencyOrder Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }

        try {
            const _options = _.defaults(options, { displaying_id: null, currency_change: 'vndc', set_default: false })
            locker = await OrderLocker.lock(`lock_futures_order:${_options.displaying_id}`, 20000)
            const { displaying_id, currency_change, set_default } = _options
            const order = await this.getOrderRedis(displaying_id)
            const { walletType } = this.getFuturesProductInfo({ userCategory: order.user_category })
            if (!order) {
                throw Error.NOT_FOUND_ORDER
            }
            const preOrder = { ...order }

            // Chi cho phep sua fee currency khi lenh dang mo
            if (order.status !== this.Status.ACTIVE && order.status !== this.Status.PENDING) {
                throw Error.INVALID_ORDER_STATUS
            }
            const AssetIds = { nao: WalletCurrency.NAO, nami: 1, vndc: WalletCurrency.VNDC, usdt: WalletCurrency.USDT, vnst: WalletCurrency.VNST }
            if (['vndc', 'usdt', 'vnst'].includes(currency_change)) {
                if (!order.symbol.endsWith(currency_change.toUpperCase())) throw Error.INVALID_FEE_CURRENCY
            }
            if (!(AssetIds[currency_change] > 0)) throw Error.INVALID_FEE_CURRENCY
            const balance = await Wallet.getAvailable(+user.id, AssetIds[currency_change], walletType)
            const config = await AssetConfig.getOneCached({ assetCode: currency_change.toUpperCase() })
            if (config) {
                console.log(config)
                console.log(balance)
                if (!balance || +balance <= 10 ** (-(+config.assetDigit))) throw Error.NOT_ENOUGH_BASE_ASSET
            }
            order.fee_metadata = { ...order.fee_metadata, close_order: { currency: AssetIds[currency_change] } }

            // await RedisFuturesOrderMaster.upsert_single_order(order.symbol, order.user_id, order.displaying_id, JSON.stringify(order))
            await FuturesOrderCacheRedis.upsertOrderRedis(order)

            // await VNDCFuturesService.putOrderLog(preOrder, {
            //     orderId: order.displaying_id,
            //     type: OrderLogType.MODIFY_FEE_CURRENCY,
            //     fee_metadata: order.fee_metadata
            // })

            // TODO
            if (set_default) {
                // let key = +order.user_category === User.UserCategory.FRAME_NAMI ? 'onus_futures_frame_fee_token' : 'nami_futures_vndc_fee_token'
                // if (order.symbol.endsWith('USDT')) {
                //     if (!AcceptFeeCurrencyUsdt.includes(currency_change)) throw Error.INVALID_FEE_CURRENCY
                //     key = +order.user_category === User.UserCategory.FRAME_NAMI ? 'onus_futures_usdt_frame_fee_token' : 'nami_futures_usdt_fee_token'
                // } else if (order.symbol.endsWith('VNST')) {
                //     if (!AcceptFeeCurrencyVnst.includes(currency_change)) throw Error.INVALID_FEE_CURRENCY
                //     key = +order.user_category === User.UserCategory.FRAME_NAMI ? 'onus_futures_vnst_frame_fee_token' : 'nami_futures_vnst_fee_token'
                // }
                // else if (!AcceptFeeCurrency.includes(currency_change)) throw Error.INVALID_FEE_CURRENCY

                // VNDC USDT VNST
                const asset = order?.symbol?.slice(-4)?.toUpperCase()

                let key = VndcFutureFee.Key.FRAME.VNDC
                if (+order.user_category === User.UserCategory.FRAME_NAMI) {
                    if (!VndcFutureFee.ValidCurrency.FRAME[asset].includes(currency_change)) {
                        throw Error.INVALID_FEE_CURRENCY
                    }
                    key = VndcFutureFee.Key.FRAME[asset]
                } else {
                    if (!VndcFutureFee.ValidCurrency.NAMI[asset].includes(currency_change)) {
                        throw Error.INVALID_FEE_CURRENCY
                    }
                    key = VndcFutureFee.Key.NAMI[asset]
                }
                if (user) {
                    await UserPreferencesServices.set(+user.id, key, currency_change)
                }
            }

            const needAddHistory = true
            if (needAddHistory) {
                Logger.notice('FUTURE_CHANGE_FEE_CURRENCY', { log_type: 'FUTURE_CHANGE_FEE_CURRENCY', ...order })
            }

            await this.removeProcessing(lock_displaying_id)
            FuturesService.updateOpeningOrder({ id: user.id, user_category: order.user_category })
        } catch (e) {
            Logger.error('modify_fee_currency', e)
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async closeAllChildOrder (displaying_id) {
        try {
            const mainOrder = await this.getOrderRedis(displaying_id)
            if (!mainOrder) {
                throw Error.NOT_FOUND_ORDER
            }
            for (let i = 0; i < mainOrder?.metadata?.partial_close_metadata?.partial_close_orders?.length; i++) {
                const element = mainOrder.metadata.partial_close_metadata.partial_close_orders[i]
                const orderPartialClose = await this.getOrderRedis(element.displaying_id)
                if (!orderPartialClose) {
                    continue
                }

                await FuturesOrderCacheRedis.upsertOrderRedis({
                    ...orderPartialClose,
                    status: 2,
                    closed_at: new Date(),
                    reason_close_code: 0
                })
            }
            const ids = mainOrder.metadata?.partial_close_metadata?.partial_close_orders ? mainOrder.metadata.partial_close_metadata.partial_close_orders : []
            ids.map(e => {
                e.status = 2
                return e
            })
            mainOrder.metadata = {
                ...mainOrder.metadata,
                partial_close_metadata: { partial_close_orders: ids, is_main_order: true, total_open_fee: mainOrder.fee }
            }
            // await RedisFuturesOrderMaster.upsert_single_order(mainOrder.symbol, mainOrder.user_id, mainOrder.displaying_id, JSON.stringify(mainOrder))

            await FuturesOrderCacheRedis.upsertOrderRedis(mainOrder)
        } catch (error) {
            Logger.error('Error at closeAllChildOrder', error)
        }
    }

    static async dcaOrder (user, input, order) {
        const DEFAULT_INPUT = {
            displaying_id: null,
            type: null,
            leverage: null,
            quantity: 0,
            quoteQty: 0,
            useQuoteQty: false,
            price: 0,
            sl: 0,
            tp: 0,
            product: this.getFuturesProductInfo({ userCategory: order.user_category }).product
        }
        const _input = _.defaults(input, DEFAULT_INPUT)
        const { displaying_id, type, price, sl, tp } = _input
        let { leverage, quantity, quoteQty, useQuoteQty } = _input
        let locker
        if (!displaying_id) {
            throw Error.NOT_FOUND_ORDER
        }
        const lock_displaying_id = displaying_id

        const lastReasonClose = await this.checkFuturesLock(lock_displaying_id)
        if (lastReasonClose) {
            Logger.error(`lock_futures_order_reject dcaOrder Lệnh #${lock_displaying_id} đang xử lý ${this.ReasonCloseCodeText[lastReasonClose]}`)
            throw Error.PROCESSING_FUTURES_ORDER
        }

        try {
            locker = await OrderLocker.lock(`lock_futures_order:${_input.displaying_id}`, 20000)
            if (!order || order.status !== this.Status.ACTIVE) {
                throw Error.NOT_FOUND_ORDER
            }
            const preOrder = { ...order }
            if (type !== NamiFuturesOrderEnum.Type.LIMIT && type !== NamiFuturesOrderEnum.Type.MARKET && type !== NamiFuturesOrderEnum.Type.STOP) throw Error.INVALID_ORDER_TYPE

            if (leverage) {
                const config = await FuturesConfig.getOneCached({ symbol: order.symbol })
                if (!config) throw Error.BAD_SYMBOL
                if (!(config && config.status === "TRADING")) throw Error.TRADE_NOT_ALLOWED
                if (config.leverageConfig.max < +leverage || config.leverageConfig.min > +leverage || !+leverage) {
                    throw Error.INVALID_LEVERAGE
                }
            }
            if (!leverage) {
                leverage = order.leverage
            }
            const orderValue = await this.getOrderValue(input)
            const marginAdd = orderValue / leverage

            const filterError = await this.precheckPlaceOrder(user, {
                ...input,
                side: order.side,
                symbol: order.symbol,
                leverage,
                margin: marginAdd
            })
            if (filterError) throw filterError

            delete input.displaying_id
            await this.addToQueue(user, 'place', {
                ...input,
                side: order.side,
                symbol: order.symbol,
                leverage,
                margin: marginAdd,
                orderDca: displaying_id,
                product: this.getFuturesProductInfo({ userCategory: order.user_category }).product
            })

            const needAddHistory = true
            if (needAddHistory) {
                Logger.notice('FUTURE_DCA_ORDER', { log_type: 'FUTURE_DCA_ORDER', ...order })
            }

            await this.removeProcessing(lock_displaying_id)
            FuturesService.updateOpeningOrder({ id: user.id, user_category: order.user_category })
        } catch (e) {
            Logger.error('dca_order_error', e)
            if (e !== Error.TOO_MANY_REQUESTS) await this.removeProcessing(lock_displaying_id)
            throw e
        } finally {
            locker && await locker.unlock()
        }
    }

    static async getOrderValue (options) {
        // Get order value when create order
        const { symbol, type, side, price, quantity, quoteQty, useQuoteQty } = options
        // Tinh gia tri theo usdt

        if (useQuoteQty) {
            return quoteQty
        }
        if (type === NamiFuturesOrderEnum.Type.LIMIT || type === NamiFuturesOrderEnum.Type.STOP) {
            return price * quantity
        }
        const currentPrice = await FuturesPrice.getBookTicker(symbol)
        const { bestBid: bid, bestAsk: ask } = currentPrice
        price = side === this.Side.BUY ? ask : bid

        return price * quantity
    }

    static calculateMargin (orderValue, symbol, leverage) {
        if (leverage > 0) {
            return +Big(orderValue)
                .div(leverage)
                .toFixed(8)
        }
        return 0
    }

    static async calculateMaintenanceMargin (orderValue, symbol) {
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL
        if (!(config && config.status === "TRADING")) throw Error.TRADE_NOT_ALLOWED
        const maxLeverage = config?.leverageConfig?.max
        if (!maxLeverage) throw Error.INVALID_LEVERAGE
        const mmr = getMMR(+maxLeverage)
        if (mmr > 0) {
            return +Big(orderValue)
                .times(mmr)
                .toFixed(8)
        }
        return 0
    }

    static async getLastPrice (symbol, side) {
        const priceTicker = await FuturesPrice.getBookTicker(symbol)
        if (!priceTicker) throw Error.PRICE_CHANGED

        let tickerBestBid = priceTicker.bestBid
        let tickerBestAsk = priceTicker.bestAsk
        if (!(priceTicker.bestBid <= priceTicker.lastPrice && priceTicker.bestAsk >= priceTicker.lastPrice)) {
            tickerBestBid = priceTicker.lastPrice
            tickerBestAsk = priceTicker.lastPrice
        }
        return (side === this.Side.BUY ? tickerBestBid : tickerBestAsk)
    }

    static calculateProfit (symbol, side, openPrice, closePrice, quantity) {
        let buyProfit = 0
        let rawProfit = 0
        buyProfit = quantity * (closePrice - openPrice)
        rawProfit = side === this.Side.BUY ? buyProfit : -buyProfit
        return rawProfit
    }

    static async calculateLiqPrice (order) {
        const feeRate = 0.0006
        const { symbol, side, quantity, open_price, fee, margin, swap, opened_at } = order
        let swapFee = 0
        if (new Date(opened_at).getTime() > new Date('2022-09-08T04:00:00.000Z').getTime()) {
            swapFee = swap || 0
        }
        const i = side === this.Side.BUY ? 1 : -1
        let liqPrice = 0
        const config = await FuturesConfig.getOneCached({ symbol })

        let decimal = FutureOrder.getDecimalScale(+(_.find(config.filters, { filterType: 'PRICE_FILTER' }).tickSize))
        if (!decimal) decimal = 0
        liqPrice = (i * quantity * open_price + fee + swapFee - margin) / (quantity * (i - feeRate))
        liqPrice = +liqPrice.toFixed(decimal)
        return liqPrice
    }

    static getOrderValueWithPrice (symbol, quantity, price) {
        return quantity * price
    }

    static async getFilter (symbol, filterType) {
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL

        const filter = _.find(config.filters, { filterType })
        return filter
    }

    static async getOrderDetail (user, orderId) {
        const redisOrder = await this.getOrderRedis(orderId)
        let [orderDetail] = await FutureOrderMongo.aggregate([{
            $match: {
                displaying_id: parseInt(orderId, 10),
                user_id: user.id
            }
        }, {
            $lookup: {
                from: 'futuresorderlogs',
                localField: 'displaying_id',
                foreignField: 'orderId',
                as: "futuresorderlogs"
            }
        }, { $limit: 1 }]).read('s')
        if (redisOrder && orderDetail) {
            orderDetail = { ...orderDetail, ...redisOrder }
        }

        return orderDetail
    }

    static async getOrderById (orderId) {
        const redisOrder = await this.getOrderRedis(orderId)
        let [orderDetail] = await FutureOrderMongo.aggregate([
            { $match: { displaying_id: parseInt(orderId, 10) } }, { $limit: 1 }]).read('s')
        if (redisOrder && orderDetail) {
            orderDetail = { ...orderDetail, ...redisOrder }
        }

        return orderDetail
    }

    static async getSuitablePrice (_symbol, _from, _to, side, isOpen) {
        const symbol = _symbol.replace('VNST', 'VNDC')
        const fromDate = new Date(_from)
        fromDate.setMilliseconds(0)
        const toDate = new Date(_to)
        toDate.setMilliseconds(0)
        const from = fromDate.getTime()
        const to = toDate.getTime() + 1000
        const data = await RedisStreamCache.zrangebyscore('vndc_futures:book_ticker:history', from, to)
        let result
        let resultOpposite
        data.forEach(_piece => {
            try {
                const piece = JSON.parse(_piece)
                if (!piece[symbol]) {
                    return
                }
                const priceData = piece[symbol]
                if (priceData?.last_update > 0 && (priceData?.first_update < _from || priceData?.last_update > (_to + 500))) {
                    return
                }

                const sAskHigh = priceData.priceHigh
                const sAskLow = priceData.priceLow
                const sBidHigh = priceData.priceHigh
                const sBidLow = priceData.priceLow

                if (isOpen) {
                    if (side === FutureOrder.Side.BUY) {
                        result = result != null ? Math.max(result, sAskHigh) : sAskHigh
                        resultOpposite = resultOpposite != null ? Math.min(resultOpposite, sAskLow) : sAskLow
                    } else {
                        result = result != null ? Math.min(result, sBidLow) : sBidLow
                        resultOpposite = resultOpposite != null ? Math.max(resultOpposite, sBidHigh) : sBidHigh
                    }
                } else if (side === FutureOrder.Side.BUY) {
                    result = result != null ? Math.min(result, sBidLow) : sBidLow
                    resultOpposite = resultOpposite != null ? Math.max(resultOpposite, sBidHigh) : sBidHigh
                } else {
                    result = result != null ? Math.max(result, sAskHigh) : sAskHigh
                    resultOpposite = resultOpposite != null ? Math.min(resultOpposite, sAskLow) : sAskLow
                }
            } catch (e) {
                console.error(e)
            }
        })

        const finalResult = result
        Logger.info('Suitable price', side, symbol, from, to, isOpen, result, resultOpposite, ' => ', finalResult)
        return finalResult
    }

    static async checkIsProcessing (displaying_id) {
        try {
            const isProcessing = await Redis.get(`vndc-future-processing:${displaying_id}`)
            return isProcessing && +isProcessing === 1
        } catch (e) {
            return false
        }
    }

    static async setIsProcessing (order) {
        return Redis.setex(`vndc-future-processing:${order.displaying_id}`, 12, 1)
    }

    static async removeProcessing (displaying_id) {
        return Redis.del(`vndc-future-processing:${displaying_id}`)
    }

    static async checkRequestIsProcessing (key) {
        try {
            const isProcessing = await Redis.get(`request-processing:${key}`)
            return isProcessing && +isProcessing === 1
        } catch (e) {
            return false
        }
    }

    static async setRequestProcessing (key) {
        return Redis.setex(`request-processing:${key}`, 2, 1)
    }

    static async removeRequestProcessing (key) {
        return Redis.del(`request-processing:${key}`)
    }
}

module.exports = VndcFutureOrder
VndcFutureOrder.GroupStatus = { OPENING: 0, HISTORY: 1 }
VndcFutureOrder.Status = { PENDING: 0, ACTIVE: 1, CLOSED: 2 }
VndcFutureOrder.Side = { BUY: 'Buy', SELL: 'Sell' }
VndcFutureOrder.Type = { MARKET: 'Market', LIMIT: 'Limit', STOP: 'Stop' }
VndcFutureOrder.ReasonCloseCode = {
    NORMAL: 0,
    HIT_SL: 1,
    HIT_TP: 2,
    LIQUIDATE: 3,
    HIT_LIMIT_CLOSE: 4,
    DCA_ORDER: 5,
    PARTIAL_CLOSE: 6
}
VndcFutureOrder.ReasonClose = ['Normal', 'Hit SL', 'Hit TP', 'Liquidate', 'Partial Close', 'DCA', 'Partial Close']
VndcFutureOrder.BitmexTransferError = {
    PROCESS_SUCCESSFULLY: 0,
    PLACE_ORDER_WITHOUT_SL_TP: 1, // Dat duoc lenh chinh nhung khong dat duoc lenh SL, TP
    ACTIVE_ORDER_ERROR: 2, // Lenh Stop hoac Limit duoc active nhung khong dat duoc SL, TP
    HIT_SL_TP_ERROR: 3 // Hit SL hoac TP nhung khong dong duoc lenh con lai
}
VndcFutureOrder.PromoteProgram = { NORMAL: 0, LUCKY_MONEY_2020: 1, AIRDROP_VNDC: 2 }
// Special mode for Open mode and close mode
VndcFutureOrder.SpecialMode = { NORMAL: 0, ONLY_LIMIT: 1, DCA_ORDER: 2, PARTIAL_CLOSE: 3 }
// 30 60 90 120 -> Step 100
VndcFutureOrder.LiquidityBroker = { BINANCE: 'BINANCE', BITMEX: 'BITMEX', NAMI: 'NAMI' }
VndcFutureOrder.CloseAllOrderType = {
    ALL: 'ALL',
    PROFIT: 'PROFIT',
    LOSS: 'LOSS',
    PAIR: 'PAIR',
    ALL_PENDING: 'ALL_PENDING',
    ALL_PAIR_PENDING: 'ALL_PAIR_PENDING'
}
VndcFutureOrder.CloseAllOrderMode = {
    ALL: 'ALL',
    INDIVIDUAL: 'INDIVIDUAL'
}
VndcFutureOrder.ReasonCloseCodeText = ['NORMAL', 'HIT_SL', 'HIT_TP', 'LIQUIDATE']
VndcFutureOrder.Product = {
    NAMI_APP: 0,
    FRAME_ONUS: 1,
    FRAME_NAMI: 2
}
