import {NgModule} from '@angular/core';
import {DiceComponent} from './dice/dice.component';
import {RouterModule, Routes, CanActivate} from '@angular/router';
import {JoinComponent} from './join/join.component';
import {CoinFlipComponent} from './coin-flip/coin-flip.component';
import {AuthGuard} from './auth.guard';
import {LoginComponent} from './login/login.component';

const routes: Routes = [
  {path: 'dice', component: DiceComponent, canActivate: [AuthGuard]},
  {path: 'coinflip', component: CoinFlipComponent, canActivate: [AuthGuard]},
  {path: 'login', component: LoginComponent},
  {path: '', component: JoinComponent},
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
