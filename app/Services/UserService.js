const User = use('App/Models/Mongo/User')

class UserService {
    static async checkIsBot (userId) {
        const user = await User.findOne({ _id: userId }, {
            _id: 1,
            roleId: 1,
            partnerType: 1,
            username: 1,
            firstName: 1,
            lastName: 1,
            photoUrl: 1
        }).read('s')
        return {
            isBot: user?.roleId && Number(user?.roleId) === -1,
            partnerType: user?.partnerType || 0,
            username: user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`,
            photoUrl: user?.photoUrl || null
        }
    }

    static async getPartnerType (userId) {
        const user = await User.findOne({ _id: userId }, { partnerType: 1 }).read('s')
        return user?.partnerType || 0
    }
}

module.exports = UserService

UserService.PartnerType = {
    0: 'Newbie',
    1: 'Ambassador',
    2: 'Rookie',
    3: 'Degen',
    4: 'Pro',
    5: 'Elite',
    6: 'Legend'
}

UserService.Partner = {
    USER: 'USER',
    Ambassador: 'Ambassador',
    Newbie: 'Newbie',
    Rookie: 'Rookie',
    Degen: 'Degen',
    Pro: 'Pro',
    Elite: 'Elite',
    Legend: 'Legend'
}
