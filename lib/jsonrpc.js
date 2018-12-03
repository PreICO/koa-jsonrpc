"use strict";
/**
 * @file JSON RPC 2.0 middleware for Koa.
 * @author Johan Nordberg <johan@steemit.com>
 * Implemented according to http://www.jsonrpc.org/specification
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const verror_1 = require("verror");
const utils_1 = require("./utils");
/**
 * RPC specific error codes, application errors should not use these.
 */
var JsonRpcErrorCode;
(function (JsonRpcErrorCode) {
    JsonRpcErrorCode[JsonRpcErrorCode["ParseError"] = -32700] = "ParseError";
    JsonRpcErrorCode[JsonRpcErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    JsonRpcErrorCode[JsonRpcErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    JsonRpcErrorCode[JsonRpcErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    JsonRpcErrorCode[JsonRpcErrorCode["InternalError"] = -32603] = "InternalError";
})(JsonRpcErrorCode = exports.JsonRpcErrorCode || (exports.JsonRpcErrorCode = {}));
function isValidId(id) {
    return id === null || id === undefined || typeof id === 'string' || (typeof id === 'number' && Number.isSafeInteger(id));
}
function isValidResponse(response) {
    return (response.id !== null && response.id !== undefined) || response.error !== undefined;
}
class JsonRpcError extends verror_1.VError {
    constructor(code, ...params) {
        // workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19479
        super(params[0], ...(params.slice(1)));
        this.name = 'RPCError';
        this.code = code;
    }
    toJSON() {
        const code = this.code;
        const data = JsonRpcError.info(this);
        const message = this.message;
        if (Object.keys(data).length > 0) {
            return { code, data, message };
        }
        else {
            return { code, message };
        }
    }
}
exports.JsonRpcError = JsonRpcError;
class JsonRpcResponse {
    constructor({ error, request, result, time }) {
        this.jsonrpc = '2.0';
        assert(!result || !error, 'must specify either result or error');
        assert(!(result && error), 'result and error are mutually exclusive');
        this.id = request ? request.id : null;
        this.error = error;
        this.request = request;
        this.result = result === undefined ? null : result;
        this.time = time;
    }
    toJSON() {
        const { jsonrpc, id, error, result } = this;
        if (error) {
            return { jsonrpc, id, error };
        }
        else {
            return { jsonrpc, id, result };
        }
    }
}
exports.JsonRpcResponse = JsonRpcResponse;
class JsonRpcRequest {
    constructor(jsonrpc, id, method, params) {
        this.jsonrpc = jsonrpc;
        this.id = id;
        this.method = method;
        this.params = params;
        assert(jsonrpc === '2.0', 'invalid rpc version');
        assert(isValidId(id), 'invalid id');
        assert(typeof method === 'string', 'invalid method');
    }
    static from(data) {
        const { jsonrpc, method, params, id } = data;
        return new JsonRpcRequest(jsonrpc, id, method, params);
    }
}
exports.JsonRpcRequest = JsonRpcRequest;
function rpcAssert(value, message) {
    if (!value) {
        throw new JsonRpcError(400, message || 'Assertion failed');
    }
}
exports.rpcAssert = rpcAssert;
function rpcAssertEqual(actual, expected, message) {
    // tslint:disable-next-line:triple-equals
    if (actual != expected) {
        const info = { actual, expected };
        throw new JsonRpcError(400, { info }, message || 'Assertion failed');
    }
}
exports.rpcAssertEqual = rpcAssertEqual;
class JsonRpc {
    /**
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(namespace) {
        this.namespace = namespace;
        this.methods = {};
        this.middleware = async (ctx, next) => {
            if (ctx.method !== 'POST') {
                const error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, 'Method Not Allowed');
                ctx.status = 405;
                ctx.body = new JsonRpcResponse({ error });
                return next();
            }
            let data;
            try {
                data = await utils_1.readJson(ctx.req);
            }
            catch (cause) {
                const error = new JsonRpcError(JsonRpcErrorCode.ParseError, { cause }, 'Parse error');
                ctx.status = 400;
                ctx.body = new JsonRpcResponse({ error });
                return next();
            }
            // spec says an empty batch request is invalid
            if (Array.isArray(data) && data.length === 0) {
                const error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
                ctx.status = 400;
                ctx.body = new JsonRpcResponse({ error });
                return next();
            }
            ctx.status = 200;
            if (Array.isArray(data)) {
                const rp = data.map((d) => this.handleRequest(d, ctx));
                const responses = (await Promise.all(rp)).filter(isValidResponse);
                ctx.body = (responses.length > 0) ? responses : '';
                ctx['rpc_responses'] = responses;
            }
            else {
                const response = await this.handleRequest(data, ctx);
                ctx.body = isValidResponse(response) ? response : '';
                ctx['rpc_responses'] = [response];
            }
            return next();
        };
        this.handleRequest = async (data, ctx) => {
            let request;
            try {
                request = JsonRpcRequest.from(data);
            }
            catch (cause) {
                const error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, { cause }, 'Invalid Request');
                return new JsonRpcResponse({ error });
            }
            const handler = this.methods[request.method];
            if (!handler) {
                const error = new JsonRpcError(JsonRpcErrorCode.MethodNotFound, 'Method not found');
                return new JsonRpcResponse({ request, error });
            }
            let params;
            try {
                if (request.params !== undefined) {
                    params = utils_1.resolveParams(request.params, handler.params);
                }
                else {
                    params = [];
                }
            }
            catch (cause) {
                const error = new JsonRpcError(JsonRpcErrorCode.InvalidParams, { cause }, 'Invalid params');
                return new JsonRpcResponse({ request, error });
            }
            let result;
            let log;
            if (ctx['log']) {
                log = ctx['log'].child({ rpc_req: request });
            }
            const start = process.hrtime();
            try {
                const bind = {
                    assert: rpcAssert,
                    assertEqual: rpcAssertEqual,
                    ctx, log, request,
                };
                result = await handler.method.apply(bind, params);
            }
            catch (error) {
                if (!(error instanceof JsonRpcError)) {
                    error = new JsonRpcError(JsonRpcErrorCode.InternalError, { cause: error }, 'Internal error');
                }
                return new JsonRpcResponse({ request, error });
            }
            const delta = process.hrtime(start);
            const time = delta[0] * 1e3 + delta[1] / 1e6;
            return new JsonRpcResponse({ request, result, time });
        };
    }
    /**
     * Register a rpc method.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    register(name, method) {
        const n = this.namespace ? `${this.namespace}.${name}` : name;
        assert(!this.methods[n], 'method already exists');
        const params = utils_1.getParamNames(method);
        this.methods[n] = { method, params };
    }
}
exports.JsonRpc = JsonRpc;
