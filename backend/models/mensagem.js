const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    cursoId: String,
    cursoTitle: String,
    professorEmail: String,
    alunoEmail: String,
    alunoNome: String,
    sender: { type: String, enum: ['professor', 'aluno'] }, // Quem enviou?
    text: String,
    timestamp: { type: Date, default: Date.now }
}, { collection: 'mensagens' });

module.exports = mongoose.model('Mensagem', MensagemSchema);