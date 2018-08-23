import {Component, OnInit} from '@angular/core';
import {Sp8deBlock} from '../api';
import {Anchor} from '../api/model/anchor';
import {Router} from '@angular/router';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.sass']
})
export class ListComponent implements OnInit {
  public list: Sp8deBlock[] = [];

  constructor(public router: Router) {
  }

  ngOnInit() {
    for (let i = 0; i < 15; i++) {
      this.list.push(
        {
          id: i,
          chainId: i * 491,
          hash: 'sdfsfdg',
          previousHash: 'afggsfg',
          transactionRoot: 'sdfgsgfsfsda',
          signer: 'dsfdafafdfg',
          signature: 'afggsgfs',
          timestamp: +(new Date()) + 15 * i,
          transactionsCount: Math.floor(i * 4 - (i + 2) / 2 + i % 3),
          transactions: ['123edsfsf', '324dsfkkpsod']
        }
      );
    }
  }

  public open(id): void {
    this.router.navigate([`list/${id}`]);
  }
}
