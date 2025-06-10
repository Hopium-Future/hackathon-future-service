"use strict";

/** @type {import('@adonisjs/framework/src/Server')} */
const Server = use("Server");
const Tracing = use("Tracing");
const Config = use("Config");

const tracingConfig = Config.get("tracing");

if (tracingConfig.enable) {
    console.log("=== Tracing enabled ===", tracingConfig);
    Tracing.start();

    process.on("SIGTERM", () => {
        Tracing.shutdown();
    });
}

/*
|--------------------------------------------------------------------------
| Global Middleware
|--------------------------------------------------------------------------
|
| Global middleware are executed on each http request only when the routes
| match.
|
*/
const globalMiddleware = [
    'Adonis/Middleware/BodyParser',
    'App/Middleware/ConvertEmptyStringsToNull',
    'App/Middleware/Hook',
    'App/Middleware/Fingerprint'
]

/*
|--------------------------------------------------------------------------
| Named Middleware
|--------------------------------------------------------------------------
|
| Named middleware is key/value object to conditionally add middleware on
| specific routes or group of routes.
|
| // define
| {
|   auth: 'Adonis/Middleware/Auth'
| }
|
| // use
| Route.get().middleware('auth')
|
*/

const namedMiddleware = {
    session: 'App/Middleware/SessionUser',
    auth: 'App/Middleware/HasAuth',
    checkBearer: 'App/Middleware/CheckBearer',
    checkSecretKey: 'App/Middleware/CheckSecretKey'
}
/*
|--------------------------------------------------------------------------
| Server Middleware
|--------------------------------------------------------------------------
|
| Server level middleware are executed even when route for a given URL is
| not registered. Features like `static assets` and `cors` needs better
| control over request lifecycle.
|
*/
const serverMiddleware = [
]

Server
    .registerNamed(namedMiddleware)
    .registerGlobal(globalMiddleware)
    .use(serverMiddleware)

if (!use('Helpers').isAceCommand() && process.env.ENABLE_SCHEDULE === '1') {
    const Scheduler = use('Adonis/Addons/Scheduler')
    Scheduler.run()
}
