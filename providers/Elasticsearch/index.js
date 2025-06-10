const { Client } = require('@elastic/elasticsearch');

class Elasticsearch {
  constructor(Config) {
    this.client = new Client({
      node: Config.get('elasticsearch.node')
    });
  }

  async insert(index, data) {
    return this.client.bulk({ refresh: true, body: [{ index: { _index: index } }, data] })
  }

  async bulk(index, data = []) {
    const operations = data.flatMap(item => [
      {
        index: {
          _index: index,
          _id: item._id
        },
      },
      { ...(item?.toObject ? item?.toObject() : item), _id: undefined, __v: undefined },
    ]);

    if (operations.length > 0) {
      return this.client.bulk({ refresh: true, body: operations })
    }
  }

  async search(index, options = {}) {
    return this.client.search({
      index,
      ...options
    })
  }

  async template(template, overwrite = false) {
    if (!overwrite) {
      const existed = await this.client.indices.existsTemplate({ name: template.name })
      if(existed) return
    }
    console.log('Create template', template)
    return this.client.indices.putTemplate({
      name: template.name,
      body: template.body
    })
  }
}

module.exports = Elasticsearch