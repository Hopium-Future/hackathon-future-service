'use strict'

const { Command } = require('@adonisjs/ace')
const FuturesService = use('App/Services/FuturesService')

class CreateFakeOrder extends Command {
    static get signature () {
        return 'create:fake-order'
    }

    static get description () {
        return 'Tell something helpful about this command'
    }

    async handle (args, options) {
        const data = {
            492700: [
                { profit: 150, leverage: 50, order_value: 8000 },
                { profit: 100, leverage: 50, order_value: 8000 },
                { profit: 200, leverage: 50, order_value: 8000 },
                { profit: -50, leverage: 50, order_value: 8000 },
                { profit: 100, leverage: 50, order_value: 8000 },
                { profit: 50, leverage: 50, order_value: 8000 },
                { profit: 50, leverage: 50, order_value: 8000 }
            ],
            492712: [
                { profit: 30, leverage: 2, order_value: 6000 },
                { profit: 50, leverage: 2, order_value: 6000 },
                { profit: 80, leverage: 2, order_value: 6000 },
                { profit: -10, leverage: 2, order_value: 6000 },
                { profit: 50, leverage: 2, order_value: 6000 },
                { profit: 100, leverage: 2, order_value: 6000 },
                { profit: 12, leverage: 2, order_value: 6000 }
            ]
        }
        await FuturesService.fakeOrder(data)
        this.info(`Finished`)
        process.exit()
    }
}

module.exports = CreateFakeOrder
