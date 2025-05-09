import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ToolListComponent } from './tool-list/tool-list.component';
import { FormsModule } from '@angular/forms';
import { ToolDetailComponent } from './tool-detail/tool-detail.component';
import { EquipStatisticsComponent } from './equip-statistics/equip-statistics.component';
import { TestStatisticsComponent } from './test-statistics/test-statistics.component';
// import { TrendComponent } from './trend/trend.component';
// import { AppComponent } from './app.component'; // Not needed here

export const routes: Routes = [
  { path: '', redirectTo: '/tools', pathMatch: 'full' },
  { path: 'tools', component: ToolListComponent },
  { path: 'tools/:id', component: ToolDetailComponent },
  { path: 'statistics/:equip_id', component: EquipStatisticsComponent },
  { path: 'test-statistics', component: TestStatisticsComponent }
  // { path: '**', redirectTo: '/tools' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled', // 👈 scroll to top on route load
      
    }),
    FormsModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
