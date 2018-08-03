import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {Sp8deCrypto} from 'sp8de.crypto';
import {AppComponent} from './app.component';
import {ApiModule} from './api';
import {DiceComponent} from './dice/dice.component';
import {AppRoutingModule} from './app.routing-module';
import {JoinComponent} from './join/join.component';
import {CoinFlipComponent} from './coin-flip/coin-flip.component';
import {FormsModule, NgForm} from '@angular/forms';
import {UserService} from './user.service';
import {HistoryService} from './history.service';
import {HistoryComponent} from './history/history.component';
import {ResultComponent} from './result/result.component';
import {PreferencesComponent} from './preferences/preferences.component';
import { GameComponent } from './game/game.component';
import { AdvancedComponent } from './history/advanced/advanced.component';

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
    AdvancedComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ApiModule,
    FormsModule
  ],
  providers: [Sp8deCrypto, UserService, HistoryService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
