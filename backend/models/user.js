const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    tipo: String,
    idProfessor: String,
    telefone: String,
    cursosComprados: { type: [String], default: [] },
    certificados: { type: Array, default: [] } // <--- ADICIONE ESTA LINHA AQUI
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);