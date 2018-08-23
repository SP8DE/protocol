import {Component, OnInit} from '@angular/core';
import {PopupService} from './services/popup.service';
import {from, of, Subject} from 'rxjs';
import {fromArray} from '../../node_modules/rxjs/internal/observable/fromArray';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  public popup = {
    text: '',
    show: false
  };

  constructor(public popupService: PopupService) {
  }

  ngOnInit() {
    this.popupService.text.subscribe(changes => {
      this.popup.show = true;
      this.popup.text = changes.toString();
      setTimeout(() => this.popup.show = false, 1000);
    });
  }

}
