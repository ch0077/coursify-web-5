const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt'); // <-- 1. IMPORTADO O BCRYPT PARA AS CRIPTOGRAFIAS
const {MongoClient} = require('mongodb');

// Chama os dois arquivos que explicam como os dados funcionam
const User = require('./models/user');
const Curso = require('./models/curso'); 
const Mensagem = require('./models/mensagem');

const app = express();
app.use(cors({
    origin: 'https://enchanting-frangipane-0080cd.netlify.app', // Link que o Netlify te deu
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ------------------------------------------
// 1. CONEXÃO COM O BANCO DE DADOS
// ------------------------------------------
mongoose.connect('mongodb+srv://carloscamisa88_db_user:8bVnIN5nVkSEkURt@coursify.tyjliyj.mongodb.net/usuarios?appName=Coursify')
  .then(() => console.log('✅ MongoDB conectado no banco Coursify!'))
  .catch(err => console.log('❌ Erro no Mongo:', err));

// ------------------------------------------
// 2. ROTAS DOS USUÁRIOS (LOGIN E CADASTRO)
// ------------------------------------------
app.post('/login', async (req, res) => {
    const { email, senha, idProfessor } = req.body; 
    
    try {
        const usuarioEncontrado = await User.findOne({ email: email });
        
        if (!usuarioEncontrado) {
            return res.json({ sucesso: false, message: 'Email ou senha incorretos!' });
        }

        let loginAutorizado = false;

        if (usuarioEncontrado.tipo === 'adm') {
            if (!idProfessor) {
                return res.json({ sucesso: false, mensagem: 'ID do Professor é obrigatório para ADM!' });
            }

            const idValido = await bcrypt.compare(idProfessor, usuarioEncontrado.idProfessor);
            const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);

            if (idValido && senhaValida) {
                loginAutorizado = true;
            }

        } else {
            if (usuarioEncontrado.senha.startsWith('$2b$')) {
                loginAutorizado = await bcrypt.compare(senha, usuarioEncontrado.senha);
            } else {
                loginAutorizado = (senha === usuarioEncontrado.senha);
            }
        }

        if (loginAutorizado) {
            // VOLTOU AO ORIGINAL EXATO: mantendo estritamente o seu retorno padrão
            res.json({ 
                sucesso: true, 
                mensagem: 'Login autorizado', 
                tipo: usuarioEncontrado.tipo, 
                nome: usuarioEncontrado.nome 
            });
        } else {
            res.json({ sucesso: false, mensagem: 'Credenciais inválidas ou incorretas!' });
        }

    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

app.post('/cadastro', async (req, res) => {
    const { nome, email, senha, tipo, idProfessor } = req.body;
    try {
        const existe = await User.findOne({ email: email });
        if (existe) return res.json({ sucesso: false, mensagem: 'Este email já está cadastrado!' });

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // VOLTOU AO ORIGINAL EXATO: Sem propriedades extras inventadas no objeto do cadastro
        const dadosUsuario = { 
            nome, 
            email, 
            senha: senhaCriptografada, 
            tipo: tipo || 'aluno' 
        };

        if (tipo === 'adm') {
            if (!idProfessor) {
                return res.json({ sucesso: false, mensagem: 'O ID de Professor é obrigatório para cadastro administrativo.' });
            }
            dadosUsuario.idProfessor = await bcrypt.hash(idProfessor, 10);
        }

        const novoUsuario = new User(dadosUsuario);
        await novoUsuario.save();
        
        res.json({ sucesso: true, mensagem: 'Cadastro realizado com sucesso!' });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar.' });
    }
});

// >>> ROTA PARA ATUALIZAR O PERFIL (AGORA ATUALIZA O EMAIL TAMBÉM) <<<
app.put('/usuarios/perfil', async (req, res) => {
    try {
        // Recebe o email antigo para buscar, e o novo para salvar
        const { nome, emailAntigo, emailNovo, telefone } = req.body;

        const usuarioAtualizado = await User.findOneAndUpdate(
            { email: emailAntigo }, // 1. Busca pelo email antigo
            { nome: nome, email: emailNovo, telefone: telefone }, // 2. Salva o email novo
            { new: true }
        );

        if (!usuarioAtualizado) {
            return res.json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        }

        res.json({ sucesso: true, mensagem: 'Perfil atualizado com sucesso!' });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar perfil.' });
    }
});
// ADICIONADO APENAS AQUI: ROTA PARA BUSCAR O PERFIL DO BANCO
app.get('/usuarios/perfil/:email', async (req, res) => {
    try {
        const usuario = await User.findOne({ email: req.params.email });
        if (!usuario) {
            return res.json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        }
        res.json({ 
            sucesso: true, 
            usuario: {
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone || '',
                cursosComprados: usuario.cursosComprados || [], // <--- A VÍRGULA SALVADORA AQUI!
                certificados: usuario.certificados || []
            }
        });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar dados.' });
    }
});
// ROTA PARA PROCESSAR A COMPRA DO CURSO
app.post('/usuarios/comprar', async (req, res) => {
    try {
        const { email, cursosIds } = req.body;
        // Adiciona os IDs dos cursos ao array do aluno sem duplicar ($addToSet)
        await User.findOneAndUpdate(
            { email: email },
            { $addToSet: { cursosComprados: { $each: cursosIds } } }
        );
        res.json({ sucesso: true, mensagem: 'Compra finalizada!' });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro na compra.' });
    }
});

// ROTA PARA SALVAR O CERTIFICADO NOVO
app.post('/usuarios/certificado', async (req, res) => {
    try {
        const { email, certificado } = req.body;
        // Salva o novo certificado dentro do array de certificados do usuário
        await User.findOneAndUpdate(
            { email: email },
            { $push: { certificados: certificado } }
        );
        res.json({ sucesso: true, mensagem: 'Certificado salvo!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar certificado.' });
    }
});

// ROTA PARA REMOVER O CERTIFICADO DO ALUNO
app.post('/usuarios/remover-certificado', async (req, res) => {
    try {
        const { email, codigo } = req.body;
        
        // O $pull arranca do array exatamente o certificado que tem este código
        await User.findOneAndUpdate(
            { email: email },
            { $pull: { certificados: { codigo: codigo } } }
        );
        
        res.json({ sucesso: true, mensagem: 'Certificado removido com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover certificado.' });
    }
});
// ROTA PARA BUSCAR TODOS OS ALUNOS (Para o Chat do Professor)
app.get('/usuarios/alunos', async (req, res) => {
    try {
        const alunos = await User.find({ tipo: 'aluno' });
        res.json({ sucesso: true, alunos });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar alunos.' });
    }
});

// ROTA DE ESTATÍSTICAS (DASHBOARD)
// ==========================================
app.get('/estatisticas', async (req, res) => {
    try {
        const totalAlunos = await User.countDocuments({ tipo: 'aluno' });
        res.json({ sucesso: true, totalAlunos: totalAlunos });
    } catch (erro) {
        console.error('Erro ao buscar estatísticas:', erro);
        res.status(500).json({ sucesso: false, message: 'Erro ao buscar estatísticas.' });
    }
});

// ------------------------------------------
// 3. ROTAS DOS CURSOS
// ------------------------------------------
app.get('/cursos', async (req, res) => {
    try {
        const todosCursos = await Curso.find(); 
        res.json({ sucesso: true, cursos: todosCursos });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar cursos.' });
    }
});

app.post('/cursos', async (req, res) => {
    try {
        const novoCurso = new Curso(req.body); 
        await novoCurso.save(); 
        res.json({ sucesso: true, mensagem: 'Curso publicado com sucesso!', curso: novoCurso });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar o curso.' });
    }
});

app.delete('/cursos/:id', async (req, res) => {
    try {
        await Curso.findByIdAndDelete(req.params.id);
        res.json({ sucesso: true, mensagem: 'Curso apagado com sucesso!' });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao apagar curso.' });
    }
});

// >>> ADICIONADO AQUI: ROTA PARA ATUALIZAR O CURSO NO MONGODB <<<
app.put('/cursos/:id', async (req, res) => {
    try {
        const cursoAtualizado = await Curso.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cursoAtualizado) {
            return res.json({ sucesso: false, mensagem: 'Curso não encontrado para atualização.' });
        }
        res.json({ sucesso: true, mensagem: 'Curso atualizado com sucesso!', curso: cursoAtualizado });
    } catch (erro) {
        console.error('Erro ao atualizar curso:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar curso.' });
    }
});

// ==========================================
// ROTA DO CHAT (MENSAGENS) -> COLE AQUI!
// ==========================================
app.get('/mensagens/:cursoId/:alunoEmail', async (req, res) => {
    try {
        const { cursoId, alunoEmail } = req.params;
        const historico = await Mensagem.find({ cursoId, alunoEmail }).sort({ timestamp: 1 });
        res.json({ sucesso: true, mensagens: historico });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar chat.' });
    }
});

app.post('/mensagens', async (req, res) => {
    try {
        const novaMensagem = new Mensagem(req.body);
        await novaMensagem.save();
        res.json({ sucesso: true, mensagem: novaMensagem });
    } catch (erro) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao enviar mensagem.' });
    }
});

// ==========================================
// ROTA PARA ADICIONAR UMA AVALIAÇÃO NO CURSO
// ==========================================
app.post('/cursos/:id/avaliar', async (req, res) => {
    try {
        const { nome, texto, data } = req.body;
        
        // Localiza o curso pelo ID e "empurra" ($push) a nova avaliação para o array
        const cursoAtualizado = await Curso.findByIdAndUpdate(
            req.params.id,
            { $push: { avaliacoes: { nome, texto, data } } },
            { new: true } // Retorna o documento já atualizado
        );

        if (!cursoAtualizado) {
            return res.json({ sucesso: false, mensagem: 'Curso não encontrado.' });
        }

        res.json({ sucesso: true, curso: cursoAtualizado });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar avaliação.' });
    }
});


// ------------------------------------------
// 4. LIGAR O SERVIDOR
// ------------------------------------------
app.listen(3000, () => {
    console.log('🚀 Backend Node.js rodando na porta 3000');
});