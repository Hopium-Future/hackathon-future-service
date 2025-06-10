'use strict'

const path = require('path')

/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
|
| Providers are building blocks for your Adonis app. Anytime you install
| a new Adonis specific package, chances are you will register the
| provider here.
|
*/
const providers = [
    '@adonisjs/framework/providers/AppProvider',
    '@adonisjs/lucid/providers/LucidProvider',
    '@adonisjs/bodyparser/providers/BodyParserProvider',
    '@adonisjs/redis/providers/RedisProvider',
    'adonis-mongoose-model/providers/MongooseProvider',
    '@adonisjs/antl/providers/AntlProvider',
    '@adonisjs/framework/providers/ViewProvider',
    '@adonisjs/mail/providers/MailProvider',
    '@adonisjs/http-logger/providers/LoggerProvider',
    'adonis-scheduler/providers/SchedulerProvider',
    path.join(__dirname, '..', 'providers', 'Logstash/Provider'),
    path.join(__dirname, '..', 'providers', 'BeeQueue/Provider'),
    path.join(__dirname, '..', 'providers', 'Throttle/providers/ThrottleProvider'),
    path.join(__dirname, '..', 'providers', 'Elasticsearch/Provider'),
    path.join(__dirname, '..', 'providers', 'Tracing/Provider'),
    path.join(__dirname, '..', 'providers', 'KafkaProducer/Provider')
]

/*
|--------------------------------------------------------------------------
| Ace Providers
|--------------------------------------------------------------------------
|
| Ace providers are required only when running ace commands. For example
| Providers for migrations, tests etc.
|
*/
const aceProviders = [
    '@adonisjs/lucid/providers/MigrationsProvider',
    'adonis-scheduler/providers/CommandsProvider'
]

/*
|--------------------------------------------------------------------------
| Aliases
|--------------------------------------------------------------------------
|
| Aliases are short unique names for IoC container bindings. You are free
| to create your own aliases.
|
| For example:
|   { Route: 'Adonis/Src/Route' }
|
*/
const aliases = {
    Throttle: 'Adonis/Addons/Throttle',
    Scheduler: 'Adonis/Addons/Scheduler'
}

/*
|--------------------------------------------------------------------------
| Commands
|--------------------------------------------------------------------------
|
| Here you store ace commands for your package
|
*/
const commands = [
    'App/Commands/TestFunc',
    'App/Commands/SyncConfig',
    'App/Commands/Benchmark',
    'App/Commands/SyncRedis',
    'App/Commands/CreateFakeOrder'
]

module.exports = { providers, aceProviders, aliases, commands }
