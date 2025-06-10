'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FeeTable extends Model {
    static get table() {
      return "fees";
    }

    
}

module.exports = FeeTable
