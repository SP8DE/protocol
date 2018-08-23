import { Component, OnInit } from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {UserService} from '../services/user.service';
import {HistoryService} from '../services/history.service';
import {PopupService} from '../services/popup.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.sass']
})
export class LoginComponent implements OnInit {
  public popup = {
    text: '',
    show: false
  };
  public name: string;
  public password: string;
  public authForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  constructor(public userService: UserService,
              public historyService: HistoryService,
              public popupService: PopupService,
              public router: Router) {
  }

  ngOnInit() {
    console.log('join');
    const user = this.userService.getUser();
    this.name = user ? user.name : '';
  }

  public joinGameOld(game: string): void {
    /*this.userService.setUser(this.name)
      .subscribe(res => {
          this.historyService.clearHistory();
          this.router.navigate([game]);
        },
        error => {
          console.error(error);
        });*/
  }

  public joinGame(): void {
    this.userService.login(this.authForm.controls['name'].value, this.authForm.controls['password'].value)
      .subscribe(confirmed => {
          if (confirmed) {
            this.historyService.clearHistory();
            this.router.navigate(['join']);
          } else {
          }
        },
        error => {
          this.popupService.sendText('Incorrect login or password');
          this.authForm.controls['password'].setErrors({});
        });
  }

  private showPopup(text: string): void {
    this.popup.show = true;
    this.popup.text = text;
    setTimeout(() => this.hidePopup(), 3000);
  }

  private hidePopup(): void {
    this.popup.show = false;
  }
}
