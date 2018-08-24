import {Component, Input, OnInit} from '@angular/core';
import {User} from "../../types";
import {UserService} from "../../services/user.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.sass']
})
export class UserComponent implements OnInit {
  @Input() public user: User;

  constructor(public userService: UserService,
              public router: Router) {
  }

  ngOnInit() {
  }

  public toFixed(val: number): string {
    return val ? val.toFixed(2) : '0';
  }

  public logOut(): void {
    this.userService.logOut();
    this.router.navigate(['./login']);
  }
}
