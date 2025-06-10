module.exports = {
    apps: [
        {
            name: "futures",
            script: 'server.js',
            env: {
                PORT: 5321,
                ENABLE_SCHEDULE: '1'
            }
        },
        // {
        //     name: 'futures-cluster',
        //     script: 'server.js',
        //     instances: 4,
        //     exec_mode: 'cluster',
        //     env: {
        //         PORT: 5322,
        //         ENABLE_SCHEDULE: '0'
        //     }
        // }
    ]
}
