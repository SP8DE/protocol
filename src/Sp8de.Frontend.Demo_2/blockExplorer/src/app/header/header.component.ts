import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass']
})
export class HeaderComponent implements OnInit {
  public searchInput: string;

  constructor(public router: Router) {
  }

  public search(): void {
    this.router.navigate([`list/${this.searchInput}`]);
  }

  ngOnInit() {
  }

}
