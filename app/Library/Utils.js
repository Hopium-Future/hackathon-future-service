const { MMRConfig } = use('App/Library/Enum')
const _ = require('lodash')
const Big = require('big.js')
const numeral = require('numeral')

exports.getDecimalScale = function getDecimalScale (value = 0.00000001) {
    let decimalScale = 8
    if (value && value > 0 && value <= 1) {
        decimalScale = +(-Math.floor(Math.log(value) / Math.log(10))).toFixed(0)
    }
    return decimalScale
}

exports.isInvalidPrecision = function isInvalidPrecision (value, precision, decimals) {
    if (!precision) {
        return false
    }
    if (decimals == null) {
        decimals = getDecimalScaleFromStep(precision)
    }
    return +(Math.round(+value / precision) * precision).toFixed(decimals) !== value
}

function getDecimalScaleFromStep (step) {
    if (step > 1 || step < 0) {
        return 8
    }
    return Math.max(Math.floor(-Math.log10(step)), 0)
}
exports.getDecimalScaleFromStep = getDecimalScaleFromStep

exports.formatNumber = function(value) {
    if (_.isNil(value)) return "0"
    if (Math.abs(+value) < 1e-8) return "0"
    return numeral(+value)
        .format("0,0.[0000]", Math.floor)
}

function exponentialToDecimal (number, digits = 0) {
    if (!number) return 0
    const str = number.toString()
    const dotIndex = str.indexOf('.')
    if (digits === 0) {
        return dotIndex === -1 ? str : str.substring(0, dotIndex)
    }
    if (dotIndex === -1 || str.length - dotIndex - 1 < digits) {
        return str
    }
    return str.substring(0, dotIndex + digits + 1)
}
exports.exponentialToDecimal = exponentialToDecimal

exports.formatNumberToDecimal = function(number, digits = 0) {
    const formatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0
    })
    return formatter.format(+exponentialToDecimal(number, digits))
}

const EPS = 0.00000001

exports.lt = function(a, b) {
    return Big(b)
        .minus(a)
        .gt(EPS)
}

exports.gt = function(a, b) {
    return Big(a)
        .minus(b)
        .gt(EPS)
}

exports.removeAccents = function(str) {
    // remove accents
    const from = "àáãảạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịäëïîöüûñçýỳỹỵỷ"
    const to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeduuuuuuuuuuuoooooooooooooooooiiiiiaeiiouuncyyyyy"
    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(RegExp(from[i], "gi"), to[i])
    }
    str = str.toUpperCase()
        .trim()
        .replace(/[^A-Z0-9\-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/-/g, ' ')
    return str
}

exports.sleep = function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

exports.getMMR = function(maxLeverage) {
    const keys = Object.keys(MMRConfig).map(Number)
    const closest = keys.reduce((prev, curr) => (Math.abs(curr - maxLeverage) < Math.abs(prev - maxLeverage) ? curr : prev))
    return MMRConfig[closest]
}
