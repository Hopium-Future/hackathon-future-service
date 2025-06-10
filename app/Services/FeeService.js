
const FeeTable = use('App/Models/FeeTable')
const FeeUserLevel = use('App/Models/FeeUserLevel')
const SysNoti = use('App/Library/SysNoti');
const Env = use('Env')
const User = use('App/Models/User')
const RedisCache = use('Redis').connection('cache')
const Config = use('Config');
const Logger = use('Logger')
const WalletCurrency = Config.get('walletCurrencies')
const _ = require('lodash')



const UserFeeLevelCache = {
    // user_id: level
}
const FeeRows = {

}

const DEFAULT_FEE_ROW = 'N0';
const FEE_PERCENTAGE_FALLBACK = Env.get('FEE_PERCENTAGE_FALLBACK', 0.15);

class FeeService {
    static async getFeePercentage(
        mode, // Futures, exchange, etc,...
        symbol, // XBTUSD, BTCVNDC
        userId, // omitable
        _feeName, // N0, N1, N2, omittable
        metadata = {}
    ) {
        if (mode === 'futures') {
            try {
                let feeName = _feeName || 'N0';

                // Find fee name of user
                if (userId && !_feeName) {
                    const cachedFeeNameByUser = await RedisCache.get(`cache::fee_user_level_name:${userId}`);
                    if (cachedFeeNameByUser) {
                        feeName = cachedFeeNameByUser;
                    } else {
                        let feeUserRow = await FeeUserLevel.query().select('fee_level')
                            .where({
                                user_id: userId,
                            })
                            .first();
                        if (feeUserRow) {
                            feeName = feeUserRow.fee_level;
                        }
                        RedisCache.set(`cache::fee_user_level_name:${userId}`, feeName);
                    }
                }

                try {
                    const cachedFees = await RedisCache.hget(`cache::fee_percentage:${userId || 'all_user_ids'}`, `${mode}:${feeName}:${symbol}`);
                    if (cachedFees) {
                        return JSON.parse(cachedFees)
                    }
                } catch (e) {
                    console.error(e);
                }
                let row = await FeeTable.query()
                    .where({
                        mode,
                        fee_name: feeName,
                    })
                    .whereRaw('? like symbol', [symbol])
                    .orderBy('priority', 'desc')
                    .first();

                if (!row) {
                    SysNoti.notify(`<@U7TRL8XSQ> Không tìm thấy dòng phí tương ứng với ${feeName}, symbol=${symbol}`);
                } else {
                    row = row.toJSON();
                }

                const result = [];
                if (row) {
                    // Discount
                    if (mode === 'futures' && userId && symbol) {
                        const userData = await User.getOne({id: userId})
                        if (symbol.endsWith('VNDC') &&
                            [WalletCurrency.NAC, WalletCurrency.SPIN].includes(userData.future_fee_currency_vndc)
                        ) {
                            result.push(
                                row.fee_percentage_3 != null ? row.fee_percentage_3 : FEE_PERCENTAGE_FALLBACK,
                                row.fee_percentage_4 != null ? row.fee_percentage_4 : FEE_PERCENTAGE_FALLBACK,
                            )
                        } else if (symbol.endsWith('USDT') &&
                            [WalletCurrency.NAC, WalletCurrency.SPIN].includes(userData.future_fee_currency_usdt)) {
                            result.push(
                                row.fee_percentage_3 != null ? row.fee_percentage_3 : FEE_PERCENTAGE_FALLBACK,
                                row.fee_percentage_4 != null ? row.fee_percentage_4 : FEE_PERCENTAGE_FALLBACK,
                            )
                        }
                    }
                    if (!result.length) {
                        result.push(
                            row.fee_percentage != null ? row.fee_percentage : FEE_PERCENTAGE_FALLBACK,
                            row.fee_percentage_2 != null ? row.fee_percentage_2 : FEE_PERCENTAGE_FALLBACK,
                        )
                    }
                } else {
                    result.push(
                        FEE_PERCENTAGE_FALLBACK,
                        FEE_PERCENTAGE_FALLBACK,
                    )
                }

                RedisCache.hset(`cache::fee_percentage:${userId || 'all_user_ids'}`, `${mode}:${feeName}:${symbol}`, JSON.stringify(result));
                return result;
            } catch (e) {
                SysNoti.notify(`<@U7TRL8XSQ> Có lỗi khi get phí`);
                console.error(e);
                return [FEE_PERCENTAGE_FALLBACK, FEE_PERCENTAGE_FALLBACK];
            }
        }
        else if (mode === 'withdrawal' || mode === 'withdraw') {
            const currency = +symbol;
            const {network} = metadata;
            let result;
            const CACHE_KEY = `cache::withdrawal_fee_by_user:${userId || 'all_users'}:${symbol || '*'}:${network || 'network_*'}`;
            try {
                const cachedWithdrawalFeeByUser = await RedisCache.get(CACHE_KEY);
                if (cachedWithdrawalFeeByUser) {
                    return JSON.parse(cachedWithdrawalFeeByUser);
                }

                let conditionObject = {
                    symbol: currency,
                    mode: 'withdraw',
                };
                if (network) {
                    conditionObject.withdrawal_network = network;
                }
                let row = await FeeTable.query()
                    .where(conditionObject)
                    .first();
                if (row) {
                    row = row.toJSON()
                    console.log(`>> Fee config row for ${symbol}`, row);
                    result = [
                        { amount: row.fee_percentage, currency }
                    ]
                }
            } catch (e) {
                console.error(e);
            }

            // Fallback
            if (!result) {
                const Wallet = use('App/Models/Wallet')
                let currencyName = Wallet.currencyToText(currency)
                if (currencyName === '') {
                    result = []
                } else {
                    const TokenConfig = Config.get('allTokens')
                    let tokenConfig = TokenConfig[currency];
                    let feeAllNetworks = tokenConfig.withdrawFee
                    let fee;
                    if (network) {
                        const tokenTypeIndex = tokenConfig.network.findIndex(e => network === e);
                        if (tokenTypeIndex !== -1) {
                            fee = feeAllNetworks[tokenTypeIndex];
                        } else {
                            fee = feeAllNetworks[0];
                        }
                    } else {
                        fee = feeAllNetworks[0];
                    }
                    if (isNaN(fee)) {
                        result = [];
                    } else {
                        result = [{ amount: fee, currency }]
                    }
                }
            }

            await RedisCache.set(
                CACHE_KEY,
                JSON.stringify(result || []),
                'ex',
                86400
            );
            return result;
        }
    }

