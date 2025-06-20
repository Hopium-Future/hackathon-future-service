module.exports = {
    CONTINUE: { code: 100, status: "CONTINUE", message: "CONTINUE" },
    SWITCHING_PROTOCOLS: { code: 101, status: "SWITCHING_PROTOCOLS", message: "SWITCHING_PROTOCOLS" },
    OK: { code: 200, status: "OK", message: "OK" },
    CREATED: { code: 201, status: "CREATED", message: "CREATED" },
    ACCEPTED: { code: 202, status: "ACCEPTED", message: "ACCEPTED" },
    NON_AUTHORITATIVE_INFORMATION: { code: 203, status: "NON_AUTHORITATIVE_INFORMATION", message: "NON_AUTHORITATIVE_INFORMATION" },
    NO_CONTENT: { code: 204, status: "NO_CONTENT", message: "NO_CONTENT" },
    RESET_CONTENT: { code: 205, status: "RESET_CONTENT", message: "RESET_CONTENT" },
    PARTIAL_CONTENT: { code: 206, status: "PARTIAL_CONTENT", message: "PARTIAL_CONTENT" },
    MULTIPLE_CHOICES: { code: 300, status: "MULTIPLE_CHOICES", message: "MULTIPLE_CHOICES" },
    MOVED_PERMANENTLY: { code: 301, status: "MOVED_PERMANENTLY", message: "MOVED_PERMANENTLY" },
    FOUND: { code: 302, status: "FOUND", message: "FOUND" },
    SEE_OTHER: { code: 303, status: "SEE_OTHER", message: "SEE_OTHER" },
    NOT_MODIFIED: { code: 304, status: "NOT_MODIFIED", message: "NOT_MODIFIED" },
    USE_PROXY: { code: 305, status: "USE_PROXY", message: "USE_PROXY" },
    TEMPORARY_REDIRECT: { code: 307, status: "TEMPORARY_REDIRECT", message: "TEMPORARY_REDIRECT" },
    BAD_REQUEST: { code: 400, status: "BAD_REQUEST", message: "BAD_REQUEST" },
    UNAUTHORIZED: { code: 401, status: "UNAUTHORIZED", message: "UNAUTHORIZED" },
    PAYMENT_REQUIRED: { code: 402, status: "PAYMENT_REQUIRED", message: "PAYMENT_REQUIRED" },
    FORBIDDEN: { code: 403, status: "FORBIDDEN", message: "FORBIDDEN" },
    NOT_FOUND: { code: 404, status: "NOT_FOUND", message: "NOT_FOUND" },
    METHOD_NOT_ALLOWED: { code: 405, status: "METHOD_NOT_ALLOWED", message: "METHOD_NOT_ALLOWED" },
    NOT_ACCEPTABLE: { code: 406, status: "NOT_ACCEPTABLE", message: "NOT_ACCEPTABLE" },
    PROXY_AUTHENTICATION_REQUIRED: { code: 407, status: "PROXY_AUTHENTICATION_REQUIRED", message: "PROXY_AUTHENTICATION_REQUIRED" },
    REQUEST_TIMEOUT: { code: 408, status: "REQUEST_TIMEOUT", message: "REQUEST_TIMEOUT" },
    CONFLICT: { code: 409, status: "CONFLICT", message: "CONFLICT" },
    GONE: { code: 410, status: "GONE", message: "GONE" },
    LENGTH_REQUIRED: { code: 411, status: "LENGTH_REQUIRED", message: "LENGTH_REQUIRED" },
    PRECONDITION_FAILED: { code: 412, status: "PRECONDITION_FAILED", message: "PRECONDITION_FAILED" },
    REQUEST_ENTITY_TOO_LARGE: { code: 413, status: "REQUEST_ENTITY_TOO_LARGE", message: "REQUEST_ENTITY_TOO_LARGE" },
    REQUEST_URI_TOO_LONG: { code: 414, status: "REQUEST_URI_TOO_LONG", message: "REQUEST_URI_TOO_LONG" },
    UNSUPPORTED_MEDIA_TYPE: { code: 415, status: "UNSUPPORTED_MEDIA_TYPE", message: "UNSUPPORTED_MEDIA_TYPE" },
    REQUESTED_RANGE_NOT_SATISFIABLE: { code: 416, status: "REQUESTED_RANGE_NOT_SATISFIABLE", message: "REQUESTED_RANGE_NOT_SATISFIABLE" },
    EXPECTATION_FAILED: { code: 417, status: "EXPECTATION_FAILED", message: "EXPECTATION_FAILED" },
    UNPROCESSABLE_ENTITY: { code: 422, status: "UNPROCESSABLE_ENTITY", message: "UNPROCESSABLE_ENTITY" },
    TOO_MANY_REQUESTS: { code: 429, status: "TOO_MANY_REQUESTS", message: "TOO_MANY_REQUESTS" },
    INTERNAL_SERVER_ERROR: { code: 500, status: "INTERNAL_SERVER_ERROR", message: "INTERNAL_SERVER_ERROR" },
    NOT_IMPLEMENTED: { code: 501, status: "NOT_IMPLEMENTED", message: "NOT_IMPLEMENTED" },
    BAD_GATEWAY: { code: 502, status: "BAD_GATEWAY", message: "BAD_GATEWAY" },
    SERVICE_UNAVAILABLE: { code: 503, status: "SERVICE_UNAVAILABLE", message: "SERVICE_UNAVAILABLE" },
    GATEWAY_TIMEOUT: { code: 504, status: "GATEWAY_TIMEOUT", message: "GATEWAY_TIMEOUT" },
    UNKNOWN: { code: 1000, status: "UNKNOWN", message: "UNKNOWN" },
    INVALID_ORDER_TYPE: { code: 1110, status: "INVALID_ORDER_TYPE", message: "INVALID_ORDER_TYPE" },
    INVALID_SIDE: { code: 1111, status: "INVALID_SIDE", message: "INVALID_SIDE" },
    BAD_SYMBOL: { code: 1112, status: "BAD_SYMBOL", message: "BAD_SYMBOL" },
    INVALID_REQUEST_ID: { code: 1113, status: "INVALID_REQUEST_ID", message: "INVALID_REQUEST_ID" },
    INVALID_VOLUME: { code: 1114, status: "INVALID_VOLUME", message: "INVALID_VOLUME" },
    NO_SUCH_ORDER: { code: 2013, status: "NO_SUCH_ORDER", message: "NO_SUCH_ORDER" },
    TRADE_NOT_ALLOWED: { code: 3004, status: "TRADE_NOT_ALLOWED", message: "TRADE_NOT_ALLOWED" },
    ACCOUNT_BAN_TRADE: { code: 3005, status: "ACCOUNT_BAN_TRADE", message: "ACCOUNT_BAN_TRADE" },
    INSTRUMENT_NOT_LISTED_FOR_TRADING_YET: { code: 3006, status: "INSTRUMENT_NOT_LISTED_FOR_TRADING_YET", message: 'Trading pairs not yet supported' },
    NAO_IS_MAINTAINED: { code: 3006, status: "NAO_IS_MAINTAINED", message: 'Trading pairs not yet supported' },
    MAINTAIN: { code: 3006, status: "MAINTAIN", message: 'This function is under maintenance, please come back later' },
    BALANCE_INSUFFICIENT: { code: 3007, status: "BALANCE_INSUFFICIENT", message: "Your balance is not enough" },
    NOT_FOUND_ORDER: { code: 6101, status: 'NOT_FOUND_ORDER', message: 'Not found order' },
    ORDER_ALREADY_CLOSED: { code: 6101, status: 'ORDER_ALREADY_CLOSED', message: 'Order is already closed' },
    ORDER_ALREADY_ACTIVE: { code: 6101, status: 'ORDER_ALREADY_ACTIVE', message: 'Order is already actived' },
    REQUEST_TIMED_OUT: { code: 6101, status: 'REQUEST_TIMED_OUT', message: 'Your request is timed out' },
    NOT_ENOUGH_BASE_ASSET: { code: 6102, status: 'NOT_ENOUGH_BASE_ASSET', message: 'Your balance is not enough' },
    NOT_ENOUGH_QUOTE_ASSET: { code: 6103, status: 'NOT_ENOUGH_QUOTE_ASSET', message: 'Your balance is not enough' },
    BROKER_ERROR: { code: 6104, status: 'BROKER_ERROR', message: 'BROKER_ERROR' },
    NOT_ENOUGH_FEE_ASSET: { code: 6106, status: 'NOT_ENOUGH_FEE_ASSET', message: 'NOT_ENOUGH_FEE_ASSET' },
    STOP_LIMIT_INVALID_STOP_PRICE: { code: 6107, status: 'STOP_LIMIT_INVALID_STOP_PRICE', message: 'STOP_LIMIT_INVALID_STOP_PRICE' },
    STOP_LIMIT_UNKNOWN_LAST_PRICE: { code: 6108, status: 'STOP_LIMIT_UNKNOWN_LAST_PRICE', message: 'STOP_LIMIT_UNKNOWN_LAST_PRICE' },
    STOP_LIMIT_INVALID_MIN_TOTAL: { code: 6109, status: 'STOP_LIMIT_INVALID_MIN_TOTAL', message: 'STOP_LIMIT_INVALID_MIN_TOTAL' },
    ORDER_TYPE_NOT_SUPPORT: { code: 6110, status: 'ORDER_TYPE_NOT_SUPPORT', message: 'ORDER_TYPE_NOT_SUPPORT' },
    INVALID_REQUEST_ASSET: { code: 6200, status: 'INVALID_REQUEST_ASSET', message: 'INVALID_REQUEST_ASSET' },
    INVALID_SWAP_REQUEST_ID: { code: 6201, status: 'INVALID_SWAP_REQUEST_ID', message: 'INVALID_SWAP_REQUEST_ID' },
    PRICE_CHANGED: { code: 6202, status: 'PRICE_CHANGED', message: 'PRICE_CHANGED' },
    SWAP_CANNOT_ESTIMATE_PRICE: { code: 6203, status: 'SWAP_CANNOT_ESTIMATE_PRICE', message: 'SWAP_CANNOT_ESTIMATE_PRICE' },

    // Filter error
    PRICE_FILTER: { code: 9000, status: "PRICE_FILTER", message: "price is too high, too low, and/or not following the tick size rule for the symbol." },
    SL_FILTER: { code: 9000, status: "SL_FILTER", message: "SL is too high, too low, and/or not following the tick size rule for the symbol." },
    SL_FILTER_MARGIN_CALL: { code: 9000, status: "SL_FILTER_MARGIN_CALL", message: "When a position has 80% negative profit, the user will not be able to change the previously set Stop Loss price level or set a new Stop Loss price." },
    TP_FILTER: { code: 9000, status: "TP_FILTER", message: "TP is too high, too low, and/or not following the tick size rule for the symbol." },
    PERCENT_PRICE: { code: 9001, status: "PERCENT_PRICE", message: "price is {percentUp}% too high or {percentDown}%  too low from the average weighted price." },
    PERCENT_SL_TP_PRICE: { code: 9001, status: "PERCENT_SL_TP_PRICE", message: "SL/TP is {percentUp}% too high or {percentDown}%  too low from the average weighted price." },
    MIN_DIFFERENCE_ACTIVE_PRICE: { code: 9001, status: "MIN_DIFFERENCE_ACTIVE_PRICE", message: "The active price difference can not be less than {differencePercent}% from the average weighted price." },
    MIN_DIFFERENCE_SL_TP_PRICE: { code: 9001, status: "MIN_DIFFERENCE_SL_TP_PRICE", message: "The SL/TP price difference can not be less than {differencePercent}% from the average weighted price." },
    LOT_SIZE: { code: 9002, status: "LOT_SIZE", message: "quantity is too high, too low, and/or not following the step size rule for the symbol." },
    MIN_NOTIONAL: { code: 9003, status: "MIN_NOTIONAL", message: "price * quantity is too low to be a valid order for the symbol. Min notional is {minNotional}" },
    MAX_TOTAL_VOLUME: { code: 9003, status: "MAX_TOTAL_VOLUME", message: "The account's position has reached the maximum defined limit." },
    ICEBERG_PARTS: { code: 9004, status: "ICEBERG_PARTS", message: "ICEBERG order would break into too many parts; icebergQty is too small." },
    MARKET_LOT_SIZE: { code: 9005, status: "MARKET_LOT_SIZE", message: "MARKET order's quantity is too high, too low, and/or not following the step size rule for the symbol." },
    MAX_POSITION: { code: 9006, status: "MAX_POSITION", message: "The account's position has reached the maximum defined limit." },
    MAX_NUM_ORDERS: { code: 9007, status: "MAX_NUM_ORDERS", message: "Account has too many open orders on the symbol." },
    MAX_ALGO_ORDERS: { code: 9008, status: "MAX_ALGO_ORDERS", message: "Account has too many open stop loss and/or take profit orders on the symbol." },
    MAX_NUM_ICEBERG_ORDERS: { code: 9009, status: "MAX_NUM_ICEBERG_ORDERS", message: "Account has too many open iceberg orders on the symbol." },
    EXCHANGE_MAX_NUM_ORDERS: { code: 9010, status: "EXCHANGE_MAX_NUM_ORDERS", message: "Account has too many open orders on the exchange." },
    EXCHANGE_MAX_ALGO_ORDERS: { code: 9011, status: "EXCHANGE_MAX_ALGO_ORDERS", message: "Account has too many open stop loss and/or take profit orders on the exchange." },
    CONVERT_MAX_NOTIONAL: { code: 9012, status: "CONVERT_MAX_NOTIONAL", message: "CONVERT_MAX_NOTIONAL" },
    KYC_IS_REQUIRED: { code: 9013, status: "KYC_IS_REQUIRED", message: "KYC_IS_REQUIRED" },
    // Futures
    MASTER_THROTTLE: { code: 9013, status: "MASTER_THROTTLE", message: "Master copy trade has too many request" },
    // Kyc
    KYC_INVALID_COUNTRY: { code: 2001, status: 'KYC_INVALID_COUNTRY', message: 'KYC_INVALID_COUNTRY' },
    KYC_INVALID_IMAGE: { code: 2002, status: 'KYC_INVALID_IMAGE', message: 'KYC_INVALID_IMAGE' },
    KYC_INVALID_IDENTITY_NUMBER: { code: 2003, status: 'KYC_INVALID_IDENTITY_NUMBER', message: 'KYC_INVALID_IDENTITY_NUMBER' },
    KYC_EXIST_IDENTITY_NUMBER: { code: 2004, status: 'KYC_EXIST_IDENTITY_NUMBER', message: 'KYC_EXIST_IDENTITY_NUMBER' },
    KYC_EXIST_BANK_ACCOUNT: { code: 2005, status: 'KYC_EXIST_BANK_ACCOUNT', message: 'KYC_EXIST_BANK_ACCOUNT' },
    KYC_CANNOT_MODIFY_DOCUMENTS: { code: 2006, status: 'KYC_CANNOT_MODIFY_DOCUMENTS', message: 'KYC_CANNOT_MODIFY_DOCUMENTS' },

    // For futures
    SYSTEM_BUSY: { code: 4000, status: 'SYSTEM_BUSY', message: 'SYSTEM_BUSY' },
    INVALID_ORDER_STATUS: { code: 4000, status: 'INVALID_ORDER_STATUS', message: 'INVALID_ORDER_STATUS' },
    PRICE_LESS_THAN_ZERO: { code: 4001, status: 'PRICE_LESS_THAN_ZERO', message: 'PRICE_LESS_THAN_ZERO' },
    PRICE_GREATER_THAN_MAX_PRICE: { code: 4002, status: 'PRICE_GREATER_THAN_MAX_PRICE', message: 'PRICE_GREATER_THAN_MAX_PRICE' },
    QTY_LESS_THAN_ZERO: { code: 4003, status: 'QTY_LESS_THAN_ZERO', message: 'QTY_LESS_THAN_ZERO' },
    QTY_LESS_THAN_MIN_QTY: { code: 4004, status: 'QTY_LESS_THAN_MIN_QTY', message: 'QTY_LESS_THAN_MIN_QTY' },
    QTY_GREATER_THAN_MAX_QTY: { code: 4005, status: 'QTY_GREATER_THAN_MAX_QTY', message: 'QTY_GREATER_THAN_MAX_QTY' },
    STOP_PRICE_LESS_THAN_ZERO: { code: 4006, status: 'STOP_PRICE_LESS_THAN_ZERO', message: 'STOP_PRICE_LESS_THAN_ZERO' },
    STOP_PRICE_GREATER_THAN_MAX_PRICE: { code: 4007, status: 'STOP_PRICE_GREATER_THAN_MAX_PRICE', message: 'STOP_PRICE_GREATER_THAN_MAX_PRICE' },
    TICK_SIZE_LESS_THAN_ZERO: { code: 4008, status: 'TICK_SIZE_LESS_THAN_ZERO', message: 'TICK_SIZE_LESS_THAN_ZERO' },
    MAX_PRICE_LESS_THAN_MIN_PRICE: { code: 4009, status: 'MAX_PRICE_LESS_THAN_MIN_PRICE', message: 'MAX_PRICE_LESS_THAN_MIN_PRICE' },
    MAX_QTY_LESS_THAN_MIN_QTY: { code: 4010, status: 'MAX_QTY_LESS_THAN_MIN_QTY', message: 'MAX_QTY_LESS_THAN_MIN_QTY' },
    STEP_SIZE_LESS_THAN_ZERO: { code: 4011, status: 'STEP_SIZE_LESS_THAN_ZERO', message: 'STEP_SIZE_LESS_THAN_ZERO' },
    MAX_NUM_ORDERS_LESS_THAN_ZERO: { code: 4012, status: 'MAX_NUM_ORDERS_LESS_THAN_ZERO', message: 'MAX_NUM_ORDERS_LESS_THAN_ZERO' },
    PRICE_LESS_THAN_MIN_PRICE: { code: 4013, status: 'PRICE_LESS_THAN_MIN_PRICE', message: 'PRICE_LESS_THAN_MIN_PRICE' },
    PRICE_NOT_INCREASED_BY_TICK_SIZE: { code: 4014, status: 'PRICE_NOT_INCREASED_BY_TICK_SIZE', message: 'PRICE_NOT_INCREASED_BY_TICK_SIZE' },
    INVALID_CL_ORD_ID_LEN: { code: 4015, status: 'INVALID_CL_ORD_ID_LEN', message: 'INVALID_CL_ORD_ID_LEN' },
    PRICE_HIGHTER_THAN_MULTIPLIER_UP: { code: 4016, status: 'PRICE_HIGHTER_THAN_MULTIPLIER_UP', message: 'PRICE_HIGHTER_THAN_MULTIPLIER_UP' },
    MULTIPLIER_UP_LESS_THAN_ZERO: { code: 4017, status: 'MULTIPLIER_UP_LESS_THAN_ZERO', message: 'MULTIPLIER_UP_LESS_THAN_ZERO' },
    MULTIPLIER_DOWN_LESS_THAN_ZERO: { code: 4018, status: 'MULTIPLIER_DOWN_LESS_THAN_ZERO', message: 'MULTIPLIER_DOWN_LESS_THAN_ZERO' },
    COMPOSITE_SCALE_OVERFLOW: { code: 4019, status: 'COMPOSITE_SCALE_OVERFLOW', message: 'COMPOSITE_SCALE_OVERFLOW' },
    TARGET_STRATEGY_INVALID: { code: 4020, status: 'TARGET_STRATEGY_INVALID', message: 'TARGET_STRATEGY_INVALID' },
    INVALID_DEPTH_LIMIT: { code: 4021, status: 'INVALID_DEPTH_LIMIT', message: 'INVALID_DEPTH_LIMIT' },
    WRONG_MARKET_STATUS: { code: 4022, status: 'WRONG_MARKET_STATUS', message: 'WRONG_MARKET_STATUS' },
    QTY_NOT_INCREASED_BY_STEP_SIZE: { code: 4023, status: 'QTY_NOT_INCREASED_BY_STEP_SIZE', message: 'QTY_NOT_INCREASED_BY_STEP_SIZE' },
    PRICE_LOWER_THAN_MULTIPLIER_DOWN: { code: 4024, status: 'PRICE_LOWER_THAN_MULTIPLIER_DOWN', message: 'PRICE_LOWER_THAN_MULTIPLIER_DOWN' },
    MULTIPLIER_DECIMAL_LESS_THAN_ZERO: { code: 4025, status: 'MULTIPLIER_DECIMAL_LESS_THAN_ZERO', message: 'MULTIPLIER_DECIMAL_LESS_THAN_ZERO' },
    COMMISSION_INVALID: { code: 4026, status: 'COMMISSION_INVALID', message: 'COMMISSION_INVALID' },
    INVALID_ACCOUNT_TYPE: { code: 4027, status: 'INVALID_ACCOUNT_TYPE', message: 'INVALID_ACCOUNT_TYPE' },
    INVALID_LEVERAGE: { code: 4028, status: 'INVALID_LEVERAGE', message: 'INVALID_LEVERAGE' },
    INVALID_TICK_SIZE_PRECISION: { code: 4029, status: 'INVALID_TICK_SIZE_PRECISION', message: 'INVALID_TICK_SIZE_PRECISION' },
    INVALID_STEP_SIZE_PRECISION: { code: 4030, status: 'INVALID_STEP_SIZE_PRECISION', message: 'INVALID_STEP_SIZE_PRECISION' },
    INVALID_WORKING_TYPE: { code: 4031, status: 'INVALID_WORKING_TYPE', message: 'INVALID_WORKING_TYPE' },
    EXCEED_MAX_CANCEL_ORDER_SIZE: { code: 4032, status: 'EXCEED_MAX_CANCEL_ORDER_SIZE', message: 'EXCEED_MAX_CANCEL_ORDER_SIZE' },
    INSURANCE_ACCOUNT_NOT_FOUND: { code: 4033, status: 'INSURANCE_ACCOUNT_NOT_FOUND', message: 'INSURANCE_ACCOUNT_NOT_FOUND' },
    INVALID_BALANCE_TYPE: { code: 4044, status: 'INVALID_BALANCE_TYPE', message: 'INVALID_BALANCE_TYPE' },
    MAX_STOP_ORDER_EXCEEDED: { code: 4045, status: 'MAX_STOP_ORDER_EXCEEDED', message: 'MAX_STOP_ORDER_EXCEEDED' },
    NO_NEED_TO_CHANGE_MARGIN_TYPE: { code: 4046, status: 'NO_NEED_TO_CHANGE_MARGIN_TYPE', message: 'NO_NEED_TO_CHANGE_MARGIN_TYPE' },
    THERE_EXISTS_OPEN_ORDERS: { code: 4047, status: 'THERE_EXISTS_OPEN_ORDERS', message: 'THERE_EXISTS_OPEN_ORDERS' },
    THERE_EXISTS_QUANTITY: { code: 4048, status: 'THERE_EXISTS_QUANTITY', message: 'THERE_EXISTS_QUANTITY' },
    ADD_ISOLATED_MARGIN_REJECT: { code: 4049, status: 'ADD_ISOLATED_MARGIN_REJECT', message: 'ADD_ISOLATED_MARGIN_REJECT' },
    CROSS_BALANCE_INSUFFICIENT: { code: 4050, status: 'CROSS_BALANCE_INSUFFICIENT', message: 'CROSS_BALANCE_INSUFFICIENT' },
    ISOLATED_BALANCE_INSUFFICIENT: { code: 4051, status: 'ISOLATED_BALANCE_INSUFFICIENT', message: 'ISOLATED_BALANCE_INSUFFICIENT' },
    NO_NEED_TO_CHANGE_AUTO_ADD_MARGIN: { code: 4052, status: 'NO_NEED_TO_CHANGE_AUTO_ADD_MARGIN', message: 'NO_NEED_TO_CHANGE_AUTO_ADD_MARGIN' },
    AUTO_ADD_CROSSED_MARGIN_REJECT: { code: 4053, status: 'AUTO_ADD_CROSSED_MARGIN_REJECT', message: 'AUTO_ADD_CROSSED_MARGIN_REJECT' },
    ADD_ISOLATED_MARGIN_NO_POSITION_REJECT: { code: 4054, status: 'ADD_ISOLATED_MARGIN_NO_POSITION_REJECT', message: 'ADD_ISOLATED_MARGIN_NO_POSITION_REJECT' },
    AMOUNT_MUST_BE_POSITIVE: { code: 4055, status: 'AMOUNT_MUST_BE_POSITIVE', message: 'AMOUNT_MUST_BE_POSITIVE' },
    INVALID_API_KEY_TYPE: { code: 4056, status: 'INVALID_API_KEY_TYPE', message: 'INVALID_API_KEY_TYPE' },
    INVALID_RSA_PUBLIC_KEY: { code: 4057, status: 'INVALID_RSA_PUBLIC_KEY', message: 'INVALID_RSA_PUBLIC_KEY' },
    MAX_PRICE_TOO_LARGE: { code: 4058, status: 'MAX_PRICE_TOO_LARGE', message: 'MAX_PRICE_TOO_LARGE' },
    NO_NEED_TO_CHANGE_POSITION_SIDE: { code: 4059, status: 'NO_NEED_TO_CHANGE_POSITION_SIDE', message: 'NO_NEED_TO_CHANGE_POSITION_SIDE' },
    INVALID_POSITION_SIDE: { code: 4060, status: 'INVALID_POSITION_SIDE', message: 'INVALID_POSITION_SIDE' },
    POSITION_SIDE_NOT_MATCH: { code: 4061, status: 'POSITION_SIDE_NOT_MATCH', message: 'POSITION_SIDE_NOT_MATCH' },
    REDUCE_ONLY_CONFLICT: { code: 4062, status: 'REDUCE_ONLY_CONFLICT', message: 'REDUCE_ONLY_CONFLICT' },
    INVALID_OPTIONS_REQUEST_TYPE: { code: 4063, status: 'INVALID_OPTIONS_REQUEST_TYPE', message: 'INVALID_OPTIONS_REQUEST_TYPE' },
    INVALID_OPTIONS_TIME_FRAME: { code: 4064, status: 'INVALID_OPTIONS_TIME_FRAME', message: 'INVALID_OPTIONS_TIME_FRAME' },
    INVALID_OPTIONS_AMOUNT: { code: 4065, status: 'INVALID_OPTIONS_AMOUNT', message: 'INVALID_OPTIONS_AMOUNT' },
    INVALID_OPTIONS_EVENT_TYPE: { code: 4066, status: 'INVALID_OPTIONS_EVENT_TYPE', message: 'INVALID_OPTIONS_EVENT_TYPE' },
    POSITION_SIDE_CHANGE_EXISTS_OPEN_ORDERS: { code: 4067, status: 'POSITION_SIDE_CHANGE_EXISTS_OPEN_ORDERS', message: 'POSITION_SIDE_CHANGE_EXISTS_OPEN_ORDERS' },
    POSITION_SIDE_CHANGE_EXISTS_QUANTITY: { code: 4068, status: 'POSITION_SIDE_CHANGE_EXISTS_QUANTITY', message: 'POSITION_SIDE_CHANGE_EXISTS_QUANTITY' },
    INVALID_OPTIONS_PREMIUM_FEE: { code: 4069, status: 'INVALID_OPTIONS_PREMIUM_FEE', message: 'INVALID_OPTIONS_PREMIUM_FEE' },
    INVALID_CL_OPTIONS_ID_LEN: { code: 4070, status: 'INVALID_CL_OPTIONS_ID_LEN', message: 'INVALID_CL_OPTIONS_ID_LEN' },
    INVALID_OPTIONS_DIRECTION: { code: 4071, status: 'INVALID_OPTIONS_DIRECTION', message: 'INVALID_OPTIONS_DIRECTION' },
    OPTIONS_PREMIUM_NOT_UPDATE: { code: 4072, status: 'OPTIONS_PREMIUM_NOT_UPDATE', message: 'OPTIONS_PREMIUM_NOT_UPDATE' },
    OPTIONS_PREMIUM_INPUT_LESS_THAN_ZERO: { code: 4073, status: 'OPTIONS_PREMIUM_INPUT_LESS_THAN_ZERO', message: 'OPTIONS_PREMIUM_INPUT_LESS_THAN_ZERO' },
    OPTIONS_AMOUNT_BIGGER_THAN_UPPER: { code: 4074, status: 'OPTIONS_AMOUNT_BIGGER_THAN_UPPER', message: 'OPTIONS_AMOUNT_BIGGER_THAN_UPPER' },
    OPTIONS_PREMIUM_OUTPUT_ZERO: { code: 4075, status: 'OPTIONS_PREMIUM_OUTPUT_ZERO', message: 'OPTIONS_PREMIUM_OUTPUT_ZERO' },
    OPTIONS_PREMIUM_TOO_DIFF: { code: 4076, status: 'OPTIONS_PREMIUM_TOO_DIFF', message: 'OPTIONS_PREMIUM_TOO_DIFF' },
    OPTIONS_PREMIUM_REACH_LIMIT: { code: 4077, status: 'OPTIONS_PREMIUM_REACH_LIMIT', message: 'OPTIONS_PREMIUM_REACH_LIMIT' },
    OPTIONS_COMMON_ERROR: { code: 4078, status: 'OPTIONS_COMMON_ERROR', message: 'OPTIONS_COMMON_ERROR' },
    INVALID_OPTIONS_ID: { code: 4079, status: 'INVALID_OPTIONS_ID', message: 'INVALID_OPTIONS_ID' },
    OPTIONS_USER_NOT_FOUND: { code: 4080, status: 'OPTIONS_USER_NOT_FOUND', message: 'OPTIONS_USER_NOT_FOUND' },
    OPTIONS_NOT_FOUND: { code: 4081, status: 'OPTIONS_NOT_FOUND', message: 'OPTIONS_NOT_FOUND' },
    INVALID_BATCH_PLACE_ORDER_SIZE: { code: 4082, status: 'INVALID_BATCH_PLACE_ORDER_SIZE', message: 'INVALID_BATCH_PLACE_ORDER_SIZE' },
    PLACE_BATCH_ORDERS_FAIL: { code: 4083, status: 'PLACE_BATCH_ORDERS_FAIL', message: 'PLACE_BATCH_ORDERS_FAIL' },
    UPCOMING_METHOD: { code: 4084, status: 'UPCOMING_METHOD', message: 'UPCOMING_METHOD' },
    INVALID_NOTIONAL_LIMIT_COEF: { code: 4085, status: 'INVALID_NOTIONAL_LIMIT_COEF', message: 'INVALID_NOTIONAL_LIMIT_COEF' },
    INVALID_PRICE_SPREAD_THRESHOLD: { code: 4086, status: 'INVALID_PRICE_SPREAD_THRESHOLD', message: 'INVALID_PRICE_SPREAD_THRESHOLD' },
    REDUCE_ONLY_ORDER_PERMISSION: { code: 4087, status: 'REDUCE_ONLY_ORDER_PERMISSION', message: 'REDUCE_ONLY_ORDER_PERMISSION' },
    NO_PLACE_ORDER_PERMISSION: { code: 4088, status: 'NO_PLACE_ORDER_PERMISSION', message: 'NO_PLACE_ORDER_PERMISSION' },
    INVALID_CONTRACT_TYPE: { code: 4104, status: 'INVALID_CONTRACT_TYPE', message: 'INVALID_CONTRACT_TYPE' },
    INVALID_CLIENT_TRAN_ID_LEN: { code: 4114, status: 'INVALID_CLIENT_TRAN_ID_LEN', message: 'INVALID_CLIENT_TRAN_ID_LEN' },
    DUPLICATED_CLIENT_TRAN_ID: { code: 4115, status: 'DUPLICATED_CLIENT_TRAN_ID', message: 'DUPLICATED_CLIENT_TRAN_ID' },
    REDUCE_ONLY_MARGIN_CHECK_FAILED: { code: 4118, status: 'REDUCE_ONLY_MARGIN_CHECK_FAILED', message: 'REDUCE_ONLY_MARGIN_CHECK_FAILED' },
    MARKET_ORDER_REJECT: { code: 4131, status: 'MARKET_ORDER_REJECT', message: 'MARKET_ORDER_REJECT' },
    INVALID_ACTIVATION_PRICE: { code: 4135, status: 'INVALID_ACTIVATION_PRICE', message: 'INVALID_ACTIVATION_PRICE' },
    QUANTITY_EXISTS_WITH_CLOSE_POSITION: { code: 4137, status: 'QUANTITY_EXISTS_WITH_CLOSE_POSITION', message: 'QUANTITY_EXISTS_WITH_CLOSE_POSITION' },
    REDUCE_ONLY_MUST_BE_TRUE: { code: 4138, status: 'REDUCE_ONLY_MUST_BE_TRUE', message: 'REDUCE_ONLY_MUST_BE_TRUE' },
    ORDER_TYPE_CANNOT_BE_MKT: { code: 4139, status: 'ORDER_TYPE_CANNOT_BE_MKT', message: 'ORDER_TYPE_CANNOT_BE_MKT' },
    INVALID_OPENING_POSITION_STATUS: { code: 4140, status: 'INVALID_OPENING_POSITION_STATUS', message: 'INVALID_OPENING_POSITION_STATUS' },
    SYMBOL_ALREADY_CLOSED: { code: 4141, status: 'SYMBOL_ALREADY_CLOSED', message: 'SYMBOL_ALREADY_CLOSED' },
    STRATEGY_INVALID_TRIGGER_PRICE: { code: 4142, status: 'STRATEGY_INVALID_TRIGGER_PRICE', message: 'STRATEGY_INVALID_TRIGGER_PRICE' },
    INVALID_PAIR: { code: 4144, status: 'INVALID_PAIR', message: 'INVALID_PAIR' },
    ISOLATED_LEVERAGE_REJECT_WITH_POSITION: { code: 4161, status: 'ISOLATED_LEVERAGE_REJECT_WITH_POSITION', message: 'ISOLATED_LEVERAGE_REJECT_WITH_POSITION' },
    // MIN_NOTIONAL: { code: 4164, status: 'MIN_NOTIONAL' },
    INVALID_TIME_INTERVAL: { code: 4165, status: 'INVALID_TIME_INTERVAL', message: 'INVALID_TIME_INTERVAL' },
    PRICE_HIGHTER_THAN_STOP_MULTIPLIER_UP: { code: 4183, status: 'PRICE_HIGHTER_THAN_STOP_MULTIPLIER_UP', message: 'PRICE_HIGHTER_THAN_STOP_MULTIPLIER_UP' },
    PRICE_LOWER_THAN_STOP_MULTIPLIER_DOWN: { code: 4184, status: 'PRICE_LOWER_THAN_STOP_MULTIPLIER_DOWN', message: 'PRICE_LOWER_THAN_STOP_MULTIPLIER_DOWN' },
    INVALID_TYPE_CLOSE_ALL_ORDER: { code: 4185, status: 'INVALID_TYPE_CLOSE_ALL_ORDER', message: 'INVALID_TYPE_CLOSE_ALL_ORDER' },
    INVALID_FEE_CURRENCY: { code: 4186, status: 'INVALID_FEE_CURRENCY', message: 'INVALID_FEE_CURRENCY' },

    MODIFY_FUTURES_MARGIN_INVALID_LEVERAGE: { code: 6101, status: 'MODIFY_FUTURES_MARGIN_INVALID_LEVERAGE', message: 'Can not change margin due to invalid leverage' },
    REMOVE_FUTURES_MARGIN_INVALID_AMOUNT: { code: 6102, status: 'REMOVE_FUTURES_MARGIN_INVALID_AMOUNT', message: 'Can not change margin due to invalid amount' },
    REMOVE_FUTURES_MARGIN_INVALID_PROFIT_RATIO: { code: 6102, status: 'REMOVE_FUTURES_MARGIN_INVALID_PROFIT_RATIO', message: 'Can not change margin due to invalid profit ratio' },
    PROCESSING_FUTURES_ORDER: { code: 6103, status: 'PROCESSING_FUTURES_ORDER', message: 'Order is processing' },
    INVALID_CLOSE_VOLUME: { code: 6104, status: 'INVALID_CLOSE_VOLUME', message: 'Invalid close volume' },
    USERID_AND_ORDER_NOTMATCH: { code: 6104, status: 'USERID_AND_ORDER_NOTMATCH', message: "User and order's user not match" },

    INVALID_ACTION_TYPE: { code: 7000, status: 'INVALID_ACTION_TYPE', message: 'Invalid action type' },
    INVALID_MARGIN_CURRENCY: { code: 7001, status: 'INVALID_MARGIN_CURRENCY', message: 'Invalid margin currency' },
    BOT_NOT_FOUND: { code: 7002, status: 'BOT_NOT_FOUND', message: 'Bot not found' }
}
