import {Injectable} from '@angular/core';
import {Sp8deClientSDK} from 'sp8de-client-sdk';
import {GameService} from './game.service';
import {from, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {DemoGameService, GameFinishResponse} from '../api/index';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private privateKey: string;
  private pubKey: string;
  private password: string = '1234';

  constructor(public sp8deClientSDK: Sp8deClientSDK,
              public api: DemoGameService,
              public gameService: GameService) {
  }

  public init(): Observable<any> {
    if (this.sp8deClientSDK.isWalletsInStorage()) {
      return from(this.sp8deClientSDK.decryptWallet(this.sp8deClientSDK.getActiveWalletFromStorage(), this.password))
        .pipe(
          map(item => <any>item),
          map(wallet => {
            console.log(wallet);
            this.privateKey = wallet.privateKey;
            this.pubKey = this.sp8deClientSDK.getPubKey(this.privateKey);
          }));
    } else {
      let wallet;
      wallet = this.sp8deClientSDK.generateWallet();
      this.privateKey = wallet.privateKey;
      this.pubKey = this.sp8deClientSDK.getPubKey(this.privateKey);
      return from(this.sp8deClientSDK.encryptWallet(wallet, this.password))
        .pipe(
          map(item => <any>item),
          map(res => {
            this.sp8deClientSDK.addWalletToStorage(res);
          }));
    }
  }

  public generateCryptoParameters(): any {
    const resultParameters = {
        nonce: +(new Date()),
        seed: this.sp8deClientSDK.generateSeed(),
        sign: '',
        pubKey: this.pubKey
      },
      signParameters = {
        privateKey: this.privateKey,
        seed: resultParameters.seed,
        nonce: resultParameters.nonce
      };
    resultParameters.sign = this.sp8deClientSDK.signMessage(signParameters);
    return resultParameters;
  }

  public getRandomFromArray(parameters: { array: any[]; min: number, max: number, count: number }): number[] {
    return this.sp8deClientSDK.getRandomFromArray(parameters);
  }

  public start(parameters: any): Observable<any> {
    const nonce = +(new Date());
    const seed = this.sp8deClientSDK.generateSeed();
    const sign = this.sp8deClientSDK.signMessage({privateKey: this.privateKey, seed: seed, nonce: nonce});
    console.group('Start');
    return this.gameService.startGame(
      {
        type: parameters.type,
        bet: parameters.currentBet,
        betAmount: parameters.currentBetAmount,
        pubKey: this.pubKey,
        sign: sign,
        nonce: nonce
      }).pipe(
      switchMap(startResponse => {
        console.warn('Start response', startResponse);
        console.groupEnd();
        console.group('End');
        return this.gameService.endGame({
          gameId: startResponse.gameId,
          sign: sign,
          seed: seed,
          nonce: nonce,
          pubKey: this.pubKey
        });
      }));
  }

  public validateWin(array: number[], serverNumber: number[]): boolean {
    const clientNumber = this.getRandomFromArray({array: array, min: 1, max: 6, count: serverNumber.length});
    if (!clientNumber) {
      console.error('Server value invalid!');
      return;
    }
    return clientNumber[0] === serverNumber[0];
  }

  public validatePlayers(response: GameFinishResponse): boolean[] {
    const result: boolean[] = [];
    for (const item of response.items) {
      result.push(this.sp8deClientSDK.validateSign({
          sign: item.sign,
          pubKey: item.pubKey,
          seed: item.seed,
          nonce: item.nonce
        }
      ));
    }
    return result;
  }
}
