import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {Sp8deClientSDK} from 'sp8de-client-sdk';
import {AppComponent} from './app.component';
import {ApiModule} from './api';
import {DiceComponent} from './dice/dice.component';
import {AppRoutingModule} from './app.routing-module';
import {JoinComponent} from './join/join.component';
import {CoinFlipComponent} from './coin-flip/coin-flip.component';
import {FormsModule, NgForm, ReactiveFormsModule} from '@angular/forms';
import {UserService} from './services/user.service';
import {HistoryService} from './services/history.service';
import {HistoryComponent} from './history/history.component';
import {ResultComponent} from './result/result.component';
import {PreferencesComponent} from './preferences/preferences.component';
import {GameComponent} from './game/game.component';
import {AdvancedComponent} from './history/advanced/advanced.component';
import {LoginComponent} from './login/login.component';

@NgModule({
  declarations: [
    AppComponent,
    DiceComponent,
    JoinComponent,
    CoinFlipComponent,
    HistoryComponent,
    ResultComponent,
    PreferencesComponent,
    GameComponent,
    AdvancedComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ApiModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [Sp8deClientSDK],
  bootstrap: [AppComponent]
})
export class AppModule {
}
