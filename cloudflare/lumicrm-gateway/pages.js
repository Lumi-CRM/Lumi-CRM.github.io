import { handleGatewayRequest } from './worker.js'

export const onRequest = context => handleGatewayRequest(context.request)
