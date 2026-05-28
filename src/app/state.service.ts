import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  currentView = signal<string>('role'); 
  previousView = signal<string>('role');
  currentDashboardView = signal<string>('dashboard');
  
  userRole = signal<'adm' | 'aluno' | null>(null);
  userName = signal<string>(''); 
  userEmail = signal<string>(''); 
  userTelefone = signal<string>('');

  logout() {
    this.userRole.set(null);
    this.userName.set(''); 
    this.userEmail.set(''); 
    this.userTelefone.set('');
    this.currentView.set('role');
    
    localStorage.removeItem('coursify_role');
    localStorage.removeItem('coursify_name'); 
    localStorage.removeItem('coursify_email'); 
  }
}