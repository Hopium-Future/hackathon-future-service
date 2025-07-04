'use strict'

const Env = use('Env')
const Config = use('Config')

module.exports = {
    /*
  |--------------------------------------------------------------------------
  | Session Driver
  |--------------------------------------------------------------------------
  |
  | The session driver to be used for storing session values. It can be
  | cookie, file or redis.
  |
  | For `redis` driver, make sure to install and register `@adonisjs/redis`
  |
  */
    driver: Env.get('SESSION_DRIVER', 'cookie'),

    /*
  |--------------------------------------------------------------------------
  | Cookie Name
  |--------------------------------------------------------------------------
  |
  | The name of the cookie to be used for saving session id. Session ids
  | are signed and encrypted.
  |
  */
    cookieName: 'nami-game-session',

    /*
  |--------------------------------------------------------------------------
  | Clear session when browser closes
  |--------------------------------------------------------------------------
  |
  | If this value is true, the session cookie will be temporary and will be
  | removed when browser closes.
  |
  */
    clearWithBrowser: false,

    /*
  |--------------------------------------------------------------------------
  | Session age
  |--------------------------------------------------------------------------
  |
  | This value is only used when `clearWithBrowser` is set to false. The
  | age must be a valid https://npmjs.org/package/ms string or should
  | be in milliseconds.
  |
  | Valid values are:
  |  '2h', '10d', '5y', '2.5 hrs'
  |
  */
    age: Config.get('app.sessionAge'),

    /*
  |--------------------------------------------------------------------------
  | Cookie options
  |--------------------------------------------------------------------------
  |
  | Cookie options defines the options to be used for setting up session
  | cookie
  |
  */
    cookie: {
        httpOnly: true,
        path: '/',
        sameSite: false
    },

    /*
  |--------------------------------------------------------------------------
  | Sessions location
  |--------------------------------------------------------------------------
  |
  | If driver is set to file, we need to define the relative location from
  | the temporary path or absolute url to any location.
  |
  */
    file: { location: 'sessions' },

    /*
  |--------------------------------------------------------------------------
  | Redis config
  |--------------------------------------------------------------------------
  |
  | The configuration for the redis driver.
  |
  */
    redis: {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        db: 0,
        keyPrefix: ''
    }
}
