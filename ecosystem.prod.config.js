module.exports = {
    apps: [
        {
            name: "futures-sv-0",
            script: 'server.js',
            env: {
                PORT: 5321,
                ENABLE_SCHEDULE: '1'
            }
        },
        {
            name: "futures-sv-2",
            script: 'server.js',
            env: {
                PORT: 5322,
                ENABLE_SCHEDULE: '0'
            }
        },
        {
            name: "futures-sv-3",
            script: 'server.js',
            env: {
                PORT: 5323,
                ENABLE_SCHEDULE: '0'
            }
        },
        {
            name: "futures-sv-4",
            script: 'server.js',
            env: {
                PORT: 5324,
                ENABLE_SCHEDULE: '0'
            }
        }
    ]
}
