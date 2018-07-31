import {Component, OnInit} from '@angular/core';
import {Sp8deCrypto} from 'sp8de.crypto';
import {DemoGameService, GameFinishRequest, GameStartRequest, GameStartResponse} from '../api';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private privateKey = '0xd3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f';
  private pubKey: string;
  private seed: number;
  private sign: string;
  private gameId: string;
  private items: any[];
  private requestStart: GameStartRequest = {
    type: 'Dice',
    bet: [1],
    betAmount: 1,
    pubKey: '',
    sign: '',
    nonce: 0
  };
  private requestEnd: GameFinishRequest = {
    gameId: '',
    pubKey: '',
    nonce: 0
  };

  constructor(public sp8deCrypto: Sp8deCrypto,
              public api: DemoGameService) {
  }

  ngOnInit() {
    this.pubKey = this.sp8deCrypto.getPubKey(this.privateKey);
    this.seed = this.sp8deCrypto.generateSeed();
    this.sign = this.sp8deCrypto.sing(this.privateKey, this.seed, this.requestStart.nonce).sign;
    this.startGame(this.sign, this.pubKey).subscribe(
      res => {
        console.log('start', res);
        this.endGame(this.gameId, this.sign, this.seed, this.pubKey)
          .subscribe(
            result => {
              console.log('end', result);
              console.log('Check win: ', this.checkWin(result.sharedSeedArray, result.winNumbers[0]));
            },
            error => {
              console.log(error.message);
            });
      },
      error => console.log(error.message)
    );
  }

  private checkWin(array: number[], winNumber: number): boolean {
    return this.sp8deCrypto.getRandomFromArray(array, 1, 6) === winNumber;
  }

  public startGame(sign: string, pubKey: string): Observable<GameStartResponse> {
    return this.api.apiDemoGameStartPost(this.createRequestStart(this.requestStart, sign, pubKey))
      .pipe(
        map(
          item => {
            this.items = item.items;
            this.gameId = item.gameId;
            return item;
          }));
  }

  public endGame(gameId: string, sign: string, seed: number, pubKey: string): Observable<any> {
    return this.api.apiDemoGameEndPost(this.createRequestEnd(this.requestEnd, seed, gameId, sign, pubKey))
      .pipe(
        map(item => {
          // some actions
          return item;
        })
      );
  }

  private createRequestEnd(request: GameFinishRequest, seed: number, gameId: string, sign: string, pubKey: string): GameFinishRequest {
    if (!request ||
      !seed ||
      !pubKey ||
      !gameId ||
      !sign) {
      console.error('Invalid parameters');
      return;
    }
    request.gameId = gameId;
    request.seed = seed;
    request.sign = sign;
    request.pubKey = pubKey;
    console.log('end request', request);
    return request;
  }

  private createRequestStart(request: GameStartRequest, sign: string, pubKey: string): GameStartRequest {
    if (!request ||
      !pubKey ||
      !sign) {
      console.error('Invalid parameters');
      return;
    }
    request.sign = sign;
    request.pubKey = pubKey;
    console.log('start request', request);
    return request;
  }

  private validateResponse(response: GameStartResponse): boolean[] {
    const result: boolean[] = [];
    for (const item of response.items) {
      result.push(this.sp8deCrypto.validate(item));
    }
    return result;
  }
}
