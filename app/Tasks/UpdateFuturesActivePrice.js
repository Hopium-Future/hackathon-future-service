'use strict';

const Task = use('Task');
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const FuturesPrice = use('App/Models/Futures/FuturesPrice')

class ScanMargin extends Task {
  static get schedule() {
    return '30,49 * * * *';
  }

  async handle(args, options) {
    const configs = await FuturesConfig.find({ status: 'TRADING' })

    for (let i = 0; i < configs.length; i++) {
      try {
        const item = configs[i]
        const ticker = await FuturesPrice.getTicker(item.symbol)
        if (!ticker) {
          console.log('__ not found last price', item.symbol)
          continue
        }
        const lastPrice = +ticker?.p || 0
        const spread = +ticker?.ap - ticker.bp
        let minDifferenceRatio = Math.abs(spread / lastPrice * 2.5)
        const spreadRatio = Math.abs(spread / lastPrice * 100)
        if (spread === 0) minDifferenceRatio = 0.6 / 100
        if (
          ['BTC',
            'ETH',
            'BCH',
            'LTC',
            'ETC',
            'LINK',
            'BNB',
            'DOT',].includes(item.baseAsset)
        ) {
          minDifferenceRatio = Math.abs(spread / lastPrice * 1.5)
        }
        if (spreadRatio > 0.1) minDifferenceRatio = Math.abs(spread / lastPrice * 3.8)
        if (spreadRatio > 0.13) minDifferenceRatio = Math.abs(spread / lastPrice * 4.2)
        if (spreadRatio > 0.15) minDifferenceRatio = Math.abs(spread / lastPrice * 5.2)
        if (

          [
            'GHST',
            'CHILLGUY',
            'TROY',
            'EOS',
            'KNC',
            'LIT',
            'C98',
            'FLOW',
            'FLM',
            'GTC',
            'CELO',
            'DENT',
            'STMX',
            'BAN',
            'LINA',
            'CELO',
          ].includes(item.baseAsset)
        ) {
          minDifferenceRatio = Math.abs(spread / lastPrice * 6)
        }
        const newFilter = []
        for (let j = 0; j < item.filters.length; j++) {
          const filter = item.filters[j]
          const { filterType } = filter
          if (filterType === 'PERCENT_PRICE') {

            if (Math.abs(ticker?.r) <= 0.0005) {
              newFilter.push({
                ...item.filters[j],
                minDifferenceRatio: Math.max(0.0003, minDifferenceRatio)
              })
            } else {
              const random = 0.95 + Math.random() * 0.02
              newFilter.push({
                ...item.filters[j],
                minDifferenceRatio: Math.max(0.0003, Math.abs(ticker?.r) * random, minDifferenceRatio)
              })
            }

          } else if (filterType === 'PRICE_FILTER') {

            newFilter.push({

              ...item.filters[j],
              minPrice: 0

            })
          } else if ([
            'LOT_SIZE',
            'MARKET_LOT_SIZE',
            'MAX_NUM_ORDERS',
            'MAX_NUM_ALGO_ORDERS',
            'MIN_NOTIONAL',
            'MAX_TOTAL_VOLUME',
          ].includes(filterType)) {
            newFilter.push({
              ...item.filters[j],
            })
          }
        }
        Logger.info('Update Futures Active Price', item.symbol, newFilter)
        const result = await FuturesConfig.findOneAndUpdate({ _id: item._id }, {
          $set: {
            filters: newFilter,
            // leverageConfig: {"max": max_leverage, "min": 1, "default": 10}
          }
        })
        console.log('__ check result', result)
      } catch (e) {
        console.error('Update Futures Active Price', e)
      }
    }
  }

}

module.exports = ScanMargin;
