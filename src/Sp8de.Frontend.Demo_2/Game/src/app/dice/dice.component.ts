import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-dice',
  templateUrl: './dice.component.html',
  styleUrls: ['./dice.component.sass']
})
export class DiceComponent implements OnInit {
  public parameters = {
    title: 'Dices',
    bets: [10, 100, 1000],
    type: 'Dice',
    countItems: 6,
    items: [
      {src: 1, choice: false},
      {src: 2, choice: false},
      {src: 3, choice: false},
      {src: 4, choice: false},
      {src: 5, choice: false},
      {src: 6, choice: false}
    ]
  };

  constructor() {
  }

  ngOnInit() {
  }
}


