'use strict'

const BaseModel = use('MongooseModel')

// * @class User

class User extends BaseModel {
    static get schemaOptions () {
        return { collection: 'users' }
    }

    static get schema () {
        return {
            _id: Number,
            telegramId: Number,
            referralCode: String,
            username: String,
            firstName: String,
            lastName: String,
            allowsWriteToPm: Boolean,
            addedToAttachmentMenu: Boolean,
            languageCode: String,
            photoUrl: String,
            isPremium: Boolean,
            roleId: Number,
            partnerType: Number
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }
}

module.exports = User.buildModel('User')
