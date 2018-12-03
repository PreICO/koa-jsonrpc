/// <reference types="node" />
import * as https from 'https';
/**
 * Reads stream to memory and tries to parse the result as JSON.
 */
export declare function readJson(stream: NodeJS.ReadableStream): Promise<any>;
/**
 * Sends JSON data to server and read JSON response.
 */
export declare function jsonRequest(options: https.RequestOptions, data: any): Promise<any>;
/**
 * Sleep for N milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Resolve params object to positional array.
 */
export declare function resolveParams(params: any[] | {
    [key: string]: any;
}, names: string[]): any[];
/**
 * Get parameter names for function as array.
 */
export declare function getParamNames(func: any): any;
