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
import { RevealItem } from './revealItem';


export interface GameFinishResponse {
    gameId?: string;
    winNumbers?: Array<number>;
    winAmount?: number;
    items?: Array<RevealItem>;
    sharedSeedHash?: string;
    sharedSeedArray?: Array<number>;
    validationTxHash?: string;
    validationLink?: string;
    isWinner?: boolean;
    ipfsHash?: string;
}
