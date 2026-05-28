import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, YouTubePlayerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  
  router = inject(Router);
  http = inject(HttpClient);
  
  currentView = signal<string>('role'); 
  previousView = signal<string>('role');
  currentDashboardView = signal<string>('dashboard');
  
  userRole = signal<'adm' | 'aluno' | null>(null);
  userName = signal<string>(''); 
  userEmail = signal<string>(''); 
  
  userTelefone = signal<string>(''); 
  editandoPerfil = signal<boolean>(false);
  formInputNome: string = '';
  formInputEmail: string = '';
  formInputTelefone: string = '';

  showPassword = signal<boolean>(false);
  simulatingProvider = signal<string | null>(null);
  simulatedRole = signal<'adm' | 'aluno' | null>(null);

  loginData = { email: '', password: '', idProf: '' };
  cadastroData = { nome: '', email: '', senha: '', idProf: '' }; 
  recoverEmail = '';

  courses: any[] = [];
  totalAlunos: number = 0; 

  searchQuery: string = '';
  selectedCategoryFilter: string = 'Todas';
  selectedLevelFilter: string = 'Todos';

  searchExploreQuery: string = '';
  selectedExploreCategory: string = 'Todas';
  selectedExploreLevel: string = 'Todos';
  selectedExplorePrice: string = 'Todos';

  favoritosCursos: any[] = [];
  carrinhoCursos: any[] = [];
  meusCertificados: any[] = [];
  cursosCompradosIds: string[] = [];

  activeDetailsTab: string = 'sobre'; 
  novaAvaliacaoTexto: string = '';
  listaDeAlunos: any[] = []; 

  selectedCourse: any = null; 
  courseToEdit: any = null;
  cursoAssistindo: any = null;
  videoFinalizado: boolean = false;
  editingCourseIndex: number | null = null;

  newCourse = { 
    title: '', subtitle: '', professor: '', price: '', level: '', category: '', description: '', 
    imageUrl: null as string | null, 
    videoUrl: '',
    topics: ['', '', '', '', ''], 
    duration: '', hasCertificate: 'sim', prerequisites: '', targetAudience: ''
  };

  exploreCourses = [
    { title: 'JAVA Completo', category: 'Programação', level: 'Avançado', professor: 'Prof. Fernando', rating: 4.8, reviews: 423, price: 'R$ 129,90', imgColor: '#000', icon: 'fa-brands fa-java', iconColor: '#f97316' },
    { title: 'HTML5 e CSS3', category: 'Web', level: 'Iniciante', professor: 'Prof. Ana Clara', rating: 4.9, reviews: '1.201', price: 'R$ 89,90', imgColor: '#000', icon: 'fa-brands fa-html5', iconColor: '#e34f26' },
    { title: 'Phyton Completo', category: 'Programação', level: 'Intermediário', professor: 'Prof. Lucas', rating: 4.7, reviews: 320, price: 'R$ 109,90', imgColor: '#000', icon: 'fa-brands fa-python', iconColor: '#60a5fa' },
    { title: 'React', category: 'Web', level: 'Avançado', professor: 'Prof. Fernando', rating: 4.9, reviews: 512, price: 'R$ 149,90', imgColor: '#000', icon: 'fa-brands fa-react', iconColor: '#61dafb' }
  ];

  mainCertificate = { title: 'Java Completo', subtitle: 'Programação: POO', professor: 'Prof. Leonardo', rating: 4.8, reviews: '2.154', hours: '40 Horas', date: '22/05/2026', code: 'CERT-982374' };
  otherCertificates = [ { title: 'HTML5 e CSS3 na prática', date: '10/04/2026' }, { title: 'Lógica de Programação', date: '15/02/2026' } ];

  ngOnInit() {
    const apiLoaded = document.getElementById('youtube-api');
    if (!apiLoaded) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    this.loadData();
    this.carregarCursosDoBanco(); 
    this.carregarEstatisticas();
    this.carregarFavoritos();
    this.carregarCarrinho();
    this.carregarListaDeAlunos();
  }

  assistirAulaNovaGuia(course: any, event: Event) {
    event.stopPropagation();
    if (course.videoUrl && course.videoUrl.trim() !== '') {
      window.open(course.videoUrl, '_blank');
    } else {
      alert('Ops! O professor ainda não adicionou o link do vídeo para este curso.');
    }
  }

  formatarTexto(comando: string, textarea: HTMLTextAreaElement, tipo: 'criar' | 'editar') {
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const textoSelecionado = textarea.value.substring(inicio, fim);
    
    let tagAbertura = '';
    let tagFechamento = '';

    if (comando === 'bold') { tagAbertura = '<b>'; tagFechamento = '</b>'; }
    if (comando === 'italic') { tagAbertura = '<i>'; tagFechamento = '</i>'; }
    if (comando === 'underline') { tagAbertura = '<u>'; tagFechamento = '</u>'; }

    const novoTexto = textarea.value.substring(0, inicio) + tagAbertura + textoSelecionado + tagFechamento + textarea.value.substring(fim);
    
    if (tipo === 'criar') {
      this.newCourse.description = novoTexto;
    } else if (tipo === 'editar' && this.courseToEdit) {
      this.courseToEdit.description = novoTexto;
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(inicio + tagAbertura.length, fim + tagAbertura.length);
    }, 0);
  }

  enviarAvaliacao(event: Event) {
    event.preventDefault();
    if (!this.novaAvaliacaoTexto.trim()) return;
    const carga = {
      nome: this.userName() || 'Aluno',
      texto: this.novaAvaliacaoTexto,
      data: new Date().toLocaleDateString('pt-BR')
    };
    this.http.post(`https://coursify-web-5.onrender.com/cursos/${this.selectedCourse._id}/avaliar`, carga).subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          this.selectedCourse = res.curso; 
          this.novaAvaliacaoTexto = '';
        }
      }
    });
  }

  carregarFavoritos() {
    const email = this.userEmail();
    if (!email) return;
    const salvos = localStorage.getItem(`coursify_favoritos_${email}`);
    this.favoritosCursos = salvos ? JSON.parse(salvos) : [];
  }

  toggleFavorito(course: any, event: Event) {
    event.stopPropagation();
    const email = this.userEmail();
    if (!email) return;
    const idx = this.favoritosCursos.findIndex(c => c._id === course._id);
    if (idx > -1) {
      this.favoritosCursos.splice(idx, 1); 
    } else {
      this.favoritosCursos.push(course); 
    }
    localStorage.setItem(`coursify_favoritos_${email}`, JSON.stringify(this.favoritosCursos));
  }

  isFavorito(course: any): boolean {
    return this.favoritosCursos.some(c => c._id === course._id);
  }

  carregarCarrinho() {
    const email = this.userEmail();
    if (!email) return;
    const salvos = localStorage.getItem(`coursify_carrinho_${email}`);
    this.carrinhoCursos = salvos ? JSON.parse(salvos) : [];
  }

  adicionarAoCarrinho(course: any, event: Event) {
    event.stopPropagation();
    const email = this.userEmail();
    if (!email) {
      alert('⚠️ Você precisa estar logado como aluno para adicionar ao carrinho.');
      return;
    }
    const jaNoCarrinho = this.carrinhoCursos.some(c => c._id === course._id);
    if (jaNoCarrinho) {
      alert('🛒 Este curso já está no seu carrinho!');
      this.currentDashboardView.set('carrinho');
      return;
    }
    this.carrinhoCursos.push(course);
    localStorage.setItem(`coursify_carrinho_${email}`, JSON.stringify(this.carrinhoCursos));
    alert('🎉 Curso adicionado ao carrinho com sucesso!');
    this.currentDashboardView.set('carrinho'); 
  }

  removerDoCarrinho(course: any, event: Event) {
    event.stopPropagation();
    const email = this.userEmail();
    if (!email) return;
    this.carrinhoCursos = this.carrinhoCursos.filter(c => c._id !== course._id);
    localStorage.setItem(`coursify_carrinho_${email}`, JSON.stringify(this.carrinhoCursos));
  }

  get totalCarrinho(): string {
    let total = 0;
    this.carrinhoCursos.forEach(c => {
      if (c.price) {
        const precoLimpo = c.price.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const valor = parseFloat(precoLimpo);
        if (!isNaN(valor)) {
          total += valor;
        }
      }
    });
    return total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  carregarListaDeAlunos() {
    if (this.userRole() !== 'adm') return; 
    this.http.get('https://coursify-web-5.onrender.com/usuarios/alunos').subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          this.listaDeAlunos = res.alunos.map((a: any) => ({
            nome: a.nome, email: a.email, iniciais: a.nome.substring(0, 2).toUpperCase(), cursoNome: 'Aluno'
          }));
        }
      }
    });
  }

  finalizarCompraCarrinho() {
    const email = this.userEmail();
    if (!email) return;
    const ids = this.carrinhoCursos.map(c => c._id);
    this.http.post('https://coursify-web-5.onrender.com/usuarios/comprar', { email, cursosIds: ids }).subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          alert('🚀 Compra finalizada com sucesso! Bons estudos!');
          this.carrinhoCursos = [];
          localStorage.removeItem(`coursify_carrinho_${email}`);
          this.cursosCompradosIds.push(...ids);
          this.currentDashboardView.set('meus-cursos'); 
        }
      }
    });
  }

  carregarPerfilDoBanco(email: string) {
    this.http.get(`https://coursify-web-5.onrender.com/usuarios/perfil/${email}`).subscribe({
      next: (resposta: any) => {
        if (resposta.sucesso && resposta.usuario) {
          this.userName.set(resposta.usuario.nome);
          this.userTelefone.set(resposta.usuario.telefone || '');
          this.cursosCompradosIds = resposta.usuario.cursosComprados || []; 
          this.meusCertificados = resposta.usuario.certificados || [];
        }
      }
    });
  }

  alternarEdicaoPerfil(modoAtivo: boolean) {
    this.editandoPerfil.set(modoAtivo);
    if (modoAtivo) {
      this.formInputNome = this.userName() || '';
      this.formInputEmail = this.userEmail() || '';
      this.formInputTelefone = this.userTelefone() || '';
    }
  }

  salvarPerfil() {
    const dadosParaSalvar = {
      nome: this.formInputNome,
      emailAntigo: this.userEmail(), 
      emailNovo: this.formInputEmail, 
      telefone: this.formInputTelefone
    };

    this.http.put('https://coursify-web-5.onrender.com/usuarios/perfil', dadosParaSalvar)
      .subscribe({
        next: (resposta: any) => {
          if (resposta.sucesso) {
            this.userName.set(this.formInputNome);
            this.userEmail.set(this.formInputEmail); 
            this.userTelefone.set(this.formInputTelefone);
            this.editandoPerfil.set(false);
            this.saveData(); 
            alert('Perfil updated e salvo no banco de dados com sucesso!');
          } else {
            alert('Aviso do servidor: ' + resposta.mensagem);
          }
        },
        error: (erro) => {
          console.error('Erro na requisição HTTP:', erro);
          alert('Não foi possível salvar os dados no servidor. Verifique se o seu backend está ligado!');
        }
      });
  }

  onTelefoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length === 0) value = '';
    else if (value.length <= 2) value = `(${value}`;
    else if (value.length <= 6) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    else value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
    this.formInputTelefone = value;
    input.value = value;
  }

  get availableCategories() {
    const cursosFiltrados = this.userRole() === 'adm'
      ? this.courses.filter(course => course.criadorEmail === this.userEmail())
      : this.courses;
    const categories = cursosFiltrados.map(c => c.category).filter(c => c);
    return ['Todas', ...new Set(categories)]; 
  }

  get availableLevels() {
    const cursosFiltrados = this.userRole() === 'adm'
      ? this.courses.filter(course => course.criadorEmail === this.userEmail())
      : this.courses;
    const levels = cursosFiltrados.map(c => c.level).filter(c => c);
    return ['Todos', ...new Set(levels)]; 
  }

  get filteredCourses() {
    return this.courses.filter(course => {
      const matchCategory = this.selectedCategoryFilter === 'Todas' || course.category === this.selectedCategoryFilter;
      const matchLevel = this.selectedLevelFilter === 'Todos' || course.level === this.selectedLevelFilter;
      const matchSearch = !this.searchQuery || (course.title && course.title.toLowerCase().includes(this.searchQuery.toLowerCase()));
      if (this.userRole() === 'adm') {
        return matchCategory && matchLevel && matchSearch && course.criadorEmail === this.userEmail();
      } else {
        return matchCategory && matchLevel && matchSearch && this.cursosCompradosIds.includes(course._id);
      }
    });
  }

  get filteredExploreCourses() {
    return this.courses.filter(course => {
      const matchCategory = this.selectedExploreCategory === 'Todas' || course.category === this.selectedExploreCategory;
      const matchLevel = this.selectedExploreLevel === 'Todos' || course.level === this.selectedExploreLevel;
      const matchSearch = !this.searchExploreQuery || (course.title && course.title.toLowerCase().includes(this.searchExploreQuery.toLowerCase()));
      
      let matchPrice = true;
      if (this.selectedExplorePrice !== 'Todos' && course.price) {
        const precoLimpo = parseFloat(course.price.replace(/\./g, '').replace(',', '.'));
        if (this.selectedExplorePrice === 'Abaixo de 100') matchPrice = precoLimpo < 100;
        else if (this.selectedExplorePrice === '100-300') matchPrice = precoLimpo >= 100 && precoLimpo <= 300;
        else if (this.selectedExplorePrice === '500-800') matchPrice = precoLimpo >= 500 && precoLimpo <= 800;
        else if (this.selectedExplorePrice === '1000-2000') matchPrice = precoLimpo >= 1000 && precoLimpo <= 2000;
        else if (this.selectedExplorePrice === 'Acima de 2000') matchPrice = precoLimpo > 2000;
      }
      return matchCategory && matchLevel && matchSearch && matchPrice;
    });
  }

  carregarCursosDoBanco() {
    this.http.get('https://coursify-web-5.onrender.com/cursos').subscribe({
      next: (res: any) => { if (res.sucesso) this.courses = res.cursos; },
      error: (erro) => console.error('Erro ao carregar cursos:', erro)
    });
  }

  carregarEstatisticas() {
    this.http.get('https://coursify-web-5.onrender.com/estatisticas').subscribe({
      next: (res: any) => { if (res.sucesso) this.totalAlunos = res.totalAlunos; },
      error: (erro) => console.error('Erro ao carregar estatísticas:', erro)
    });
  }

  verDetalhes(course: any, event?: Event) {
    if (event) event.preventDefault();
    this.selectedCourse = course;
    this.activeDetailsTab = 'sobre';
    this.currentDashboardView.set('detalhes-curso');
  }

  onCreateCourse(event: Event) {
    event.preventDefault();
    if (this.newCourse.title && this.newCourse.subtitle) {
      const cursoParaSalvar = { ...this.newCourse, criadorEmail: this.userEmail() };
      this.http.post('https://coursify-web-5.onrender.com/cursos', cursoParaSalvar).subscribe({
        next: (res: any) => {
          if (res.sucesso) {
            alert('✅ Curso criado no banco de dados!');
            this.carregarCursosDoBanco(); 
            this.newCourse = { title: '', subtitle: '', professor: '', price: '', level: '', category: '', description: '', imageUrl: null, videoUrl: '', topics: ['', '', '', '', ''], duration: '', hasCertificate: 'sim', prerequisites: '', targetAudience: '' };            
            this.currentDashboardView.set('meus-cursos');
          }
        },
        error: (erro) => alert('❌ Erro ao salvar o curso no banco.')
      });
    }
  }

  limparFormulario(event: Event) {
    event.preventDefault();
    if(confirm('Tem certeza que deseja apagar todos os dados digitados?')) {
      this.newCourse = { 
        title: '', subtitle: '', professor: '', price: '', level: '', category: '', description: '', 
        imageUrl: null, videoUrl: '', topics: ['', '', '', '', ''], 
        duration: '', hasCertificate: 'sim', prerequisites: '', targetAudience: ''
      };
    }
  }

  limparFormularioEdit(event: Event) {
    event.preventDefault();
    if(confirm('Tem certeza que deseja apagar o que escreveu no formulário?')) {
      this.courseToEdit.title = ''; this.courseToEdit.subtitle = ''; this.courseToEdit.professor = '';
      this.courseToEdit.price = ''; this.courseToEdit.level = ''; this.courseToEdit.category = '';
      this.courseToEdit.description = ''; this.courseToEdit.imageUrl = null;
      this.courseToEdit.topics = ['', '', '', '', '']; this.courseToEdit.duration = '';
    }
  }

  deleteCourse(course: any, event?: Event) {
    if (event) event.stopPropagation();
    if(confirm(`Tem certeza que deseja apagar o curso "${course.title}"?`)) {
      this.http.delete(`https://coursify-web-5.onrender.com/cursos/${course._id}`).subscribe({
        next: (res: any) => {
          if (res.sucesso) {
            alert('🗑️ Curso apagado com sucesso!');
            this.carregarCursosDoBanco();
            this.currentDashboardView.set('meus-cursos');
          }
        },
        error: (erro) => alert('❌ Erro ao apagar o curso.')
      });
    }
  }

  saveData() {
    if (this.userRole()) {
      localStorage.setItem('coursify_role', this.userRole()!);
      localStorage.setItem('coursify_name', this.userName()); 
      localStorage.setItem('coursify_email', this.userEmail()); 
    } else {
      localStorage.removeItem('coursify_role');
      localStorage.removeItem('coursify_name'); 
      localStorage.removeItem('coursify_email'); 
    }
  }

  loadData() {
    const savedRole = localStorage.getItem('coursify_role');
    const savedName = localStorage.getItem('coursify_name'); 
    const savedEmail = localStorage.getItem('coursify_email'); 
    if (savedRole) {
      this.userRole.set(savedRole as 'adm' | 'aluno');
      if (savedName) this.userName.set(savedName); 
      if (savedEmail) this.userEmail.set(savedEmail); 
      this.currentView.set('dashboard');
      this.currentDashboardView.set('dashboard');
      if (savedEmail) {
        this.carregarPerfilDoBanco(savedEmail);
      }
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onLogin(role: 'adm' | 'aluno', event: Event) {
    event.preventDefault();
    if (!this.isValidEmail(this.loginData.email)) {
      alert('⚠️ Por favor, insira um e-mail válido (ex: seu-nome@exemplo.com).');
      return;
    }
    if (role === 'aluno' && (!this.loginData.email || !this.loginData.password)) {
      alert('⚠️ Por favor, preencha o seu Email e Senha para entrar.');
      return;
    }
    if (role === 'adm' && (!this.loginData.email || !this.loginData.password || !this.loginData.idProf)) {
      alert('⚠️ Por favor, preencha todos os campos obrigatórios (Email, Senha e ID).');
      return;
    }

    this.http.post('https://coursify-web-5.onrender.com/login', {
      email: this.loginData.email, senha: this.loginData.password, idProfessor: this.loginData.idProf
    }).subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          this.userName.set(res.nome || ''); 
          this.userEmail.set(res.email || this.loginData.email); 
          this.userRole.set(role);
          this.currentView.set('dashboard');
          this.currentDashboardView.set('dashboard');
          this.loginData = { email: '', password: '', idProf: '' };
          this.saveData();
          alert(`✅ Bem-vindo, ${res.nome}!`);
          this.carregarPerfilDoBanco(res.email || this.userEmail());
        } else {
          alert('❌ Email ou senha inválidos');
        }
      },
      error: (erro) => {
        console.error(erro);
        alert('❌ Erro de conexão! Verifique se o seu servidor Node.js (backend) está rodando.');
      }
    });
  }

  onCadastro(event: Event) {
    event.preventDefault();
    if (!this.isValidEmail(this.cadastroData.email)) {
      alert('⚠️ O e-mail informado não é válido. Verifique o formato (ex: nome@dominio.com).');
      return;
    }
    if (!this.cadastroData.nome || !this.cadastroData.email || !this.cadastroData.senha) {
      alert('⚠️ Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const ehProfessor = this.previousView() === 'login-professor';
    const tipoUsuario = ehProfessor ? 'adm' : 'aluno';

    if (ehProfessor && !this.cadastroData.idProf) {
      alert('⚠️ O ID de Professor é obrigatório!');
      return;
    }

    const payload = {
      nome: this.cadastroData.nome, email: this.cadastroData.email, senha: this.cadastroData.senha,
      tipo: tipoUsuario, idProfessor: ehProfessor ? this.cadastroData.idProf : undefined
    };

    this.http.post('https://coursify-web-5.onrender.com/cadastro', payload).subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          alert('🎉 Conta criada com sucesso! Você já pode logar.');
          this.cadastroData = { nome: '', email: '', senha: '', idProf: '' };
          this.navigateTo(ehProfessor ? 'login-professor' : 'login');
        } else {
          alert('❌ Erro ao cadastrar: ' + res.mensagem);
        }
      },
      error: (erro) => {
        alert('❌ Erro de conexão com o servidor.');
      }
    });
  }

  logout(event?: Event) {
    if (event) event.preventDefault();
    this.userRole.set(null);
    this.userName.set(''); 
    this.userEmail.set(''); 
    this.userTelefone.set(''); 
    this.currentView.set('role');
    this.saveData(); 
  }

  trackByIndex(index: number, obj: any): any { return index; }
  addTopic() { this.newCourse.topics.push(''); }
  removeTopic(index: number) { if (this.newCourse.topics.length > 1) this.newCourse.topics.splice(index, 1); }

  navigateTo(view: string, event?: Event) {
    if (event) event.preventDefault();
    this.loginData = { email: '', password: '', idProf: '' }; 
    this.cadastroData = { nome: '', email: '', senha: '', idProf: '' }; 
    this.recoverEmail = '';
    this.previousView.set(this.currentView());
    this.currentView.set(view);
  }

  setDashboardView(id: string, event: Event) {
    event.preventDefault();
    this.currentDashboardView.set(id);
  }

  togglePassword() { this.showPassword.set(!this.showPassword()); }

  onRecoverPassword(event: Event) {
    event.preventDefault();
    if (!this.recoverEmail) {
      alert('⚠️ Por favor, insira o seu email para recuperar a senha.');
      return;
    }
    alert(`Instruções de recuperação enviadas com sucesso para: ${this.recoverEmail}`);
    this.recoverEmail = ''; 
    this.navigateTo(this.previousView());
  }

  simulateLogin(provider: string, role: 'adm' | 'aluno') { 
    this.simulatingProvider.set(provider); this.simulatedRole.set(role);
  }

  confirmProviderLogin() { 
    const role = this.simulatedRole();
    this.simulatingProvider.set(null); 
    if (role) {
      this.userRole.set(role);
      this.userName.set(role === 'adm' ? 'Professor Teste' : 'Aluno Teste'); 
      this.currentView.set('dashboard');
      this.currentDashboardView.set('dashboard');
      this.saveData(); 
    }
  }

  cancelProviderLogin() { this.simulatingProvider.set(null); }

  onFileSelected(event: any, course: any) {
    const file = event.target.files[0];
    if (file) { const reader = new FileReader(); reader.onload = (e: any) => { course.imageUrl = e.target.result; }; reader.readAsDataURL(file); }
  }

  removeImage(course: any, event: Event) { event.stopPropagation(); course.imageUrl = null; }

  onFileSelectedCreate(event: any) {
    const file = event.target.files[0];
    if (file) {
      const limiteMaximo = 50 * 1024 * 1024; 
      if (file.size > limiteMaximo) {
        alert('⚠️ Arquivo muito pesado! Escolha uma imagem de no máximo 50MB.');
        event.target.value = ''; 
        return;
      }
      const reader = new FileReader(); 
      reader.onload = (e: any) => { this.newCourse.imageUrl = e.target.result; }; 
      reader.readAsDataURL(file); 
    }
  }

  editCourse(course: any, event: Event) {
    event.stopPropagation();
    this.editingCourseIndex = this.courses.findIndex(c => c._id === course._id);
    this.courseToEdit = JSON.parse(JSON.stringify(course));
    if (!this.courseToEdit.price) this.courseToEdit.price = '199,00';
    if (!this.courseToEdit.level) this.courseToEdit.level = 'Iniciante';
    if (!this.courseToEdit.category) this.courseToEdit.category = 'Programacao';
    if (!this.courseToEdit.description) this.courseToEdit.description = 'Descrição do curso.';
    if (!this.courseToEdit.topics || this.courseToEdit.topics.length === 0) this.courseToEdit.topics = ['Introdução', 'Fundamentos', 'Projeto', 'Conclusão'];
    if (!this.courseToEdit.duration) this.courseToEdit.duration = '20 Horas';
    if (!this.courseToEdit.hasCertificate) this.courseToEdit.hasCertificate = 'sim';
    this.currentDashboardView.set('editar-curso');
  }

  addTopicEdit() { this.courseToEdit.topics.push(''); }
  removeTopicEdit(index: number) { if (this.courseToEdit.topics.length > 1) this.courseToEdit.topics.splice(index, 1); }

  onFileSelectedEdit(event: any) {
    const file = event.target.files[0];
    if (file) { const reader = new FileReader(); reader.onload = (e: any) => { this.courseToEdit.imageUrl = e.target.result; }; reader.readAsDataURL(file); }
  }

  onUpdateCourse(event: Event) {
    event.preventDefault();
    if (this.editingCourseIndex !== null && this.courseToEdit) {
      this.http.put(`https://coursify-web-5.onrender.com/cursos/${this.courseToEdit._id}`, this.courseToEdit).subscribe({
        next: (res: any) => {
          if (res.sucesso) {
            alert('✅ Curso actualizado com sucesso no banco de dados!');
            this.carregarCursosDoBanco(); 
            this.courseToEdit = null;
            this.editingCourseIndex = null;
            this.currentDashboardView.set('meus-cursos');
          } else {
            alert('❌ Erro ao atualizar curso: ' + res.mensagem);
          }
        },
        error: (erro) => {
          console.error(erro);
          alert('❌ Erro de conexão ao tentar atualizar o curso.');
        }
      });
    }
  }

  cancelEdit(event: Event) {
    event.preventDefault();
    this.courseToEdit = null;
    this.editingCourseIndex = null;
    this.currentDashboardView.set('meus-cursos');
  }

  permitirApenasNumeros(event: KeyboardEvent) {
    if (['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }

  formatarPreco(valor: string) {
    if (!valor) { this.newCourse.price = ''; return; }
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length === 0) { this.newCourse.price = ''; return; }
    const valorNumerico = parseInt(apenasNumeros, 10) / 100;
    this.newCourse.price = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatarPrecoEdit(valor: string) {
    if (!valor) { this.courseToEdit.price = ''; return; }
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length === 0) { this.courseToEdit.price = ''; return; }
    const valorNumerico = parseInt(apenasNumeros, 10) / 100;
    this.courseToEdit.price = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  assistirAula(course: any, event: Event) {
    event.stopPropagation();
    if (!course.videoUrl) {
      alert('Ops! O professor ainda não adicionou o link do vídeo para este curso.');
      return;
    }
    this.cursoAssistindo = course;
    this.videoFinalizado = false; 
    this.currentDashboardView.set('assistir-aula');
  }

  marcarVideoComoConcluido() {
    this.videoFinalizado = true;
  }

  emitirCertificado() { 
    const email = this.userEmail();
    if (!email) {
      alert('Erro: Você precisa estar logado para emitir o certificado.');
      return;
      
    }
    

    // 1. Checa o limite máximo de certificados
    if (this.meusCertificados.length >= 2) {
      alert('Aviso: Você já atingiu o limite de 2 certificados salvos na nuvem. Apague um antigo na aba "Certificados" para poder gerar este novo.');
      this.currentDashboardView.set('certificados');
      return;
    }

    // 2. Checa se o aluno já tem o certificado desse curso específico
    const jaTem = this.meusCertificados.find(c => c.titulo === this.cursoAssistindo.title);
    if (jaTem) {
      alert('Você já resgatou o certificado deste curso! Acesse a aba Certificados.');
      this.currentDashboardView.set('certificados');
      return;
    }

    // 3. Monta o novo certificado
    const novoCertificado = {
      titulo: this.cursoAssistindo.title,
      professor: this.cursoAssistindo.professor,
      cargaHoraria: this.cursoAssistindo.duration || '20 Horas',
      data: new Date().toLocaleDateString('pt-BR'),
      category: this.cursoAssistindo.category || 'Curso Livre',
      codigo: 'CRF-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000) + '-' + Math.floor(Math.random() * 1000)
    };

    // 4. Manda para o servidor salvar
    this.http.post('https://coursify-web-5.onrender.com/usuarios/certificado', { email, certificado: novoCertificado }).subscribe({
      next: (res: any) => {
        if (res.sucesso) {
          alert(`Parabéns! O certificado do curso ${this.cursoAssistindo.title} foi gerado com sucesso!`);
          
          // Adiciona na tela e muda a visão para a aba de certificados na mesma hora
          this.meusCertificados.push(novoCertificado); 
          this.currentDashboardView.set('certificados'); 
        } else {
          alert('Erro no banco de dados: ' + res.mensagem);
        }
      },
      error: (erro) => {
        console.error('Erro HTTP:', erro);
        alert('❌ Falha na comunicação ao tentar salvar! Verifique se a rota "/usuarios/certificado" está no seu server.js e se o servidor foi reiniciado.');
      }
    });
  }

// Verifica se o aluno tem o certificado para cravar 100%
  obterProgresso(curso: any): number {
    const jaConcluiu = this.meusCertificados.some(c => c.titulo === curso.title);
    return jaConcluiu ? 100 : 0;
  }
  
  extrairIdYouTube(url: string): string {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }

  onVideoStateChange(event: any) {
    if (event.data === 0) {
      this.marcarVideoComoConcluido();
    }
  }

  compartilharCertificado(cert: any) {
    const texto = `Olha só! Acabei de concluir o curso ${cert.titulo} na plataforma Coursify Academy com carga horária de ${cert.cargaHoraria}! 🚀🎓`;
    if (navigator.share) {
      navigator.share({
        title: 'Meu Novo Certificado!',
        text: texto,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(texto);
      alert('Texto de compartilhamento copiado! Cole no seu LinkedIn ou WhatsApp.');
    }
  }

  apagarCertificado(cert: any) {
    if (confirm(`Tem certeza que deseja apagar o certificado de ${cert.titulo}?\n\nVocê precisará assistir a aula novamente se quiser gerá-lo de novo.`)) {
      const email = this.userEmail();
      this.http.post('https://coursify-web-5.onrender.com/usuarios/remover-certificado', { email, codigo: cert.codigo }).subscribe({
        next: (res: any) => {
          if (res.sucesso) {
            this.meusCertificados = this.meusCertificados.filter(c => c.codigo !== cert.codigo);
          }
        },
        error: () => alert('Erro de comunicação com o servidor ao apagar.')
      });
    }
  }

  baixarCertificadoPDF(cert: any) {
    const element = document.getElementById('certificado-pdf-' + cert.codigo);
    if (element) {
      html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#091024' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgRatio = canvas.width / canvas.height;
        let finalWidth = pdfWidth;
        let finalHeight = pdfWidth / imgRatio;
        
        if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * imgRatio;
        }
        
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        pdf.save(`Certificado_${cert.titulo.replace(/\s+/g, '_')}.pdf`);
      });
    
    }
  }
}

 