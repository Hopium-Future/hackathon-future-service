'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
// eslint-disable-next-line no-unused-vars
const Route = use('Route')
Route.group(() => {
    Route.get('futures/config', 'FuturesController.getConfig')
    Route.get('futures/asset/config', 'FuturesController.getAssetConfig')
    Route.get('futures/fee-config', 'FuturesController.getFeeConfig')
    Route.get('health-check', async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString()
    }))
})
    .prefix('api/v3')

Route.group(() => {
    Route.get('futures/balance', 'TradeController.getBalance')
    Route.get('futures/leverageBracket', 'TradeController.getFuturesLeverageBracket')
    Route.get('futures/userSetting', 'TradeController.getFuturesUserSetting')
    Route.post('futures/marginType', 'TradeController.postMarginType')
    Route.post('futures/positionSide', 'TradeController.postPositionSide')

    Route.get('futures/leverage', 'TradeController.getLeverage')
    Route.post('futures/leverage', 'TradeController.postLeverage')

    Route.post('futures/positionMargin', 'TradeController.postPositionMargin')
    Route.post('futures/positionSide', 'TradeController.postPositionSide')
    // Favorites
    Route.get('futures/symbols/favorite', 'FuturesController.getFavoriteSymbols')
    Route.put('futures/symbols/favorite', 'FuturesController.addFavoriteSymbols')
    Route.delete('futures/symbols/favorite', 'FuturesController.removeFavoriteSymbols')

    Route.get('futures/recent-trade', 'FuturesController.getRecentTrade')
    // VNDC & USDT Futures
    Route.get('futures/vndc/order', 'VndcFuturesController.getOrder')
    Route.get('futures/vndc/history_order', 'VndcFuturesController.getHistoryOrder')
    Route.post('futures/vndc/order', 'VndcFuturesController.postOrder')
    Route.put('futures/vndc/order', 'VndcFuturesController.putOrder')
    Route.delete('futures/vndc/order', 'VndcFuturesController.deleteOrder')
    Route.get('futures/vndc/order-detail', 'VndcFuturesController.getOrderDetail')
    Route.get('futures/vndc/closed-order-detail', 'VndcFuturesController.getClosedOrderDetail')
    Route.get('futures/vndc/transactions', 'VndcFuturesController.getListTransaction')
    Route.get('futures/vndc/count-order', 'VndcFuturesController.countUserOpenOrder')

    Route.put('futures/dca-order', 'VndcFuturesController.dcaOrder')
    Route.get('futures/funding-history', 'FuturesController.getFundingHistories')
    Route.get('futures/funding-loan-detail', 'FuturesController.getFundingLoanHistories')
})
    .prefix('api/v3')
    .middleware(['session', 'auth'])

Route.group(() => {
    Route.post('futures/vndc/liquidate-loan', 'VndcFuturesController.closeAllOrderByLoan')
    Route.get('futures/vndc/count-open-order', 'VndcFuturesController.countOpenOrder')
    Route.get('futures/order', 'VndcFuturesController.getOrderData')
    Route.put('futures/order', 'VndcFuturesController.putOrderData')

}).prefix('api/v3').middleware(['checkSecretKey'])

Route.group(() => {
    Route.get('futures/trend', 'MarketController.getTrend')
    Route.get('futures/market_watch', 'MarketController.getTicker')
    Route.get('futures/ticker', 'MarketController.getTicker')
    Route.get('futures/trending/tokens', 'MarketController.getTrendingTokens')
    Route.get('futures/mark_price', 'MarketController.getMarkPrice')
    Route.get('futures/depth', 'MarketController.getDepth')
    // Route.get('futures/recent_trade', 'MarketController.getRecentTrade')
    Route.post('futures/view', 'MarketController.postView')
    Route.get('futures/get-funding-rate-history', 'VndcFuturesController.getFundingRateHistory')
})
    .prefix('api/v3')// .middleware('throttle:30,60')
