'use strict'

const { Command } = require('@adonisjs/ace')
const AssetInfo = use('App/Models/Config/AssetInfo')
const AssetConfig = use('App/Models/Config/AssetConfig')
const _ = require('lodash')
const axios = require('axios')

const CMC_KEY = 'a03efa91-54b6-40ce-8737-0a22a8fde176'
class TestFunc extends Command {
    static get signature () {
        return 'sync-asset-config'
    }

    static get description () {
        return 'Tell something helpful about this command'
    }

    async handle (args, options) {
       await this.syncCoinmakercap()

    }

    async syncNamiAssetConfig(){

        const data = await AssetConfig.find({})

        data.forEach(async item=>{
            const {id, assetCode} = item
            console.log('SYnc', assetCode)
            await AssetInfo.updateOne({symbol: assetCode.toLowerCase()}, {
                $set: {
                    symbol: assetCode,
                    asset_id: id
                }
            })
        })

        console.log('done syncNamiAssetConfig')


    }

    async syncCoinmakercap(){
        const {data: {data}} = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            params: {
                CMC_PRO_API_KEY: CMC_KEY,
                start: 1,
                limit: 5000
            }
        })
        //console.log('__ check data length', data.length)
        data.forEach(async item=>{
            const {symbol} = item
            console.log('SYnc', symbol)
            await AssetInfo.updateOne({symbol: item.symbol}, {
                $set: {
                    symbol: item.symbol,
                    cmc_id: item.id,
                    date_added: item.date_added,
                    tags: item.tags,
                    max_supply: item.max_supply,
                    circulating_supply: item.circulating_supply,
                    total_supply: item.total_supply,
                    cmc_rank: item.cmc_rank,
                }
            })
        })
        console.log('done sync syncCoinmakercap')
    }

    async syncCoinmakercapMetadata(){

        const assets = await AssetInfo.find({cmc_id: {$ne: null}})
        .skip(4100)
        .limit(2000)

        const ids = assets.map(item=> item.cmc_id)
        //console.log('__ check cmc id ', ids)
        const chunk = _.chunk(ids, 100)
        chunk.forEach(async list=>{
            const idParams = list.join(',')
            //console.log('__ check data length', idParams)
            const {data: {data}} = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/info', {
                params: {
                    CMC_PRO_API_KEY: CMC_KEY,
                    id: idParams,
                }
            })
            //console.log('__ check data length', idParams, data.length)
            Object.values(data).forEach(async item=>{
                const {symbol} = item
                console.log('SYnc', symbol)
                await AssetInfo.updateOne({cmc_id: item.id}, {
                    $set: {
                        category: item.category,
                        description: item.description,
                        slug: item.slug,
                        subreddit: item.subreddit,
                        tag_names: item['tag-names'],
                        tag_groups: item['tag-groups'],
                        urls: item.urls,
                        twitter_username: item.twitter_username,
                    }
                })
            })

        })

        console.log('done sync syncCoinmakercap metadata')


    }
    async syncCoingecko(){
        const {data} = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
        //console.log('__ check data length', data.length)
        const chunk = _.chunk(data, 50)
        chunk.forEach(async list=>{
            const insertList = list.map(item=> {
                return {
                    coingecko_id: item.id,
                    symbol: item.symbol,
                    name: item.name,
                    platforms: item.platforms
                }
            })
            await AssetInfo.insertMany(insertList)
        })

        console.log('done sync coingecko')
    }

}

module.exports = TestFunc
