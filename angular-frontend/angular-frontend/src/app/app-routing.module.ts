import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ToolListComponent } from './tool-list/tool-list.component';
import { FormsModule } from '@angular/forms';
import { ToolDetailComponent } from './tool-detail/tool-detail.component';
import { EquipStatisticsComponent } from './equip-statistics/equip-statistics.component';
//import { TrendComponent } from './trend/trend.component';

export const routes: Routes = [ // Add `export` here
  { path: 'tools', component: ToolListComponent },
  { path: 'tools/:id', component: ToolDetailComponent },
  //{path: 'tools/trend/:equipId', component: TrendComponent},
//   { path: '', redirectTo: '/tools', pathMatch: 'full' },
//   { path: '**', redirectTo: '/tools' },
  { path: 'statistics/:equip_id', component: EquipStatisticsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes), FormsModule],
  exports: [RouterModule]
})
export class AppRoutingModule {}
