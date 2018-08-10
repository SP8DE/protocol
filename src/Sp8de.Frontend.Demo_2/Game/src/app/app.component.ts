import {Component, OnInit} from '@angular/core';
import {Sp8deCrypto} from 'sp8de.crypto';
import {DemoGameService, GameFinishRequest, GameFinishResponse, GameStartRequest, GameStartResponse} from './api';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
/*  private privateKey = '0xd3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f';
  private pubKey: string;
  private seed: number;
  private sign: string;
  private startResponse: GameStartResponse;
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
  };*/

  constructor(
              public api: DemoGameService) {
  }

  ngOnInit() {
    /*this.pubKey = this.sp8deCrypto.getPubKey(this.privateKey);
    this.seed = this.sp8deCrypto.generateSeed();
    this.sign = this.sp8deCrypto.sing(this.privateKey, this.seed, this.requestStart.nonce).sign;*/
  }

  /*private checkWin(array: number[], winNumber: number): boolean {
    console.log(this.sp8deCrypto.getRandomFromArray(array, 1, 6), winNumber);
    return this.sp8deCrypto.getRandomFromArray(array, 1, 6) === winNumber;
  }

  public startGame(parameters: parametersStartGame): Observable<GameStartResponse> {
    return this.api.apiDemoGameStartPost(this.createRequestStart(this.requestStart, parameters))
      .pipe(
        map(
          item => {
            this.startResponse = item;
            return <GameFinishResponse>item;
          }));
  }*/

  /*public endGame(parameters: parametersEndGame): Observable<GameFinishResponse> {
    return this.api.apiDemoGameEndPost(this.createRequestEnd(this.requestEnd, parameters))
      .pipe(
        map(item => {
          // some actions
          return <GameFinishResponse>item;
        })
      );
  }*/

  /*private createRequestEnd(request: GameFinishRequest, parameters: parametersEndGame): GameFinishRequest {
    for (let parameter in parameters) {
      if (!parameters[parameter]) {
        console.error('Invalid parameters');
        return;
      }
      request[parameter] = parameters[parameter];
    }
    console.info('End request', request);
    return request;
  }

  private createRequestStart(request: GameStartRequest, parameters: parametersStartGame): GameStartRequest {
    for (let parameter in parameters) {
      if (!parameters[parameter]) {
        console.error('Invalid parameters');
        return;
      }
      request[parameter] = parameters[parameter];
    }
    console.info('Start request', request);
    return request;
  }*/

  /*private validateResponse(response: GameStartResponse): boolean[] {
    const result: boolean[] = [];
    for (const item of response.items) {
      result.push(this.sp8deCrypto.validate(item));
    }
    return result;
  }*/
}

/*
interface parametersEndGame {
  gameId: string,
  sign: string,
  seed: number,
  pubKey: string
}
*/
/*

interface parametersStartGame {
  sign: string,
  pubKey: string
}
*/
