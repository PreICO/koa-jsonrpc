"use strict";
/**
 * @file Misc utilities.
 * @author Johan Nordberg <johan@steemit.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const http = require("http");
const https = require("https");
const verror_1 = require("verror");
/**
 * Reads stream to memory and tries to parse the result as JSON.
 */
async function readJson(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('error', reject);
        stream.on('data', (chunk) => { chunks.push(chunk); });
        stream.on('end', () => {
            if (chunks.length === 0) {
                resolve(undefined);
                return;
            }
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString());
                resolve(data);
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
exports.readJson = readJson;
/**
 * Sends JSON data to server and read JSON response.
 */
async function jsonRequest(options, data) {
    return new Promise((resolve, reject) => {
        let body;
        try {
            body = Buffer.from(JSON.stringify(data));
        }
        catch (cause) {
            throw new verror_1.VError({ cause, name: 'RequestError' }, 'Unable to stringify request data');
        }
        let request;
        if (!options.protocol || options.protocol === 'https:') {
            request = https.request(options);
        }
        else {
            request = http.request(options);
        }
        request.on('error', (cause) => {
            reject(new verror_1.VError({ cause, name: 'RequestError' }, 'Unable to send request'));
        });
        request.on('response', async (response) => {
            try {
                resolve(await readJson(response));
            }
            catch (cause) {
                const info = { code: response.statusCode };
                reject(new verror_1.VError({ cause, info, name: 'ResponseError' }, 'Unable to read response data'));
            }
        });
        request.setHeader('Accept', 'application/json');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Content-Length', body.length);
        request.write(body);
        request.end();
    });
}
exports.jsonRequest = jsonRequest;
/**
 * Sleep for N milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.sleep = sleep;
/**
 * Resolve params object to positional array.
 */
function resolveParams(params, names) {
    assert(typeof params === 'object', 'not an object or array');
    if (!Array.isArray(params)) {
        // resolve named arguments to positional
        const rv = names.map(() => undefined);
        for (const key of Object.keys(params)) {
            const idx = names.indexOf(key);
            assert(idx !== -1, `unknown param: ${key}`);
            rv[idx] = params[key];
        }
        return rv;
    }
    else {
        return params;
    }
}
exports.resolveParams = resolveParams;
// https://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically
// tslint:disable-next-line
const STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
/**
 * Get parameter names for function as array.
 */
function getParamNames(func) {
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    return result || [];
}
exports.getParamNames = getParamNames;
