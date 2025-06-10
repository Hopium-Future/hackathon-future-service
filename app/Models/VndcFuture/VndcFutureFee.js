'use strict'

const BaseModel = use('App/Models/BaseModel')
const UserPreferencesService = use('App/Services/UserPreferencesService')
const WalletCurrency = use('Config').get('walletCurrencies')
const { WalletType } = use('App/Library/Enum').Wallet
const UserService = use('App/Services/UserService')
const _ = require('lodash')

class VndcFutureFee extends BaseModel {
    static async getFutureFee (user, options = {}, feeAssetOrder = WalletCurrency.LUSDT) {
        try {
            const _options = _.defaults(options, {
                symbol: null,
                value: 0,
                valueCurrency: WalletCurrency.USDT,
                type: this.Type.PLACE_ORDER,
                orderCount: -1,
                walletType: WalletType.MAIN,
                partnerType: 0,
                feeType: this.FeeType.TAKER
            })
            const Wallet = use('App/Models/Wallet')
            const returnData = {
                feeValue: 0,
                feeCurrency: 0
            }
            const { symbol, value, walletType, partnerType, feeType } = _options
            // Check cài đặt phí của user
            const AssetIds = { usdt: WalletCurrency.USDT, lusdt: WalletCurrency.LUSDT }

            const feeRatioConfig = _options.type === this.Type.PLACE_ORDER ? this.OpenFeeRatioConfig : this.CloseFeeRatioConfig
            const FeeRatio = feeRatioConfig[walletType][feeType][partnerType]

            const AssetValue = use('App/Models/Portfolio/AssetValue')
            let multi = 1
            let defaultFee = {
                feeValue: value * FeeRatio.usdt,
                feeCurrency: WalletCurrency.USDT
            }

            if (symbol.endsWith('USDT')) {
                defaultFee = {
                    feeValue: value * FeeRatio.usdt,
                    feeCurrency: WalletCurrency.USDT
                }
                multi = 1
            }

            // Check cài đặt phí của user
            const marginAsset = symbol.slice(-4).toLowerCase()
            let feeAsset = marginAsset
            const index = Object.values(AssetIds).findIndex(e => e === +feeAssetOrder)
            if (index !== -1) feeAsset = Object.keys(AssetIds)[index]
            if (index === -1) {
                feeAsset = await UserPreferencesService.getCached(user.id, this.Key.NA3[feeAsset.toUpperCase()], feeAsset)
                Logger.info('futures_fee 1', user.id, _options, feeAsset)
            }
            if (feeAsset !== marginAsset && AssetIds[feeAsset] > 0) {
                const assetId = AssetIds[feeAsset]
                const feeRatio = FeeRatio[feeAsset]
                let assetValue = 0
                if (assetId === WalletCurrency.LUSDT) {
                    assetValue = 1
                } else {
                    assetValue = await AssetValue.getAssetValueByIdCached(assetId === WalletCurrency.VNST ? WalletCurrency.VNDC : assetId)
                }
                if (!(assetValue > 0)) {
                    Logger.info('futures_fee asset_value_error', user.id, _options, feeAsset, assetValue)
                    return defaultFee
                }
                const fee = value * feeRatio
                const feeValue = fee / multi / assetValue
                // Check available
                // If balance is less than fee in currency, apply default fee currency (VNDC)
                if (options.ignoreBalance) {
                    return {
                        feeValue,
                        feeCurrency: assetId
                    }
                }
                const balance = await Wallet.getAvailable(user.id, assetId, walletType)
                Logger.info('futures_fee 2', {
                    user_id: user.id,
                    _options,
                    feeAsset,
                    assetValue,
                    fee,
                    feeValue,
                    available: balance,
                    useNao: balance >= feeValue
                })

                if (balance >= feeValue) {
                    Logger.info('futures_fee 3', {
                        feeValue,
                        feeCurrency: assetId
                    })
                    return {
                        feeValue,
                        feeCurrency: assetId
                    }
                }
                return defaultFee
            }
            return defaultFee
        } catch (e) {
            console.error('__ Get fee error ', e)
            throw 'GET_FEE_ERROR'
        }
    }

