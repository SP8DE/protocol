import {Injectable} from '@angular/core';
import {Observable, of, Subject} from 'rxjs';
import {User} from '../types';
import {map} from 'rxjs/operators';
import {AuthService} from './auth.service';
import {CryptoService} from './crypto.service';
import {HistoryService} from './history.service';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private user: User;
  public updateUser: Subject<User> = new Subject();

  constructor(public auth: AuthService,
              public historyService: HistoryService,
              public cryptoService: CryptoService) {
  }

  public initGame(): Observable<User> {
    return this.cryptoService.init().pipe(map(() => {
      const user = this.getUser();
      this.historyService.setList(user.history);
      return this.setUser({
        name: user.name || null,
        balance: user.balance || null,
        history: user.history || null,
        token: user.token || null
      });
    }));
  }

  public setUserOld(name): Observable<any> {
    if (!name) {
      throw Error('Invalid user name');
    }
    /*this.user = {
      name: name
    };*/
    LocalStorageMethods.setItem('user', this.user);
    return of('successful');
  }

  public setUser(user?: any): User {
    const createdUser = user ? user : {
      name: 'John Doe',
      balance: 1000,
      history: [],
      token: 'test',
      wallets: []
    };
    return new User(
      createdUser.name,
      createdUser.balance,
      createdUser.history,
      createdUser.token,
      createdUser.wallets
    );
  }

  public login(name?: string, password?: string): Observable<any> {
    if (!name && !password) {
      return of(this.setUserToStorage(this.setUser())).pipe(map(() => {
          this.updateUser.next(this.user);
        }
      ));
    }
    return this.auth.login(name, password).pipe(
      map(res => <User>res),
      map(user => {
        this.user = this.isLogged() ? user : this.setUser(user);
        this.setUserToStorage(this.user);
        this.updateUser.next(this.user);
        return this.user;
      }));
  }

  public getUserFromStorage(): User {
    return <User>LocalStorageMethods.getItem('user');
  }

  public setUserToStorage(user: User): void {
    LocalStorageMethods.setItem('user', user);
  }

  public setFieldInStorage(item: string, value: any): void {
    if (!this.isLogged()) {
      throw new Error('User not found');
    }
    const user = this.getUserFromStorage();
    user[item] = value;
    this.setUserToStorage(user);
  }

  public setFieldsInStorage(updates: {}): void {
    if (!this.isLogged()) {
      throw new Error('User not found');
    }
    this.setUserToStorage(
      this.updateObject(
      this.getUserFromStorage(), updates));
  }

  setFields(updates: {}) {
    this.updateObject(this.user, updates);
    this.setFieldsInStorage(updates);
    this.updateUser.next(this.user);
  }

  private updateObject(object: {}, updates: {}): User {
    for (const key in updates) {
      object[key] = updates[key];
    }
    return <User>object;
  }

  public getUser(): User {
    const storage = LocalStorageMethods.getItem('user');
    if (this.user) {
      return this.user;
    } else if (storage) {
      this.user = storage;
      return this.user;
    }
    return null;
  }

  public isLogged(): boolean {
    const user = this.getUser();
    return user !== null && !!user.token;
  }

  public logOut() {
    this.user = null;
    LocalStorageMethods.removeItem('user');
  }
}

class LocalStorageMethods {
  static setItem(key, value) {
    if (!localStorage) {
      throw new Error('Does not localstorage in global');
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  static getItem(key) {
    if (!localStorage) {
      throw new Error('Does not localstorage in global');
    }
    return JSON.parse(localStorage.getItem(key));
  }

  static removeItem(key) {
    if (!localStorage) {
      throw new Error('Does not localstorage in global');
    }
    localStorage.removeItem(key);
  }

  static clear() {
    if (!localStorage) {
      throw new Error('Does not localstorage in global');
    }
    localStorage.clear();
  }
}
