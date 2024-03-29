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


export interface InternalTransaction {
    hash?: string;
    type?: InternalTransaction.TypeEnum;
    from?: string;
    sign?: string;
    nonce?: number;
    data?: number;
}
export namespace InternalTransaction {
    export type TypeEnum = 'Simple' | 'AggregatedCommit' | 'AggregatedReveal' | 'InternalCommit' | 'InternalReveal' | 'System';
    export const TypeEnum = {
        Simple: 'Simple' as TypeEnum,
        AggregatedCommit: 'AggregatedCommit' as TypeEnum,
        AggregatedReveal: 'AggregatedReveal' as TypeEnum,
        InternalCommit: 'InternalCommit' as TypeEnum,
        InternalReveal: 'InternalReveal' as TypeEnum,
        System: 'System' as TypeEnum
    }
}
