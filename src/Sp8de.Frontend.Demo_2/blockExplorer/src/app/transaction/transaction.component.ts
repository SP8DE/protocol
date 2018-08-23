import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiModule, Sp8deTransaction} from '../api';
import {Anchor} from '../api/model/anchor';
import {TransactionData} from '../api/model/transactionData';
import {InternalTransaction} from '../api/model/internalTransaction';
import {TransactionMeta} from '../api/model/transactionMeta';
import {switchMap} from 'rxjs/operators';

@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.sass']
})
export class TransactionComponent implements OnInit {
  public id: number;
  public transaction: Sp8deTransaction;

  constructor(public router: ActivatedRoute,
              public api: ApiModule) {
    this.router.params.subscribe(res => {
        this.id = +res.id;
        this.transaction = {
          id: '12',
          type: 'AggregatedCommit',
          hash: '0xe7bfd8fa2731ebb886ecf7b3aee2adcf6526489d9b51519aa18594be24025d06',
          signer: 'John',
          signature: 'x34782389x74297ex27',
          status: 'Pending',
          dependsOn: 'Ren',
          timestamp: +(new Date()),
          expiration: this.id,
          compleatedAt: this.id,
          fee: this.id,
          internalRoot: 'sdfffs'
        };
      });
  }

  ngOnInit() {
  }

}
