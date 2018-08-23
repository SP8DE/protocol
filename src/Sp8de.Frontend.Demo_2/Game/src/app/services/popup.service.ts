import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  public text = new Subject();

  constructor() {
  }

  public sendText(text: string): void {
    this.text.next(text);
  }
}
