import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Sp8deClientSDK} from 'sp8de-client-sdk';
import {DemoGameService, GameFinishRequest, GameFinishResponse, GameStartRequest, GameStartResponse} from '../api';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor(public api: DemoGameService) {
  }

  public startGame(parameters: GameStartRequest): Observable<GameStartResponse> {
    return this.api.apiDemoGameStartPost(parameters)
      .pipe(
        map(
          item => {
            return <GameFinishResponse>item;
          }));
  }

  public endGame(parameters: GameFinishRequest): Observable<GameFinishResponse> {
    return this.api.apiDemoGameEndPost(parameters).pipe(
      map(
        item => {
          return <GameFinishResponse>item;
        }));
  }
}
