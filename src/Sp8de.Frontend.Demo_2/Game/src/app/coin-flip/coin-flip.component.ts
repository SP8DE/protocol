import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-coin-flip',
  templateUrl: './coin-flip.component.html',
  styleUrls: ['./coin-flip.component.sass']
})
export class CoinFlipComponent implements OnInit {
  public parameters = {
    title: 'Coin-flip',
    bets: [10, 100, 1000],
    type: 'TossCoin',
    countItems: 6,
    items: [
      {src: 0, choice: false},
      {src: 1, choice: false}
    ]
  };

  constructor() {
  }

  ngOnInit() {
  }

}
