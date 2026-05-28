import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true, // Garanta que está como true
  imports: [RouterLink], // 2. Adicione o RouterLink aqui dentro!
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  // Variável para guardar a URL da imagem carregada
  imagemCursoUrl: string | ArrayBuffer | null = null;

  // Função que é ativada quando o usuário escolhe um arquivo
  onImagemSelecionada(event: Event) {
    const elemento = event.target as HTMLInputElement;
    const arquivo = elemento.files?.[0];

    if (arquivo) {
      // FileReader lê o arquivo e transforma em uma URL que o navegador consegue mostrar
      const leitor = new FileReader();
      leitor.onload = () => {
        this.imagemCursoUrl = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    }
  }

  // 1. FUNÇÃO CANCELAR ÚNICA (Limpa os campos de texto E a imagem)
  cancelar(campos: any[]) {
    campos.forEach(campo => campo.value = '');
    this.imagemCursoUrl = null; // Limpa a imagem selecionada
    alert(' Ação cancelada! Todos os campos e a imagem foram limpos.');
  }

  // 2. Só aceita se pelo menos UM campo estiver preenchido
  salvarRascunho(dados: string[]) {
    const temAlgoPreenchido = dados.some(valor => valor.trim() !== '');

    if (temAlgoPreenchido) {
      alert(' Rascunho salvo com sucesso!');
    } else {
      alert(' Erro: Você precisa preencher pelo menos um campo para salvar um rascunho.');
    }
  }

  // 3. Só aceita se TODOS os campos obrigatórios estiverem preenchidos
  publicarCurso(dados: {titulo: string, preco: string, subtitulo: string, nivel: string, categoria: string, desc: string}) {
    if (
      dados.titulo.trim() === '' || 
      dados.preco.trim() === '' || 
      dados.subtitulo.trim() === '' ||
      dados.nivel === 'Selecione o nível' ||
      dados.categoria === 'Selecione uma categoria' ||
      dados.desc.trim() === ''
    ) {
      alert(' ATENÇÃO: Todos os campos são obrigatórios para a publicação do curso!');
    } else {
      alert(` SUCESSO! O curso "${dados.titulo}" foi publicado com sucesso!`);
    }
  }
}