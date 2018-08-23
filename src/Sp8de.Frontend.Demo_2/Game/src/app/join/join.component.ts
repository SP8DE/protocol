import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, NgForm, Validator, Validators} from '@angular/forms';
import {UserService} from '../services/user.service';
import {Router} from '@angular/router';
import {HistoryService} from '../services/history.service';
import {catchError, filter} from 'rxjs/operators';
import {PopupService} from '../services/popup.service';

@Component({
  selector: 'app-join',
  templateUrl: './join.component.html',
  styleUrls: ['./join.component.sass']
})
export class JoinComponent implements OnInit {
  public name: string;

  constructor(public userService: UserService,
              public historyService: HistoryService,
              public popupService: PopupService,
              public router: Router) {
  }

  ngOnInit() {
  }

  public joinGame(game: string): void {
    this.router.navigate([game]);
  }

}
