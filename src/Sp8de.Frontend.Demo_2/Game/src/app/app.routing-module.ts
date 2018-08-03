import {NgModule} from '@angular/core';
import {DiceComponent} from './dice/dice.component';
import {RouterModule, Routes} from '@angular/router';
import {JoinComponent} from './join/join.component';
import {CoinFlipComponent} from './coin-flip/coin-flip.component';

const routes: Routes = [
  {path: '', component: JoinComponent},
  {path: 'dice', component: DiceComponent},
  {path: 'coinflip', component: CoinFlipComponent},
  {path: '**', component: JoinComponent},
];


@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
