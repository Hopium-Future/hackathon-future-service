'use strict'

const Env = use('Env')

module.exports = {
    default: Env.get('ETHEREUM_NODE_DEPOSIT'),
    ws: Env.get('ETHEREUM_NODE_DEPOSIT_WS')
}
