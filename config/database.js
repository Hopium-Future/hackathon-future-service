'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')

/** @type {import('@adonisjs/ignitor/src/Helpers')} */
const Helpers = use('Helpers')

module.exports = {
    /*
    |--------------------------------------------------------------------------
    | Default Connection
    |--------------------------------------------------------------------------
    |
    | Connection defines the default connection settings to be used while
    | interacting with SQL databases.
    |
    */
    connection: Env.get('DB_CONNECTION', 'mysql'),

    mongodb: {
        connectionString: Env.get('MONGO_CONNECTION_STRING', null),
        connection: {
            host: Env.get('MONGO_HOST', 'localhost'),
            port: Env.get('MONGO_PORT', 27017),
            user: Env.get('MONGO_USER', ''),
            pass: Env.get('MONGO_PASSWORD', ''),
            database: Env.get('MONGO_DATABASE', 'adonis'),
            options: {
                options: { replicaSet: Env.get('MONGO_REPLICA_SET', '') }
                // All options can be found at http://mongoosejs.com/docs/connections.html
            },
            debug: Env.get('MONGO_DEBUG', false) == 'true'
        }
    },

    /*
    |--------------------------------------------------------------------------
    | Sqlite
    |--------------------------------------------------------------------------
    |
    | Sqlite is a flat file database and can be good choice under development
    | environment.
    |
    | npm i --save sqlite3
    |
    */
    sqlite: {
        client: 'sqlite3',
        connection: { filename: Helpers.databasePath(`${Env.get('DB_DATABASE', 'development')}.sqlite`) },
        useNullAsDefault: true,
        debug: Env.get('DB_DEBUG', false)
    },

    /*
    |--------------------------------------------------------------------------
    | MySQL
    |--------------------------------------------------------------------------
    |
    | Here we define connection settings for MySQL database.
    |
    | npm i --save mysql
    |
    */
    mysql: {
        client: 'mysql',
        connection: {
            host: Env.get('DB_HOST', 'localhost'),
            port: Env.get('DB_PORT', ''),
            user: Env.get('DB_USER', 'root'),
            password: Env.get('DB_PASSWORD', ''),
            database: Env.get('DB_DATABASE', 'adonis')
        },
        debug: Env.get('DB_DEBUG', false),
        pool: { min: 0, max: 200 }
    },

    /*
    |--------------------------------------------------------------------------
    | PostgreSQL
    |--------------------------------------------------------------------------
    |
    | Here we define connection settings for PostgreSQL database.
    |
    | npm i --save pg
    |
    */
    pg: {
        client: 'pg',
        connection: {
            host: Env.get('DB_HOST', 'localhost'),
            port: Env.get('DB_PORT', ''),
            user: Env.get('DB_USER', 'root'),
            password: Env.get('DB_PASSWORD', ''),
            database: Env.get('DB_DATABASE', 'adonis')
        },
        debug: Env.get('DB_DEBUG', false)
    }
}
