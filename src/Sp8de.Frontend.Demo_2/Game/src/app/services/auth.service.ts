import {Injectable} from '@angular/core';
import {MockService} from './mock.service';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {Error} from '../../../node_modules/tslint/lib/error';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(public api: MockService) {
  }

  public login(name: string, password: string): Observable<any> {
    return this.api.auth(name, password).pipe(map(res => {
      if (res.token) {
        return res;
      } else {
        throw new Error('Authentication rejected');
        // return false
        // throw new Error('Not token');
      }
    }));
  }
}
