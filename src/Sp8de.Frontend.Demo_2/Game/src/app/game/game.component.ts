import {Component, Input, OnInit} from '@angular/core';
import {HistoryService} from '../services/history.service';
import {GameService} from '../services/game.service';
import {CryptoService} from '../services/crypto.service';
import {UserService} from '../services/user.service';
import {DemoGameService} from '../api';
import {Item, Round, User} from '../types';
import {map, switchMap} from 'rxjs/operators';
import {from, of, Subject} from 'rxjs';
import {Router} from '@angular/router';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass']
})
export class GameComponent implements OnInit {
  @Input() public type = '';
  @Input() public title = '';
  @Input() public countItems = 0;
  @Input() public bets: number[] = [10, 100, 1000];
  @Input() public items: Item[] = [];
  public loaded = false;
  public history: Round[] = [];
  public currentWin: boolean;
  public balance: number;
  public user: User;

  constructor(public historyService: HistoryService,
              public gameService: GameService,
              public router: Router,
              public cryptoService: CryptoService,
              public userService: UserService,
              public api: DemoGameService) {
  }

  ngOnInit() {
    this.userService.updateUser.subscribe(updateUser => {
      for (const key in this.user) {
        this.user[key] = updateUser[key];
      }
    });
    this.userService.initGame().subscribe(user => {
      this.user = user;
      this.loaded = true;
    });
  }

  private testBets(arr, count) {
    for (let i = 0; i < count; i++) {
      this.start({currentBetAmount: 100, currentBet: arr, type: this.type});
    }
  }

  public start(event): void {
    this.currentWin=null;
    const cryptoParameters = this.cryptoService.generateCryptoParameters();
    this.gameService.startGame(
      {
        type: event.type,
        bet: event.currentBet,
        betAmount: event.currentBetAmount,
        pubKey: cryptoParameters.pubKey,
        sign: cryptoParameters.sign,
        nonce: cryptoParameters.nonce
      }).pipe(
      switchMap(startResponse => {
        console.group('Start');
        console.warn('Start response', startResponse);
        console.groupEnd();
        return this.gameService.endGame({
          gameId: startResponse.gameId,
          sign: cryptoParameters.sign,
          seed: cryptoParameters.seed,
          nonce: cryptoParameters.nonce,
          pubKey: cryptoParameters.pubKey
        });
      })).subscribe(res => {
        console.group('End');
        const validWin = this.cryptoService.validateWin(res.sharedSeedArray, res.winNumbers),
          validItems = this.cryptoService.validatePlayers(res),
          win = this.checkWin(res.winNumbers[0], event.currentBet);
        console.warn('End response', res);
        console.log('Validate items:', validItems);
        // console.log('Validate win:', validWin);
        // console.log('Check win:', win, res.winNumbers);
        console.groupEnd();
        this.currentWin = win;
        this.userService.setFields({
          'balance': this.user.balance + (res.isWinner ? +res.winAmount : (-event.currentBetAmount)),
          'history': this.historyService.setRecord({
            response: res,
            openAdvanced: false,
            bet: event.currentBet,
            betAmount: event.currentBetAmount,
            player: this.user.name,
            type: this.type
          })
        });
      },
      error => {
        console.error(error.message);
      });
  }

  private checkWin(result: number, bet: any[]): boolean {
    // return !!bet.find(item => item === result);
    return !!~bet.indexOf(result);
  }
}
