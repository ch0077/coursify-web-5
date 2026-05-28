import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-meus-cursos',
  standalone: true, 
  imports: [CommonModule, RouterLink], 
  templateUrl: './meus-cursos.component.html',
  styleUrl: './meus-cursos.component.css' // ⬅️ AQUI ESTAVA O MEU ERRO! Faltava essa linha!
})
export class MeusCursosComponent {

  courses = [
    { id: 1, title: 'Nome do Curso', subtitle: 'Subtítulo/Pequena descrição do curso.', imageUrl: null },
    { id: 2, title: 'Nome do Curso 2', subtitle: 'Subtítulo/Pequena descrição do curso.', imageUrl: null }
  ];

  onFileSelected(event: any, course: any, fileInput: HTMLInputElement) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        course.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(course: any, event: Event, fileInput: HTMLInputElement) {
    event.stopPropagation(); 
    course.imageUrl = null;
    fileInput.value = ''; 
  }

  deleteCourse(courseToDelete: any) {
    if(confirm(`Tem certeza que deseja apagar o curso "${courseToDelete.title}"?`)) {
      this.courses = this.courses.filter(course => course.id !== courseToDelete.id);
    }
  }

  editCourse(course: any) {
    alert(`Redirecionando para a edição do curso: ${course.title}`);
  }
}