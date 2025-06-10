'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')

module.exports = { node: Env.get('ELASTICSEARCH_NODE', 'http://localhost:9200') }
