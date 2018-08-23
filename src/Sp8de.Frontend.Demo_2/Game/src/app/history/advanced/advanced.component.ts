import {Component, Input, OnInit} from '@angular/core';
import {GameFinishResponse} from '../../api';

@Component({
  selector: 'app-advanced',
  templateUrl: './advanced.component.html',
  styleUrls: ['./advanced.component.sass']
})
export class AdvancedComponent implements OnInit {
  @Input() data: GameFinishResponse;
  @Input() open: boolean;

  constructor() {
  }

  ngOnInit() {
  }

}
