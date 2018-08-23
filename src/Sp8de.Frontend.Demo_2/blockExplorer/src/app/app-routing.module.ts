import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {ListComponent} from './list/list.component';
import {TransactionComponent} from './transaction/transaction.component';
import {MainComponent} from './main/main.component';

const routes: Routes = [
  {path: 'list', component: ListComponent},
  {path: 'list/:id', component: TransactionComponent},
  {path: '', component: MainComponent},
  {path: '**', component: MainComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
