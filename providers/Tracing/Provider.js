const { ServiceProvider } = require('@adonisjs/fold')

class Provider extends ServiceProvider {
    register () {
        this.app.singleton('Tracing', () => {
            const Config = this.app.use('Adonis/Src/Config')
            return new (require('.'))(Config.get('tracing'))
        })
    }
}

module.exports = Provider
