import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {GameFinishResponse} from '../api/index';

@Injectable({
  providedIn: 'root'
})
export class MockService {

  constructor() {
  }

  public auth(name: string, password: string): Observable<any> {
    if (name === '123' && password === '123') {
      return of({
        name,
        password,
        balance: 1000,
        deposit: 1000,
        history: [],
        token: 'mock'
      });
    } else {
      return of({});
    }

  }
}
