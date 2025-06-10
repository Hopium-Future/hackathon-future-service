module.exports = {
    mappings: {
        properties:
            {
                "@timestamp": {type: "date"},
                "@version": {type: "keyword"},
                message: {type: "text", index: true},
                severity: {type: "keyword", index: true},
                fields:
                    {
                        properties:
                            {
                                baseAsset: {type: 'text'},
                                baseAssetId: {type: 'float'},
                                baseQty: {type: 'float'},
                                buyOrderId: {type: 'float'},
                                buyerId: {type: 'float'},
                                displayingId: {type: 'float'},
                                executedQty: {type: 'float'},
                                executedQuoteQty: {type: 'float'},
                                flag: {type: 'text'},
                                price: {type: 'float'},
                                quantity: {type: 'float'},
                                quoteAsset: {type: 'text'},
                                quoteAssetId: {type: 'float'},
                                quoteOrderQty: {type: 'float'},
                                quoteQty: {type: 'float'},
                                requestId: {type: 'text'},
                                sellOrderId: {type: 'float'},
                                sellerId: {type: 'float'},
                                side: {type: 'text'},
                                status: {type: 'text'},
                                symbol: {type: 'text'},
                                timestamp: {type: 'date'},
                                type: {type: 'text'},
                                useQuoteQty: {type: 'boolean'},
                                userId: {type: 'float'},
                                buyerFee: {
                                    properties: {
                                        feeAsset: {type: 'text'},
                                        feeAssetId: {type: 'float'},
                                        feeValue: {type: 'float'},
                                    }
                                },
                                sellerFee: {
                                    properties: {
                                        feeAsset: {type: 'text'},
                                        feeAssetId: {type: 'float'},
                                        feeValue: {type: 'float'},
                                    }
                                },
                                feeMetadata: {
                                    properties: {
                                        asset: {type: 'text'},
                                        executed: {type: 'float'},
                                        value: {type: 'float'},
                                    }
                                }
                            }
                    },
                service:
                    {type: "text"}
            }
    }
}
