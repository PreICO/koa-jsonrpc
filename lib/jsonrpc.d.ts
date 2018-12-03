/// <reference types="koa" />
/// <reference types="bunyan" />
import * as bunyan from 'bunyan';
import * as Koa from 'koa';
import { VError } from 'verror';
/**
 * RPC specific error codes, application errors should not use these.
 */
export declare enum JsonRpcErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
}
export declare type JsonRpcId = string | number | null;
export declare class JsonRpcError extends VError {
    readonly name: string;
    readonly code: number;
    constructor(code: number, ...params: any[]);
    toJSON(): {
        code: number;
        data: any;
        message: string;
    } | {
        code: number;
        message: string;
        data?: undefined;
    };
}
export interface JsonRpcResponseOptions {
    error?: JsonRpcError;
    request?: JsonRpcRequest;
    result?: any;
    time?: number;
}
export declare class JsonRpcResponse {
    readonly jsonrpc: string;
    readonly id: JsonRpcId;
    readonly error?: JsonRpcError;
    readonly request?: JsonRpcRequest;
    readonly result?: any;
    readonly time?: number;
    constructor({error, request, result, time}: JsonRpcResponseOptions);
    toJSON(): {
        jsonrpc: string;
        id: string | number | null;
        error: JsonRpcError;
        result?: undefined;
    } | {
        jsonrpc: string;
        id: string | number | null;
        result: any;
        error?: undefined;
    };
}
export declare class JsonRpcRequest {
    readonly jsonrpc: string;
    readonly id: JsonRpcId;
    readonly method: string;
    readonly params: any;
    static from(data: any): JsonRpcRequest;
    constructor(jsonrpc: string, id: JsonRpcId, method: string, params?: any);
}
export declare function rpcAssert(value: any, message?: string): void;
export declare function rpcAssertEqual(actual: any, expected: any, message?: string): void;
export interface JsonRpcMethodContext {
    ctx: Koa.Context;
    log: bunyan;
    request: JsonRpcRequest;
    assert: typeof rpcAssert;
    assertEqual: typeof rpcAssertEqual;
}
export declare type JsonRpcMethod = (this: JsonRpcMethodContext, ...params) => any;
export declare class JsonRpc {
    namespace: string | undefined;
    readonly methods: {
        [name: string]: {
            method: JsonRpcMethod;
            params: string[];
        };
    };
    /**
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(namespace?: string | undefined);
    /**
     * Register a rpc method.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    register(name: string, method: JsonRpcMethod): void;
    middleware: (ctx: Koa.Context, next: () => Promise<any>) => Promise<any>;
    private handleRequest;
}
