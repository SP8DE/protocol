import {TestBed, inject} from '@angular/core/testing';

import {UserService} from './user.service';

describe('UserService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService]
    });
  });

  it('should be created', inject([UserService], (service: UserService) => {
    expect(service).toBeTruthy();
  }));

  describe('Set user', () => {
    it('setUser should be defined', inject([UserService], (service: UserService) => {
      expect(service.setUser).toBeDefined();
    }));
    it('setUser should be create user with name', inject([UserService], (service: UserService) => {
      const name = 'name';
      service.setUser(name).subscribe(res => {
          expect(res).toEqual('successful');
        },
        error => {
        });
    }));
  });
  describe('Delete user', () => {
    it('deleteUser should be defined', inject([UserService], (service: UserService) => {
      expect(service.deleteUser).toBeDefined();
    }));
    it('setUser should be create user with name', inject([UserService], (service: UserService) => {
      const name = 'name';
      service.deleteUser();
      expect(service.getUser()).toBeNull();
      expect(service.isLogged()).toBeFalsy();
    }));
  });
  /*describe('Get user', () => {
    it('getUser should be defined', inject([UserService], (service: UserService) => {
      expect(service.getUser).toBeDefined();
    }));
    it('getUser should be get user', inject([UserService], (service: UserService) => {
      const name = 'name';
      service.setUser(name).subscribe(res => {
        expect(service.getUser()).toEqual({name: name});
      });
    }));
  });*/
  describe('Is logged', () => {
    it('isLogged should be defined', inject([UserService], (service: UserService) => {
      expect(service.isLogged).toBeDefined();
    }));
    it('isLogged should be get true if have user', inject([UserService], (service: UserService) => {
      const name = 'name';
      service.setUser(name).subscribe(res => {
        expect(service.isLogged()).toBeTruthy();
      });
    }));
    it('isLogged should be get false without user', inject([UserService], (service: UserService) => {
      service.deleteUser();
      expect(service.isLogged()).toBeFalsy();
    }));
  });
});
