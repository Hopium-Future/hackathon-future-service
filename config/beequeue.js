'use strict'

const Config = use('Config')
const RedisConfig = Config.get('redis')
const PROD = process.env.NODE_ENV === 'production'

module.exports = {
    default: { redis: { ...RedisConfig.beequeue } },
    futures: {
        prefix: 'futures::queue:bq:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures1: {
        prefix: 'futures::queue:bq_1:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures2: {
        prefix: 'futures::queue:bq_2:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures3: {
        prefix: 'futures::queue:bq_3:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures4: {
        prefix: 'futures::queue:bq_4:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures5: {
        prefix: 'futures::queue:bq_5:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures6: {
        prefix: 'futures::queue:bq_6:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures7: {
        prefix: 'futures::queue:bq_7:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    futures8: {
        prefix: 'futures::queue:bq_8:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: true,
        removeOnSuccess: true,
        removeOnFailure: true
    },
    updateUserProduct: {
        prefix: 'user_product:bq:',
        redis: { ...RedisConfig.beequeue },
        activateDelayedJobs: false,
        removeOnSuccess: true,
        removeOnFailure: true
    }
}
