/*eslint-disable*/
'use strict'

const _ = require("lodash")

class Common {
    static async validateEmail (email) {
        const re = /^(([^<>()\[\]\\.,:\s@"]+(\.[^<>()\[\]\\.,:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return await re.test(String(email)
            .toLowerCase())
    }

    static async validatePhoneNumber (phoneNumber) {
        const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
        return await re.test(String(phoneNumber)
            .toLowerCase())
    }

    static async validateDate (date) {
        date = await this.removeAllText(date)
        const re = /^(0?[1-9]|[12][0-9]|3[01])(-|\/)(0?[1-9]|1[0-2])(-|\/)\d\d\d\d$/im
        return await re.test(String(date)
            .toLowerCase())
    }

    static removeSignVietnamese (str) {
        if (typeof str === 'string') {
            str = str.toLowerCase()
            str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
            str = str.replace(/[èéẹẻẽêềếệểễ]/g, "e")
            str = str.replace(/[ìíịỉĩ]/g, "i")
            str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
            str = str.replace(/[ùúụủũưừứựửữ]/g, "u")
            str = str.replace(/[ỳýỵỷỹ]/g, "y")
            str = str.replace(/đ/g, "d")
            return str
        }
        return ''
    }

    static toUnsign (title) {
        let slug

        // Đổi chữ hoa thành chữ thường
        slug = title.toLowerCase()

        // Đổi ký tự có dấu thành không dấu
        slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
        slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
        slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
        slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
        slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
        slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
        slug = slug.replace(/đ/gi, 'd')
        // Xóa các ký tự đặt biệt
        slug = slug.replace(/\`|\~|\!|\@|\#|\||\$|\%|\^|\&|\*|\(|\)|\+|\=|\,|\.|\/|\?|\>|\<|\'|\"|\:|\|_/gi, '')
        // Đổi khoảng trắng thành ký tự gạch ngang
        slug = slug.replace(/ /gi, '-')
        // Đổi nhiều ký tự gạch ngang liên tiếp thành 1 ký tự gạch ngang
        // Phòng trường hợp người nhập vào quá nhiều ký tự trắng
        slug = slug.replace(/\-\-\-\-\-/gi, '-')
        slug = slug.replace(/\-\-\-\-/gi, '-')
        slug = slug.replace(/\-\-\-/gi, '-')
        slug = slug.replace(/\-\-/gi, '-')
        // Xóa các ký tự gạch ngang ở đầu và cuối
        slug = `@${slug}@`
        slug = slug.replace(/\@\-|\-\@|\@/gi, '')
        slug = slug.replace(/\s+/gi, '')

        return slug
    }

    static async removeAllText (text) {
        let slug
        // Đổi chữ hoa thành chữ thường
        slug = text.toLowerCase()

        // Đổi ký tự có dấu thành không dấu
        slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ|a/gi, '')
        slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, '')
        slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, '')
        slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, '')
        slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, '')
        slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, '')
        slug = slug.replace(/đ/gi, '')
        slug = slug.replace(/ /gi, '')
        slug = slug.replace(/a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z/gi, '')
        slug = slug.replace(/\//gi, '-')

        return await slug
    }

    static async dateToTimestamp (str) {
        return new Date(str).getTime() / 1000
    }

    static async getNow () {
        return _.toInteger(_.now() / 1000)
    }

    static async randomStr () {
        let text = ""
        // const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        const possible = "0123456789"

        for (let i = 0; i < 8; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))

        return `Nami${text}`
    }

    static getDecimalScale (value = 0.00000001) {
        let decimalScale = 8
        if (value && value > 0 && value <= 1) {
            decimalScale = +(-(Math.log(value) / Math.log(10))).toFixed(0)
        }
        return decimalScale
    }
}

module.exports = Common
