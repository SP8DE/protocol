import {Component, Input, OnInit} from '@angular/core';
import {Round} from '../types';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.sass']
})
export class HistoryComponent implements OnInit {
  @Input() public type = '';
  @Input() public history: Round[] = [];

  constructor() {
  }

  ngOnInit() {
  }

}
