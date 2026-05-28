const bcrypt = require('bcrypt');
async function gerar() {
  console.log("Senha Hash:", await bcrypt.hash("sua_senha_aqui", 10));
  console.log("ID Hash:", await bcrypt.hash("SENAC-PROF-99", 10));
}
gerar();