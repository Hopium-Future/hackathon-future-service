"use strict"

const BaseModel = use("MongooseModel")

/**
 * @class ConvertHistory
 */
class ConvertHistory extends BaseModel {
    /**
	 * SwapHistory's schema
	 */
    static get schema () {
        return {
            userId: Number,
            displayingId: String,
            assets: Object,
            toAsset: String,
            toAssetId: Number,
            toQty: Number,
            preOrderData: Object,
            transferStatus: { type: Number, default: 0 }
        }
    }
}

module.exports = ConvertHistory.buildModel("ConvertHistory")
