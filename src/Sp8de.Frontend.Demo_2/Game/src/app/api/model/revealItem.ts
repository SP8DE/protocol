/**
 * Sp8de Game API
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: v1
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */


export interface RevealItem {
    seed?: number;
    id?: string;
    type?: RevealItem.TypeEnum;
    pubKey?: string;
    nonce?: string;
    sign?: string;
}
export namespace RevealItem {
    export type TypeEnum = 'Contributor' | 'Requester' | 'Validator';
    export const TypeEnum = {
        Contributor: 'Contributor' as TypeEnum,
        Requester: 'Requester' as TypeEnum,
        Validator: 'Validator' as TypeEnum
    }
}
