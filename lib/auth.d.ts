import { ClientOptions } from 'dsteem';
import { JsonRpc, JsonRpcMethodContext } from './jsonrpc';
export interface JsonRpcAuthMethodContext extends JsonRpcMethodContext {
    account: string;
}
export declare type JsonRpcAuthMethod = (this: JsonRpcAuthMethodContext, ...params) => any;
/**
 * JsonRpc subclass that adds request signature verification.
 */
export declare class JsonRpcAuth extends JsonRpc {
    rpcNode: string;
    private client;
    /**
     * @param rpcNode    Address to steemd node used for signature verification.
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(rpcNode: string, namespace?: string, options?: ClientOptions);
    /**
     * Register a rpc method that requires request signing.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    registerAuthenticated(name: string, method: JsonRpcAuthMethod): void;
    private makeHandler(method);
    private verifier;
}