    static async updateFeeInTokenConfig() {
        let withdrawalFees = await FeeTable.query()
            .where({
                mode: 'withdraw',
            })
            .fetch();
        if (withdrawalFees) {
            withdrawalFees = withdrawalFees.toJSON();
        }

        const TokenConfig = Config.get('allTokens')
        withdrawalFees.forEach(feeRow => {
            TokenConfig.withdrawalFeeDefaultConfig[feeRow.symbol] = feeRow.fee_percentage;
            TokenConfig.TokenConfigCache.del(+feeRow.symbol);
        });

        use('App/Controllers/Http/TokenController').TokenConfigCached.del('*');
    }

    /**
     * Cập nhật các thông tin sau từ Binance
     * Token được phép rút hoặc nạp hay không
     * Min withdraw, phí withdraw
     * Nếu có lỗi thì báo về slack
     */
    static async updateBinanceConfig(refetch = true) {
        const BinanceService = use('App/Services/BinanceService');
        let binanceConfig;
        const CACHE_KEY = 'cache_binance_all_tokens_config';
        if (!refetch) {
            try {
                const cached = await RedisCache.get(CACHE_KEY)
                binanceConfig = await JSON.parse(cached);
            } catch (e) {

            }
        }
        if (!binanceConfig) {
            binanceConfig = await BinanceService.getConfigAllTokens();
            if (!binanceConfig || !Array.isArray(binanceConfig)) {
                Logger.error('Cannot get binance config', binanceConfig);
                throw 'Cannot get binance config';
            }
        }
        if (binanceConfig) {
            RedisCache.set(CACHE_KEY, JSON.stringify(binanceConfig)).catch(() => {});
        }

        /**
         * config
         * [
         {
                "coin": "STPT",
                "depositAllEnable": true,
                "withdrawAllEnable": true,
                "name": "Standard Tokenization Protocol",
                "free": "0",
                "locked": "0",
                "freeze": "0",
                "withdrawing": "0",
                "ipoing": "0",
                "ipoable": "0",
                "storage": "0",
                "isLegalMoney": false,
                "trading": true,
                "networkList": [
                  {
                    "network": "ETH",
                    "coin": "STPT",
                    "withdrawIntegerMultiple": "0.00000001",
                    "isDefault": true,
                    "depositEnable": true,
                    "withdrawEnable": true,
                    "depositDesc": "",
                    "withdrawDesc": "",
                    "specialTips": "",
                    "name": "ERC20",
                    "resetAddressStatus": false,
                    "addressRegex": "^(0x)[0-9A-Fa-f]{40}$",
                    "memoRegex": "",
                    "withdrawFee": "474",
                    "withdrawMin": "948",
                    "withdrawMax": "0",
                    "minConfirm": 12,
                    "unLockConfirm": 0
                  }
                ]
              },
         ]
         *
         */

        // Quét tất cả currency nào lquan binance
        const TokenConfig = Config.get('allTokens')
        let somethingUpdated = false;
        Object.values(WalletCurrency).forEach(currency => {
            const tokenConfig = TokenConfig[currency];
            let isBinanceRelated = tokenConfig.depositProvider.includes(TokenConfig.LiquidityProvider.BINANCE) ||
                tokenConfig.withdrawProvider.includes(TokenConfig.LiquidityProvider.BINANCE);
            if (!isBinanceRelated) {
                return;
            }

            const binanceCoinName = BinanceService.convertNamiCurrencyToBinanceCurrency(currency);
            if (!binanceCoinName) {
                return;
            }
            // Check các thông tin sau trên từng network
            // 1. Min rút
            // 2. Phí rút
            // 3. Cho phép nạp - rút
            const binanceTokenConfig = _.find(binanceConfig, {coin: binanceCoinName});
            if (!binanceTokenConfig || !binanceTokenConfig.networkList) {
                SysNoti.notifyDelayed(
                    `🔴 <@U7TRL8XSQ> Coin ${binanceCoinName} không có config hoặc networkList!`,
                    `non_config_binance_${binanceCoinName}`,
                );
                return;
            }

            // Update config
            const withdrawMin = [], withdrawFee = [], depositEnabled = [], withdrawEnabled = [];
            tokenConfig.binanceNetwork.forEach((binanceNetwork, index) => {
                const binanceTokenNetworkConfig = _.find(binanceTokenConfig.networkList, {network: binanceNetwork});
                if (!binanceTokenNetworkConfig) {
                    Logger.info(`Binance config ${currency} (${binanceCoinName}) not found for network ${binanceNetwork}, disable deposit withdraw`);
                    depositEnabled[index] = false;
                    withdrawEnabled[index] = false;
                } else {
                    const minWithdrawValue = +binanceTokenNetworkConfig.withdrawMin;
                    const withdrawalFeeValue = +binanceTokenNetworkConfig.withdrawFee;
                    withdrawMin[index] = _.isNumber(minWithdrawValue) ? minWithdrawValue : 1e9;
                    withdrawFee[index] = _.isNumber(withdrawalFeeValue) ? withdrawalFeeValue : 1e9;
                    depositEnabled[index] = binanceTokenNetworkConfig.depositEnable;
                    withdrawEnabled[index] = binanceTokenNetworkConfig.withdrawEnable;
                }
            })
            TokenConfig.withdrawalMinBinance[currency] = withdrawMin;
            TokenConfig.withdrawalFeeBinance[currency] = withdrawFee;
            TokenConfig.depositEnabledBinance[currency] = depositEnabled;
            TokenConfig.withdrawEnabledBinance[currency] = withdrawEnabled;
            Logger.info(`Update binance config token ${currency} (${binanceCoinName})`, {
                network: tokenConfig.binanceNetwork,
                withdrawMin, withdrawFee, depositEnabled, withdrawEnabled,
            })

            // Reset cache
            TokenConfig.TokenConfigCache.del(currency);
            clearCache('withdraw', currency);
            somethingUpdated = true;
        });
        if (somethingUpdated) {
            use('App/Controllers/Http/TokenController').TokenConfigCached.del('*');
        }
    }
}

async function removeAllKeysWithPattern(pattern) {
    try {
        await RedisCache.eval(
            `return redis.call('del', unpack(redis.call('keys', ARGV[1])))`,
            0,
            pattern,
        );
    } catch (e) {
        if (_.get(e, 'message', '').includes('Wrong number of args calling Redis command From Lua script')) {
            // No keys found error, just ignore this
            return;
        }
        Logger.error('Cache remove all keys err removeAllKeysWithPattern', e);
    }
}

const clearCache = exports.clearCache = async function clearCache(
    mode, // Futures, exchange, etc,...
    symbol, // XBTUSD, BTCVNDC
    userId, // omitable
    network, // For withdraw, omitable
) {
    let pattern = null;
    if (mode === 'futures') {
        await RedisCache.hdel(`cache::fee_percentage:${userId || 'all_user_ids'}`,`${mode}:${feeName}:${symbol}`);
    } else if (mode === 'withdraw' || mode === 'withdrawal') {
        await removeAllKeysWithPattern(`cache::withdrawal_fee_by_user:${userId || 'all_users'}:${symbol || '*'}:${network || '*'}`);
    }
}

module.exports = FeeService;
