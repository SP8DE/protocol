import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.sass']
})
export class PreferencesComponent implements OnInit {
  @Input() public started: any = false;
  @Input() public type = '';
  @Input() public title = '';
  @Input() public items: any[] = [];
  @Input() public bets: number[] = [];
  @Output() public onStart = new EventEmitter<any>();
  public currentBetAmount: number;
  public currentBet: number[] = [];

  constructor() {
  }

  ngOnInit() {
  }

  public start() {
    this.onStart.emit({
      currentBetAmount: this.currentBetAmount,
      currentBet: this.currentBet,
      type: this.type
    });
  }

  public choiceItem(item): void {
    if (this.type === 'Dice') {
      const bet = [];
      item.choice = !item.choice;
      for (const it of this.items) {
        if (it.choice) {
          bet.push(+it.src);
        }
      }
      this.currentBet = bet;
      this.validateChoicesItems(item);
    } else {
      for (const it of this.items) {
        it.choice = false;
      }
      item.choice = !item.choice;
      this.currentBet = [item.src];
    }
  }

  private validateChoicesItems(item): void {
    if (this.currentBet.length === this.items.length) {
      console.error('Max choised item!');
      this.choiceItem(item);
      return;
    }
  }

  public choiceBet(bet): void {
    this.currentBetAmount = bet;
  }
}
