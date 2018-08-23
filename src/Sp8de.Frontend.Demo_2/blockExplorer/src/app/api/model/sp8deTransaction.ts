/**
 * Sp8de Explorer API
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: v1
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */
import { Anchor } from './anchor';
import { InternalTransaction } from './internalTransaction';
import { TransactionData } from './transactionData';
import { TransactionMeta } from './transactionMeta';


export interface Sp8deTransaction {
    id?: string;
    type?: Sp8deTransaction.TypeEnum;
    hash?: string;
    signer?: string;
    signature?: string;
    status?: Sp8deTransaction.StatusEnum;
    dependsOn?: string;
    timestamp?: number;
    expiration?: number;
    compleatedAt?: number;
    fee?: number;
    anchors?: Array<Anchor>;
    inputData?: TransactionData;
    outputData?: TransactionData;
    internalRoot?: string;
    internalTransactions?: Array<InternalTransaction>;
    meta?: TransactionMeta;
}
export namespace Sp8deTransaction {
    export type TypeEnum = 'Simple' | 'AggregatedCommit' | 'AggregatedReveal' | 'InternalCommit' | 'InternalReveal' | 'System';
    export const TypeEnum = {
        Simple: 'Simple' as TypeEnum,
        AggregatedCommit: 'AggregatedCommit' as TypeEnum,
        AggregatedReveal: 'AggregatedReveal' as TypeEnum,
        InternalCommit: 'InternalCommit' as TypeEnum,
        InternalReveal: 'InternalReveal' as TypeEnum,
        System: 'System' as TypeEnum
    }
    export type StatusEnum = 'New' | 'Pending' | 'Expired' | 'Failed' | 'Confirmed';
    export const StatusEnum = {
        New: 'New' as StatusEnum,
        Pending: 'Pending' as StatusEnum,
        Expired: 'Expired' as StatusEnum,
        Failed: 'Failed' as StatusEnum,
        Confirmed: 'Confirmed' as StatusEnum
    }
}
