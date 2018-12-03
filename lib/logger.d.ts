/// <reference types="bunyan" />
/// <reference types="koa" />
/**
 * @file JSONRPC bunyan logging middleware for koa.
 * @author Johan Nordberg <johan@steemit.com>
 */
import * as bunyan from 'bunyan';
import * as Koa from 'koa';
/**
 * Create a log middleware. Attaches a bunyan child logger
 * with the uuid and ip to the request context.
 * Should be first in chain.
 */
export declare function requestLogger(logger: bunyan, level?: string): Koa.Middleware;
/** Create a RPC logging middleware. */
export declare function rpcLogger(logger: bunyan, level?: string): Koa.Middleware;
