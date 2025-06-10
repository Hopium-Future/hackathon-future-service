'use strict'

const Env = use('Env')
const Decryptor = require('simple-encryptor')(Env.get('PRIVATE_WALLET_DECRYPTION_KEY') ? Env.get('PRIVATE_WALLET_DECRYPTION_KEY') : 'abcabcabcabcabcabcabc').decrypt

module.exports = {
    default: {
        ws: Env.get('BINANCE_CHAIN_WS'),
        apiHost: Env.get('DEPOSIT_BINANCE_NETWORK') === 'mainnet' ? 'https://dex.binance.org/' : 'https://testnet-dex.binance.org/',
        network: Env.get('DEPOSIT_BINANCE_NETWORK'),
        privateKey: Env.get('WITHDRAW_BINANCE_PRIV_KEY') ? Decryptor(Env.get('WITHDRAW_BINANCE_PRIV_KEY')) : undefined
    }
}
