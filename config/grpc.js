const path = require('path')

const Helpers = use('Helpers')

module.exports = {
    api: {
        host: process.env.GRPC_API_HOST,
        protoPath: path.join(Helpers.appRoot(), '../na3-interface/proto', 'api.proto'),
        serviceName: 'Api'
    }
}
