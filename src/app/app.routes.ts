import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


import { DashboardComponent } from './dashboard/dashboard.component';
import { MeusCursosComponent } from './meus-cursos/meus-cursos.component';

export const routes: Routes = [

  { path: 'dashboard', component: DashboardComponent },
 { path: 'meus-cursos', component: MeusCursosComponent } 
];