    static async getFeeConfig (walletType = WalletType.MAIN, feeType = this.FeeType.TAKER) {
        if (Object.values(this.FeeType).includes(feeType)) {
            return {
                open: this.OpenFeeRatioConfig[walletType][feeType],
                close: this.CloseFeeRatioConfig[walletType][feeType]
            }
        }
        return {
            open: this.OpenFeeRatioConfig[walletType],
            close: this.CloseFeeRatioConfig[walletType]
        }
    }

    static getOpenFeeRatio (partnerType = 0, walletType = WalletType.MAIN, feeType = this.FeeType.TAKER) {
        return this.OpenFeeRatioConfig?.[walletType]?.[feeType]?.[partnerType]?.usdt
    }
}

module.exports = VndcFutureFee

VndcFutureFee.Type = {
    PLACE_ORDER: 0,
    CLOSE_ORDER: 1
}
VndcFutureFee.FeeType = {
    TAKER: 'TAKER',
    MAKER: 'MAKER'
}
VndcFutureFee.Key = { NA3: { USDT: 'na3_futures_usdt_frame_fee_token' } }
VndcFutureFee.ValidCurrency = { NA3: { USDT: ['usdt'] } }
VndcFutureFee.OpenFeeRatioConfig = {
    MAIN: {
        TAKER: {
            0: { usdt: 0.0005, lusdt: 0.0005 }, // Newbie
            1: { usdt: 0.0005, lusdt: 0.0005 }, // Ambassador
            2: { usdt: 0.00045, lusdt: 0.00045 }, // Rookie
            3: { usdt: 0.0004, lusdt: 0.0004 }, // Degen
            4: { usdt: 0.00035, lusdt: 0.00035 }, // Pro
            5: { usdt: 0.0003, lusdt: 0.0003 }, // Elite
            6: { usdt: 0.00025, lusdt: 0.00025 } // Legend
        },
        MAKER: {
            0: { usdt: 0.0002, lusdt: 0.0002 }, // Newbie
            1: { usdt: 0.0002, lusdt: 0.0002 }, // Ambassador
            2: { usdt: 0.00018, lusdt: 0.00018 }, // Rookie
            3: { usdt: 0.00016, lusdt: 0.00016 }, // Degen
            4: { usdt: 0.00014, lusdt: 0.00014 }, // Pro
            5: { usdt: 0.00012, lusdt: 0.00012 }, // Elite
            6: { usdt: 0.0001, lusdt: 0.0001 } // Legend
        }
    }
}
VndcFutureFee.CloseFeeRatioConfig = {
    MAIN: {
        TAKER: {
            0: { usdt: 0.0005, lusdt: 0.0005 }, // Newbie
            1: { usdt: 0.0005, lusdt: 0.0005 }, // Ambassador
            2: { usdt: 0.00045, lusdt: 0.00045 }, // Rookie
            3: { usdt: 0.0004, lusdt: 0.0004 }, // Degen
            4: { usdt: 0.00035, lusdt: 0.00035 }, // Pro
            5: { usdt: 0.0003, lusdt: 0.0003 }, // Elite
            6: { usdt: 0.00025, lusdt: 0.00025 } // Legend
        },
        MAKER: {
            0: { usdt: 0.0002, lusdt: 0.0002 }, // Newbie
            1: { usdt: 0.0002, lusdt: 0.0002 }, // Ambassador
            2: { usdt: 0.00018, lusdt: 0.00018 }, // Rookie
            3: { usdt: 0.00016, lusdt: 0.00016 }, // Degen
            4: { usdt: 0.00014, lusdt: 0.00014 }, // Pro
            5: { usdt: 0.00012, lusdt: 0.00012 }, // Elite
            6: { usdt: 0.0001, lusdt: 0.0001 } // Legend
        }
    }
}
