"use strict";
/**
 * @file Steem rpc-auth extension to JsonRpc
 * @author Johan Nordberg <johan@steemit.com>
 * See https://github.com/steemit/json-rpc
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rpc_auth_1 = require("@steemit/rpc-auth");
const assert = require("assert");
const dsteem_1 = require("dsteem");
const jsonrpc_1 = require("./jsonrpc");
const utils_1 = require("./utils");
/**
 * JsonRpc subclass that adds request signature verification.
 */
class JsonRpcAuth extends jsonrpc_1.JsonRpc {
    /**
     * @param rpcNode    Address to steemd node used for signature verification.
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(rpcNode, namespace, options) {
        super(namespace);
        this.rpcNode = rpcNode;
        this.verifier = async (message, signatures, accountName) => {
            assert.equal(message.byteLength, 32, 'Invalid message');
            assert(accountName.length >= 3 && accountName.length <= 16, 'Invalid account name');
            const [account] = await this.client.database.getAccounts([accountName]);
            if (!account) {
                throw new Error('No such account');
            }
            if (account.posting.key_auths.length !== 1) {
                throw new Error('Unsupported posting key configuration for account');
            }
            const [keyWif, keyWeight] = account.posting.key_auths[0];
            if (account.posting.weight_threshold > keyWeight) {
                throw new Error('Signing key not above weight threshold');
            }
            if (signatures.length !== 1) {
                throw new Error('Multisig not supported');
            }
            const prefix = this.client.addressPrefix;
            const key = dsteem_1.PublicKey.from(keyWif, prefix);
            const signature = dsteem_1.Signature.fromString(signatures[0]);
            const signKey = signature.recover(message, prefix);
            if (key.toString() !== signKey.toString()) {
                throw new Error('Invalid signature');
            }
        };
        this.client = new dsteem_1.Client(rpcNode, options);
    }
    /**
     * Register a rpc method that requires request signing.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    registerAuthenticated(name, method) {
        this.register(name, this.makeHandler(method));
    }
    makeHandler(method) {
        const self = this;
        const paramNames = utils_1.getParamNames(method);
        return async function (__signed) {
            const req = this.request;
            let params;
            try {
                params = await rpc_auth_1.validate(req, self.verifier);
            }
            catch (cause) {
                throw new jsonrpc_1.JsonRpcError(401, { cause }, 'Unauthorized');
            }
            const ctx = this;
            ctx.account = req.params.__signed.account;
            return await method.apply(ctx, utils_1.resolveParams(params, paramNames));
        };
    }
}
exports.JsonRpcAuth = JsonRpcAuth;
