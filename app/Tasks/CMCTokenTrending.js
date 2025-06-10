"use strict";

const Task = use("Task");
const FuturesConfig = use("App/Models/Config/FuturesConfig");
const axios = require("axios");
const { sleep } = use("App/Library/Utils");
const RedisCache = use("Redis").connection("cache");
const ms = require("ms");

const REDIS_TRENDING_TOKENS_24H = "market:trending_tokens:24h";

class CMCTokenTrending extends Task {
    constructor(...args) {
        super(...args);
        this.client = new axios.create({
            baseURL: "https://api.coinmarketcap.com",
        });
    }

    static get schedule() {
        return "*/5 * * * *";
    }

    async handle() {
        const limit = 1000;
        const max = 10000;
        const allSymbols = await FuturesConfig.getListCached({
            status: "TRADING",
        });
        console.log("allSymbols", allSymbols.length);
        if (!allSymbols.length) return;

        let ranks = allSymbols.reduce((acc, item) => {
            acc[item.baseAsset] = 0;
            return acc;
        }, {});

        try {
            for (let i = 1; i < max; i += limit) {
                const { data, total } = await this.getTrendingFromCMC(i, limit);

                data.forEach((item, j) => {
                    const symbol = item.symbol;
                    const symbol1000 = `1000${symbol}`;
                    if (ranks.hasOwnProperty(symbol)) {
                        ranks[item.symbol] = total - (i + j);
                    } else if (ranks.hasOwnProperty(symbol1000)) {
                        ranks[symbol1000] = total - (i + j);
                    }
                });

                if (total < i) break;

                await sleep(1000);
            }
        } catch (error) {
            console.error("getTrendingFromCMC Error", error);
            return;
        }

        const listSymbolRanks = Object.entries(ranks)
            .sort((a, b) => b[1] - a[1])
            .map(([symbol]) => symbol);
        try {
            await RedisCache.set(
                REDIS_TRENDING_TOKENS_24H,
                JSON.stringify(listSymbolRanks),
                "px",
                ms("24h")
            );
        } catch (error) {
            console.error("Set Redis: Update Trending Error", error);
        }
    }

    async getTrendingFromCMC(start = 1, limit = 1000) {
        const res = await this.client.get(
            "/data-api/v3/cryptocurrency/listing",
            {
                params: {
                    start,
                    limit,
                    sortBy: "trending_24h",
                    sortType: "desc",
                },
            }
        );

        const { cryptoCurrencyList, totalCount } = res.data.data;
        return {
            data: cryptoCurrencyList,
            total: totalCount,
        };
    }
}

module.exports = CMCTokenTrending;
