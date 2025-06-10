'use strict'
const { ioc } = require('@adonisjs/fold')
const grpc = require('@grpc/grpc-js')
const protoLoader = require("@grpc/proto-loader")
const _ = require('lodash')

const DEFAULT_NAME = 'default'
const CONFIG_PREFIX = 'grpc'

module.exports = class {
    constructor (Config, name) {
        this.Config = Config
        this._pool = {}

        return new Proxy(this, require('./proxyHandler'))
    }

    connection (name) {
        if (!name) name = DEFAULT_NAME

        if (this._pool[name]) {
            return this._pool[name]
        }

        let config = this.Config.get(`${CONFIG_PREFIX}.${name}`)
        if (!config) config = this.Config.get(`${CONFIG_PREFIX}.${DEFAULT_NAME}`)
        if (!config) throw new Error(`Grpc for config ${name} not found`)
        if (!config.host) throw new Error(`Grpc host for config ${name} not found`)

        /**
         * CREATE INSTANCE
         */
        const proto = protoLoader.loadSync(config.protoPath)
        const definition = grpc.loadPackageDefinition(proto)
        const instance = new definition[config.serviceName](config.host, grpc.credentials.createInsecure())
        promisifyAllForClient(instance, proto, config)
        /**
         * END
         */

        this._pool[name] = instance
        return instance
    }
}

function promisifyAllForClient(client, proto, config) {
    const listMethods = proto[config.serviceName]
    for (const key in listMethods) {
        if (!(listMethods.hasOwnProperty(key))) {
            return
        }
        const methodName = listMethods[key].originalName

        const customHandler = buildCustomHandlerForFunction(methodName, client, proto, config)
        if (!customHandler) {
            // Stole from https://github.com/zetogk/node-grpc-client/blob/master/index.js
            client[`${methodName}Async`] = (data, options = {}) => buildPromisify(options, client, methodName, data)
        }
    }
}

function buildCustomHandlerForFunction(methodName, client, proto, config) {
    if (methodName === 'emitSocket') {
        client[`${methodName}Async`] = (...args) => {
            const dataToPass = {
                userId: args[0],
                event: args[1],
                data: JSON.stringify(args[2]),
            }
            const options = args[3]
            return buildPromisify(options, client, methodName, dataToPass)
        }
        return true
    }
    else if (methodName === 'isUserOnline') {
        client[`${methodName}Async`] = (...args) => {
            const dataToPass = {
                userId: args[0],
            }
            const options = args[1]
            return buildPromisify(options, client, methodName, dataToPass)
        }
        return true
    }
}

function buildPromisify(options, client, methodName, dataToPass) {
    let metadataGrpc = {}
    if (options && ('metadata' in options) && (typeof options.metadata == 'object')) {
        metadataGrpc = generateMetadata(options.metadata)
    }
    return new Promise((resolve, reject) => {
        client[methodName](dataToPass, metadataGrpc, (err, data) => {
            if (err) {
                return reject(err)
            }
            resolve(parseFromRpc(data))
        })
    })
}

function parseFromRpc(data) {
    if (!data || typeof data !== 'object') {
        return data
    }
    if (data.createdAt != null) {
        data.createdAt = parseDateFromRpc(data.createdAt)
    }
    if (data.updatedAt != null) {
        data.updatedAt = parseDateFromRpc(data.updatedAt)
    }
    return data
}

const generateMetadata = metadata => {
    const metadataGrpc = new grpc.Metadata()
    for (const [key, val] of Object.entries(metadata)) {
        metadataGrpc.add(key, val)
    }
    return metadataGrpc
}

function parseDateFromRpc(data) {
    return new Date(+data)
}
