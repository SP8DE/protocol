import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {Sp8deCrypto} from 'sp8de.crypto';
import {AppComponent} from './app.component';
import {ApiModule} from '../api';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ApiModule
  ],
  providers: [Sp8deCrypto],
  bootstrap: [AppComponent]
})
export class AppModule {
}
