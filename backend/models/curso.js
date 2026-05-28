const mongoose = require('mongoose');

const CursoSchema = new mongoose.Schema({
    title: String,
    subtitle: String,
    professor: String,
    videoUrl: String,
    price: String,
    level: String,
    category: String,
    description: String,
    imageUrl: String,
    topics: [String], 
    duration: String,
    hasCertificate: String,
    criadorEmail: String,
    avaliacoes: [{
        nome: String,
        texto: String,
        data: String
    }],
    
    students: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    icon: { type: String, default: 'fa-solid fa-laptop-code' },
    color: { type: String, default: 'linear-gradient(135deg, #1e3c72, #2a5298)' },
    iconColor: { type: String, default: '#ffffff' }
}, { collection: 'cursos' }); 

module.exports = mongoose.model('Curso', CursoSchema);