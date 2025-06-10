const { ServiceProvider } = require('@adonisjs/fold')

class ElasticsearchProvider extends ServiceProvider {
  register () {
    this.app.singleton('Elasticsearch', () => {
      const Config = this.app.use('Adonis/Src/Config')
      return new (require('.'))(Config)
    })
  }
}

module.exports = ElasticsearchProvider