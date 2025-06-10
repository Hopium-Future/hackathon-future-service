const _ = require('lodash')

// const Binance = require('node-binance-api')
const Binance = use('App/Library/node-binance-api')

// const binance = new Binance().options({
//     test: true,
//     APIKEY: process.env.BINANCE_FUTURE_API_KEY,
//     APISECRET: process.env.BINANCE_FUTURE_API_SECRET,
// });

async function getApiKey(user) {
	let result = null
	const UserBinanceAccount = use('App/Models/UserBinanceAccount')
	const userData = await UserBinanceAccount.getOne({
		user_id: user.id,
		status: UserBinanceAccount.Status.ACTIVE,
		getSecretInformation: 1
	})
	if (userData) {
		result = {
			apiKey: userData.api_key,
			apiSecret: userData.api_secret
		}
	}
	return result
}

async function getBinanceClient(user, options = {}) {
	if (!user && options.apiKey && options.apiSecret) {
		return new Binance().options({
			hedgeMode: true,
			test: process.env.NODE_ENV !== 'production',
			APIKEY: options.apiKey,
			APISECRET: options.apiSecret
		})
	}
	const {apiKey, apiSecret} = await getApiKey(user)
	return new Binance().options({
		hedgeMode: true,
		test: process.env.NODE_ENV !== 'production',
		APIKEY: apiKey,
		APISECRET: apiSecret
	})
}

exports.postLeverage = async function postLeverage(user, symbol, leverage) {
	const binance = await getBinanceClient(user)
	return binance.futuresLeverage(symbol, leverage)
}
exports.postMarginType = async function postMarginType(user, symbol, marginType) {
	const binance = await getBinanceClient(user)
	return binance.futuresMarginType(symbol, marginType)
}

exports.getUserData = async function getUserData(user) {
	const binance = await getBinanceClient(user)
	return binance.futuresAccount()
}
exports.futuresOpenOrders = async function getOrder(user, symbol = null) {
	const binance = await getBinanceClient(user)
	return binance.futuresOpenOrders(symbol)
}

exports.futuresOrderStatus = async function futuresOrderStatus(user, symbol, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresOrderStatus(symbol, params)
}

exports.getFuturesBalance = async function getFuturesBalance(user, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresBalance( params)
}


exports.putFuturesPositionMargin = async function putFuturesPositionMargin(user, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresPositionMargin(params.symbol, params.amount, params.type, params)
}


exports.getPosition = async function getPosition(user, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresPositionRisk(params)
}
exports.deleteOrder = async function deleteOrder(user, symbol, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresCancel(symbol, params)
}

exports.deleteAllOpenOrders = async function deleteAllOpenOrders(user, symbol, params) {
	const binance = await getBinanceClient(user)
	return binance.futuresCancelAll(symbol, params)
}

exports.getUserTrades = async function getUserTrade(user, symbol, params = {}) {
	const binance = await getBinanceClient(user)
	return binance.futuresUserTrades(symbol, params)
}

exports.getAllOrders = async function getAllOrders(user, symbol, params = {}) {
	const binance = await getBinanceClient(user)
	return binance.futuresAllOrders(symbol, params)
}

exports.getUserIncome = async function getUserTrade(user, params = {}) {
	const binance = await getBinanceClient(user)
	return binance.futuresIncome(params)
}

exports.postOrder = async function postOrder(user, options = {}) {
	const DEFAULT_VALUE = {
		side: null,
		type: null,
		symbol: null,
		quantity: null,
		positionSide: undefined,
		timeInForce: undefined,
		price: false,
		clientOrderId: undefined,
		stopPrice: undefined,
		reduceOnly: undefined,
		closePosition: undefined,
		newOrderRespType: undefined
	}

	const _input = _.defaults(options, DEFAULT_VALUE)
	const {
		side,
		type,
		symbol,
		quantity,
		price,
		newClientOrderId,
		timeInForce,
		stopPrice,
		reduceOnly,
		closePosition,
		positionSide,
		newOrderRespType
	} = _input

	const _options = {}
	_options.type = type
	if (newClientOrderId) _options.newClientOrderId = newClientOrderId
	if (stopPrice) _options.stopPrice = stopPrice
	if (reduceOnly) _options.reduceOnly = reduceOnly
	if (positionSide) _options.positionSide = positionSide
	if (newOrderRespType) _options.newOrderRespType = newOrderRespType
	if (closePosition) _options.closePosition = closePosition
	if (timeInForce) _options.timeInForce = timeInForce

	const binance = await getBinanceClient(user)
	return binance.futuresOrder(side, symbol, quantity, price, _options)
}
