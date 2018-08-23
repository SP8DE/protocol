import {Injectable} from '@angular/core';
import {Round} from '../types';
import {Subject} from 'rxjs';
import {map} from 'rxjs/operators';
import {UserService} from './user.service';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private list: Round[] = [];

  constructor() {
  }

  public setRecord(record: Round): Round[] {
    this.list.unshift(record);
    return this.list;
  }

  public getList(): Round[] {
    return this.list;
  }

  public setList(list: Round[]): void {
    this.list = list;
  }

  public clearHistory(): void {
    this.list = [];
  }
}
