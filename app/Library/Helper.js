'use strict'

const jwt = require('jsonwebtoken')
const axios = require('axios')
const querystring = require('querystring')

const Env = use("Env")
const _ = require("lodash")

class Helper {
    static async encodeData (jwtData) {
        return jwt.sign({ jwtData }, Env.get('API_SECRET_KEY'))
    }

    // eslint-disable-next-line consistent-return
    static async decodeData (jwtData) {
        try {
            return jwt.verify(jwtData, Env.get('API_SECRET_KEY'))
        } catch (e) {
            console.log("decodeData exception", e)
        }
    }

    static async submitGoogleDoc (url, data) {
        return axios({
            url,
            method: 'POST',
            data: querystring.stringify(data)
        })
    }

    static async dateToTimestamp (str) {
        return new Date(str).getTime() / 1000
    }

    static async getNow () {
        return _.toInteger(_.now() / 1000)
    }

    static safelyParseJSON (json) {
        // This function cannot be optimised, it's best to
        // keep it small!
        let parsed = null
        if (json !== undefined && json !== null) {
            try {
                parsed = JSON.parse(json)
            } catch (e) {
                console.log('parse json error', e)
                return null
            }
        }
        return parsed // Could be undefined!
    }
}

module.exports = Helper
