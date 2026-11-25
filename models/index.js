const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Model Perfil (3 perfis de acesso)
const Perfil = sequelize.define('Perfil', {
  nome: { type: DataTypes.STRING, allowNull: false, unique: true }
});

// 2. Model Usuario
const Usuario = sequelize.define('Usuario', {
  nome: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false }
});

// 3. Model Categoria
const Categoria = sequelize.define('Categoria', {
  nome: { type: DataTypes.STRING, allowNull: false }
});

// 4. Model Evento
const Evento = sequelize.define('Evento', {
  titulo: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.TEXT },
  data: { type: DataTypes.STRING, allowNull: false }
});

// 5. Model Inscricao (Tabela Pivô do N:N)
const Inscricao = sequelize.define('Inscricao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  status: { type: DataTypes.STRING, defaultValue: 'Confirmada' }
});

// === RELACIONAMENTOS ===
// 1:N -> Um Perfil tem vários Usuários
Perfil.hasMany(Usuario, { foreignKey: 'perfilId' });
Usuario.belongsTo(Perfil, { foreignKey: 'perfilId' });

// 1:N -> Uma Categoria tem vários Eventos
Categoria.hasMany(Evento, { foreignKey: 'categoriaId' });
Evento.belongsTo(Categoria, { foreignKey: 'categoriaId' });

// 1:N -> Um Usuário (Organizador) cria vários Eventos
Usuario.hasMany(Evento, { foreignKey: 'organizadorId', as: 'eventosCriados' });
Evento.belongsTo(Usuario, { foreignKey: 'organizadorId', as: 'organizador' });

// N:N -> Muitos Usuários se inscrevem em muitos Eventos
Usuario.belongsToMany(Evento, { through: Inscricao, foreignKey: 'usuarioId', as: 'eventosInscritos' });
Evento.belongsToMany(Usuario, { through: Inscricao, foreignKey: 'eventoId', as: 'participantes' });

// Associações diretas na tabela Inscricao para facilitar o CRUD
Inscricao.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Inscricao.belongsTo(Evento, { foreignKey: 'eventoId' });

async function inicializarBanco() {
  await sequelize.sync();

  const [adminPerfil] = await Perfil.findOrCreate({ where: { nome: 'Admin' } });
  const [orgPerfil] = await Perfil.findOrCreate({ where: { nome: 'Organizador' } });
  const [partPerfil] = await Perfil.findOrCreate({ where: { nome: 'Participante' } });

  await Usuario.findOrCreate({
    where: { email: 'admin@teste.com' },
    defaults: { nome: 'Administrador', senha: '123', perfilId: adminPerfil.id }
  });

  await Usuario.findOrCreate({
    where: { email: 'org@teste.com' },
    defaults: { nome: 'João Organizador', senha: '123', perfilId: orgPerfil.id }
  });

  await Usuario.findOrCreate({
    where: { email: 'user@teste.com' },
    defaults: { nome: 'Maria Participante', senha: '123', perfilId: partPerfil.id }
  });

  await Categoria.findOrCreate({ where: { nome: 'Tecnologia' } });
  await Categoria.findOrCreate({ where: { nome: 'Negócios' } });
}

module.exports = {
  sequelize,
  Perfil,
  Usuario,
  Categoria,
  Evento,
  Inscricao,
  inicializarBanco
};
