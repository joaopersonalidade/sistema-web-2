const fs = require('fs');
const path = require('path');

const arquivos = {
  'package.json': JSON.stringify({
    name: 'sistema-eventos-web2',
    version: '1.0.0',
    main: 'app.js',
    scripts: { start: 'node app.js' },
    dependencies: {
      express: '^4.18.2',
      ejs: '^3.1.9',
      sequelize: '^6.35.0',
      sqlite3: '^5.1.7',
      'express-session': '^1.17.3',
      jsonwebtoken: '^9.0.2',
      'swagger-ui-express': '^5.0.0',
      'method-override': '^3.0.0'
    }
  }, null, 2),

  'config/database.js': `const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

module.exports = sequelize;
`,

  'models/index.js': `const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Model Perfil (3 perfis de acesso)
const Perfil = sequelize.define('Perfil', {
  nome: { type: DataTypes.STRING, allowNull: false }
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
`,

  'middlewares/authMvc.js': `function verificarLogado(req, res, next) {
  if (req.session && req.session.usuario) {
    res.locals.usuarioLogado = req.session.usuario;
    return next();
  }
  return res.redirect('/login');
}

function permitirPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    const usuario = req.session.usuario;
    if (usuario && perfisPermitidos.includes(usuario.perfil)) {
      return next();
    }
    return res.status(403).send(\`
      <h1>403 - Acesso Negado</h1>
      <p>Seu perfil (\${usuario ? usuario.perfil : 'Visitante'}) não tem permissão para esta rota.</p>
      <a href="/dashboard">Voltar ao Painel</a>
    \`);
  };
}

module.exports = { verificarLogado, permitirPerfis };
`,

  'middlewares/authApi.js': `const jwt = require('jsonwebtoken');
const JWT_SECRET = 'chave_secreta_trabalho_web2_2026';

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido. Autentique-se em POST /api/login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, usuarioDecodificado) => {
    if (err) {
      return res.status(403).json({ erro: 'Token inválido ou expirado.' });
    }
    req.usuarioApi = usuarioDecodificado;
    next();
  });
}

function permitirPerfisApi(...perfisPermitidos) {
  return (req, res, next) => {
    if (req.usuarioApi && perfisPermitidos.includes(req.usuarioApi.perfil)) {
      return next();
    }
    return res.status(403).json({
      erro: \`Acesso negado. Perfil '\${req.usuarioApi?.perfil}' não autorizado.\`
    });
  };
}

module.exports = { verificarToken, permitirPerfisApi, JWT_SECRET };
`,

  'controllers/authController.js': `const { Usuario, Perfil } = require('../models');

module.exports = {
  telaLogin(req, res) {
    res.render('login', { erro: null });
  },

  async login(req, res) {
    const { email, senha } = req.body;
    const usuario = await Usuario.findOne({ where: { email, senha }, include: Perfil });

    if (!usuario) {
      return res.render('login', { erro: 'E-mail ou senha inválidos!' });
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.Perfil.nome
    };

    return res.redirect('/dashboard');
  },

  logout(req, res) {
    req.session.destroy();
    res.redirect('/login');
  },

  dashboard(req, res) {
    res.render('dashboard', { usuario: req.session.usuario });
  }
};
`,

  'controllers/crudController.js': `const { Perfil, Usuario, Categoria, Evento, Inscricao } = require('../models');

module.exports = {
  // === CATEGORIAS ===
  async listarCategorias(req, res) {
    const categorias = await Categoria.findAll();
    res.render('categorias/index', { categorias });
  },
  async criarCategoria(req, res) {
    await Categoria.create({ nome: req.body.nome });
    res.redirect('/categorias');
  },
  async atualizarCategoria(req, res) {
    await Categoria.update({ nome: req.body.nome }, { where: { id: req.params.id } });
    res.redirect('/categorias');
  },
  async deletarCategoria(req, res) {
    await Categoria.destroy({ where: { id: req.params.id } });
    res.redirect('/categorias');
  },

  // === USUÁRIOS E PERFIS ===
  async listarUsuarios(req, res) {
    const usuarios = await Usuario.findAll({ include: Perfil });
    const perfis = await Perfil.findAll();
    res.render('usuarios/index', { usuarios, perfis });
  },
  async criarUsuario(req, res) {
    const { nome, email, senha, perfilId } = req.body;
    await Usuario.create({ nome, email, senha, perfilId });
    res.redirect('/usuarios');
  },
  async atualizarUsuario(req, res) {
    const { nome, email, perfilId } = req.body;
    await Usuario.update({ nome, email, perfilId }, { where: { id: req.params.id } });
    res.redirect('/usuarios');
  },
  async deletarUsuario(req, res) {
    await Usuario.destroy({ where: { id: req.params.id } });
    res.redirect('/usuarios');
  },
  async criarPerfil(req, res) {
    await Perfil.create({ nome: req.body.nome });
    res.redirect('/usuarios');
  },
  async atualizarPerfil(req, res) {
    await Perfil.update({ nome: req.body.nome }, { where: { id: req.params.id } });
    res.redirect('/usuarios');
  },
  async deletarPerfil(req, res) {
    await Perfil.destroy({ where: { id: req.params.id } });
    res.redirect('/usuarios');
  },

  // === EVENTOS ===
  async listarEventos(req, res) {
    const eventos = await Evento.findAll({
      include: [Categoria, { model: Usuario, as: 'organizador' }]
    });
    const categorias = await Categoria.findAll();
    res.render('eventos/index', { eventos, categorias });
  },
  async criarEvento(req, res) {
    const { titulo, descricao, data, categoriaId } = req.body;
    await Evento.create({
      titulo,
      descricao,
      data,
      categoriaId,
      organizadorId: req.session.usuario.id
    });
    res.redirect('/eventos');
  },
  async atualizarEvento(req, res) {
    const { titulo, descricao, data, categoriaId } = req.body;
    await Evento.update({ titulo, descricao, data, categoriaId }, { where: { id: req.params.id } });
    res.redirect('/eventos');
  },
  async deletarEvento(req, res) {
    await Evento.destroy({ where: { id: req.params.id } });
    res.redirect('/eventos');
  },

  // === INSCRIÇÕES (N:N) ===
  async listarInscricoes(req, res) {
    const inscricoes = await Inscricao.findAll({ include: [Usuario, Evento] });
    const eventos = await Evento.findAll();
    const usuarios = await Usuario.findAll();
    res.render('inscricoes/index', { inscricoes, eventos, usuarios });
  },
  async criarInscricao(req, res) {
    const usuarioId = req.body.usuarioId || req.session.usuario.id;
    const { eventoId, status } = req.body;
    await Inscricao.create({ usuarioId, eventoId, status: status || 'Confirmada' });
    res.redirect('/inscricoes');
  },
  async atualizarInscricao(req, res) {
    await Inscricao.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.redirect('/inscricoes');
  },
  async deletarInscricao(req, res) {
    await Inscricao.destroy({ where: { id: req.params.id } });
    res.redirect('/inscricoes');
  }
};
`,

  'controllers/api/apiController.js': `const jwt = require('jsonwebtoken');
const { Perfil, Usuario, Categoria, Evento, Inscricao } = require('../../models');
const { JWT_SECRET } = require('../../middlewares/authApi');

module.exports = {
  async login(req, res) {
    const { email, senha } = req.body;
    const usuario = await Usuario.findOne({ where: { email, senha }, include: Perfil });

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.Perfil.nome
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    return res.status(200).json({ mensagem: 'Autenticado com sucesso', token, usuario: payload });
  },

  // === PERFIS ===
  async listarPerfis(req, res) {
    res.status(200).json(await Perfil.findAll());
  },
  async criarPerfil(req, res) {
    res.status(201).json(await Perfil.create({ nome: req.body.nome }));
  },
  async atualizarPerfil(req, res) {
    const [ok] = await Perfil.update({ nome: req.body.nome }, { where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Perfil não encontrado' });
    res.status(200).json({ mensagem: 'Perfil atualizado' });
  },
  async deletarPerfil(req, res) {
    const ok = await Perfil.destroy({ where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Perfil não encontrado' });
    res.status(200).json({ mensagem: 'Perfil excluído' });
  },

  // === USUÁRIOS ===
  async listarUsuarios(req, res) {
    res.status(200).json(await Usuario.findAll({ attributes: { exclude: ['senha'] }, include: Perfil }));
  },
  async criarUsuario(req, res) {
    try {
      res.status(201).json(await Usuario.create(req.body));
    } catch (e) {
      res.status(400).json({ erro: e.message });
    }
  },
  async atualizarUsuario(req, res) {
    const [ok] = await Usuario.update(req.body, { where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.status(200).json({ mensagem: 'Usuário atualizado' });
  },
  async deletarUsuario(req, res) {
    const ok = await Usuario.destroy({ where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.status(200).json({ mensagem: 'Usuário excluído' });
  },

  // === CATEGORIAS ===
  async listarCategorias(req, res) {
    res.status(200).json(await Categoria.findAll());
  },
  async criarCategoria(req, res) {
    res.status(201).json(await Categoria.create({ nome: req.body.nome }));
  },
  async atualizarCategoria(req, res) {
    const [ok] = await Categoria.update({ nome: req.body.nome }, { where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Categoria não encontrada' });
    res.status(200).json({ mensagem: 'Categoria atualizada' });
  },
  async deletarCategoria(req, res) {
    const ok = await Categoria.destroy({ where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Categoria não encontrada' });
    res.status(200).json({ mensagem: 'Categoria excluída' });
  },

  // === EVENTOS ===
  async listarEventos(req, res) {
    const dados = await Evento.findAll({
      include: [Categoria, { model: Usuario, as: 'organizador', attributes: ['id', 'nome', 'email'] }]
    });
    res.status(200).json(dados);
  },
  async criarEvento(req, res) {
    const novo = await Evento.create({
      ...req.body,
      organizadorId: req.body.organizadorId || req.usuarioApi.id
    });
    res.status(201).json(novo);
  },
  async atualizarEvento(req, res) {
    const [ok] = await Evento.update(req.body, { where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.status(200).json({ mensagem: 'Evento atualizado' });
  },
  async deletarEvento(req, res) {
    const ok = await Evento.destroy({ where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.status(200).json({ mensagem: 'Evento excluído' });
  },

  // === INSCRIÇÕES ===
  async listarInscricoes(req, res) {
    const dados = await Inscricao.findAll({
      include: [{ model: Usuario, attributes: ['id', 'nome', 'email'] }, Evento]
    });
    res.status(200).json(dados);
  },
  async criarInscricao(req, res) {
    const novo = await Inscricao.create({
      usuarioId: req.body.usuarioId || req.usuarioApi.id,
      eventoId: req.body.eventoId,
      status: req.body.status || 'Confirmada'
    });
    res.status(201).json(novo);
  },
  async atualizarInscricao(req, res) {
    const [ok] = await Inscricao.update({ status: req.body.status }, { where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Inscrição não encontrada' });
    res.status(200).json({ mensagem: 'Inscrição atualizada' });
  },
  async deletarInscricao(req, res) {
    const ok = await Inscricao.destroy({ where: { id: req.params.id } });
    if (!ok) return res.status(404).json({ erro: 'Inscrição não encontrada' });
    res.status(200).json({ mensagem: 'Inscrição excluída' });
  }
};
`,

  'routes/webRoutes.js': `const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const crud = require('../controllers/crudController');
const { verificarLogado, permitirPerfis } = require('../middlewares/authMvc');

router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', authController.telaLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/dashboard', verificarLogado, authController.dashboard);

// Categorias (Somente Admin)
router.get('/categorias', verificarLogado, permitirPerfis('Admin'), crud.listarCategorias);
router.post('/categorias', verificarLogado, permitirPerfis('Admin'), crud.criarCategoria);
router.put('/categorias/:id', verificarLogado, permitirPerfis('Admin'), crud.atualizarCategoria);
router.delete('/categorias/:id', verificarLogado, permitirPerfis('Admin'), crud.deletarCategoria);

// Usuários e Perfis (Somente Admin)
router.get('/usuarios', verificarLogado, permitirPerfis('Admin'), crud.listarUsuarios);
router.post('/usuarios', verificarLogado, permitirPerfis('Admin'), crud.criarUsuario);
router.put('/usuarios/:id', verificarLogado, permitirPerfis('Admin'), crud.atualizarUsuario);
router.delete('/usuarios/:id', verificarLogado, permitirPerfis('Admin'), crud.deletarUsuario);

router.post('/perfis', verificarLogado, permitirPerfis('Admin'), crud.criarPerfil);
router.put('/perfis/:id', verificarLogado, permitirPerfis('Admin'), crud.atualizarPerfil);
router.delete('/perfis/:id', verificarLogado, permitirPerfis('Admin'), crud.deletarPerfil);

// Eventos (Todos veem; Admin e Organizador criam/editam/excluem)
router.get('/eventos', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante'), crud.listarEventos);
router.post('/eventos', verificarLogado, permitirPerfis('Admin', 'Organizador'), crud.criarEvento);
router.put('/eventos/:id', verificarLogado, permitirPerfis('Admin', 'Organizador'), crud.atualizarEvento);
router.delete('/eventos/:id', verificarLogado, permitirPerfis('Admin', 'Organizador'), crud.deletarEvento);

// Inscrições (Todos logados)
router.get('/inscricoes', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante'), crud.listarInscricoes);
router.post('/inscricoes', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante'), crud.criarInscricao);
router.put('/inscricoes/:id', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante'), crud.atualizarInscricao);
router.delete('/inscricoes/:id', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante'), crud.deletarInscricao);

module.exports = router;
`,

  'routes/api/apiRoutes.js': `const express = require('express');
const router = express.Router();
const api = require('../../controllers/api/apiController');
const { verificarToken, permitirPerfisApi } = require('../../middlewares/authApi');

router.post('/login', api.login);

router.get('/perfis', verificarToken, permitirPerfisApi('Admin'), api.listarPerfis);
router.post('/perfis', verificarToken, permitirPerfisApi('Admin'), api.criarPerfil);
router.put('/perfis/:id', verificarToken, permitirPerfisApi('Admin'), api.atualizarPerfil);
router.delete('/perfis/:id', verificarToken, permitirPerfisApi('Admin'), api.deletarPerfil);

router.get('/usuarios', verificarToken, permitirPerfisApi('Admin'), api.listarUsuarios);
router.post('/usuarios', verificarToken, permitirPerfisApi('Admin'), api.criarUsuario);
router.put('/usuarios/:id', verificarToken, permitirPerfisApi('Admin'), api.atualizarUsuario);
router.delete('/usuarios/:id', verificarToken, permitirPerfisApi('Admin'), api.deletarUsuario);

router.get('/categorias', verificarToken, api.listarCategorias);
router.post('/categorias', verificarToken, permitirPerfisApi('Admin'), api.criarCategoria);
router.put('/categorias/:id', verificarToken, permitirPerfisApi('Admin'), api.atualizarCategoria);
router.delete('/categorias/:id', verificarToken, permitirPerfisApi('Admin'), api.deletarCategoria);

router.get('/eventos', verificarToken, api.listarEventos);
router.post('/eventos', verificarToken, permitirPerfisApi('Admin', 'Organizador'), api.criarEvento);
router.put('/eventos/:id', verificarToken, permitirPerfisApi('Admin', 'Organizador'), api.atualizarEvento);
router.delete('/eventos/:id', verificarToken, permitirPerfisApi('Admin', 'Organizador'), api.deletarEvento);

router.get('/inscricoes', verificarToken, api.listarInscricoes);
router.post('/inscricoes', verificarToken, api.criarInscricao);
router.put('/inscricoes/:id', verificarToken, api.atualizarInscricao);
router.delete('/inscricoes/:id', verificarToken, api.deletarInscricao);

module.exports = router;
`,

  'config/swagger.js': `const crudPaths = (tag, recurso, exemploBody, permissaoEscrita) => ({
  [\`/api/\${recurso}\`]: {
    get: {
      tags: [tag],
      summary: \`Listar todos (\${recurso})\`,
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Sucesso' }, 401: { description: 'Token ausente' } }
    },
    post: {
      tags: [tag],
      summary: \`Criar (\${recurso}) - Permissão: \${permissaoEscrita}\`,
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', example: exemploBody } } } },
      responses: { 201: { description: 'Criado' }, 401: { description: 'Token ausente' }, 403: { description: 'Sem permissão' } }
    }
  },
  [\`/api/\${recurso}/{id}\`]: {
    put: {
      tags: [tag],
      summary: \`Atualizar (\${recurso}) - Permissão: \${permissaoEscrita}\`,
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', example: exemploBody } } } },
      responses: { 200: { description: 'Atualizado' }, 403: { description: 'Sem permissão' }, 404: { description: 'Não encontrado' } }
    },
    delete: {
      tags: [tag],
      summary: \`Excluir (\${recurso}) - Permissão: \${permissaoEscrita}\`,
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { 200: { description: 'Excluído' }, 403: { description: 'Sem permissão' }, 404: { description: 'Não encontrado' } }
    }
  }
});

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'API REST - Sistema de Eventos (Web 2 - 2026)',
    version: '1.0.0',
    description: 'Entrega 2: API RESTful com autenticação JWT e CRUD completo.'
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
  },
  paths: {
    '/api/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Login e geração de Token JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', example: { email: 'admin@teste.com', senha: '123' } } } }
        },
        responses: { 200: { description: 'Token JWT gerado' }, 401: { description: 'Credenciais inválidas' } }
      }
    },
    ...crudPaths('Perfis', 'perfis', { nome: 'Convidado' }, 'Admin'),
    ...crudPaths('Usuarios', 'usuarios', { nome: 'Carlos', email: 'carlos@teste.com', senha: '123', perfilId: 3 }, 'Admin'),
    ...crudPaths('Categorias', 'categorias', { nome: 'Design' }, 'Admin'),
    ...crudPaths('Eventos', 'eventos', { titulo: 'Workshop NodeJS', descricao: 'Prática REST', data: '2026-10-01', categoriaId: 1 }, 'Admin, Organizador'),
    ...crudPaths('Inscricoes (N:N)', 'inscricoes', { usuarioId: 3, eventoId: 1, status: 'Confirmada' }, 'Todos autenticados')
  }
};
`,

  'views/login.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Login - Sistema de Eventos</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <main style="max-width: 450px; margin: 4rem auto;">
    <h2>Acesso ao Sistema</h2>
    <% if (erro) { %><p style="color: red;"><%= erro %></p><% } %>
    <form action="/login" method="POST">
      <label>E-mail <input type="email" name="email" required value="admin@teste.com"></label>
      <label>Senha <input type="password" name="senha" required value="123"></label>
      <button type="submit">Entrar</button>
    </form>
    <small>
      <strong>Contas de Teste (senha: 123):</strong><br>
      Admin: admin@teste.com<br>
      Organizador: org@teste.com<br>
      Participante: user@teste.com
    </small>
  </main>
</body>
</html>
`,

  'views/dashboard.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Painel</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <nav>
    <ul><li><strong>Sistema de Eventos (MVC)</strong></li></ul>
    <ul>
      <li><%= usuario.nome %> (<%= usuario.perfil %>)</li>
      <li><a href="/logout">Sair</a></li>
    </ul>
  </nav>
  <h3>Menu de Navegação</h3>
  <ul>
    <li><a href="/eventos">Eventos (Todos os perfis)</a></li>
    <li><a href="/inscricoes">Inscrições N:N (Todos os perfis)</a></li>
    <li><a href="/categorias">Categorias (Somente Admin)</a></li>
    <li><a href="/usuarios">Usuários e Perfis (Somente Admin)</a></li>
    <li><a href="/api-docs" target="_blank">Documentação API REST (Swagger)</a></li>
  </ul>
</body>
</html>
`,

  'views/categorias/index.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Categorias</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <p><a href="/dashboard">← Voltar ao Painel</a></p>
  <h2>Gerenciar Categorias</h2>
  <form action="/categorias" method="POST" role="group">
    <input type="text" name="nome" placeholder="Nome da nova categoria" required>
    <button type="submit">Criar</button>
  </form>
  <table>
    <thead><tr><th>ID</th><th>Nome</th><th>Ações</th></tr></thead>
    <tbody>
      <% categorias.forEach(cat => { %>
        <tr>
          <td><%= cat.id %></td>
          <td>
            <form action="/categorias/<%= cat.id %>?_method=PUT" method="POST" role="group">
              <input type="text" name="nome" value="<%= cat.nome %>" required>
              <button type="submit">Salvar</button>
            </form>
          </td>
          <td>
            <form action="/categorias/<%= cat.id %>?_method=DELETE" method="POST">
              <button type="submit" class="secondary">Excluir</button>
            </form>
          </td>
        </tr>
      <% }) %>
    </tbody>
  </table>
</body>
</html>
`,

  'views/usuarios/index.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Usuários e Perfis</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <p><a href="/dashboard">← Voltar ao Painel</a></p>
  <h2>Gerenciar Perfis de Acesso</h2>
  <form action="/perfis" method="POST" role="group">
    <input type="text" name="nome" placeholder="Novo Perfil" required>
    <button type="submit">Adicionar Perfil</button>
  </form>
  <table>
    <thead><tr><th>ID</th><th>Perfil</th><th>Ações</th></tr></thead>
    <tbody>
      <% perfis.forEach(p => { %>
        <tr>
          <td><%= p.id %></td>
          <td>
            <form action="/perfis/<%= p.id %>?_method=PUT" method="POST" role="group">
              <input type="text" name="nome" value="<%= p.nome %>" required>
              <button type="submit">Atualizar</button>
            </form>
          </td>
          <td>
            <form action="/perfis/<%= p.id %>?_method=DELETE" method="POST">
              <button type="submit" class="secondary">Excluir</button>
            </form>
          </td>
        </tr>
      <% }) %>
    </tbody>
  </table>
  <hr>
  <h2>Gerenciar Usuários</h2>
  <form action="/usuarios" method="POST">
    <div class="grid">
      <input type="text" name="nome" placeholder="Nome" required>
      <input type="email" name="email" placeholder="E-mail" required>
      <input type="password" name="senha" placeholder="Senha" required>
      <select name="perfilId" required>
        <% perfis.forEach(p => { %><option value="<%= p.id %>"><%= p.nome %></option><% }) %>
      </select>
    </div>
    <button type="submit">Cadastrar Usuário</button>
  </form>
  <table>
    <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr></thead>
    <tbody>
      <% usuarios.forEach(u => { %>
        <tr>
          <form action="/usuarios/<%= u.id %>?_method=PUT" method="POST">
            <td><input type="text" name="nome" value="<%= u.nome %>"></td>
            <td><input type="email" name="email" value="<%= u.email %>"></td>
            <td>
              <select name="perfilId">
                <% perfis.forEach(p => { %>
                  <option value="<%= p.id %>" <%= u.perfilId === p.id ? 'selected' : '' %>><%= p.nome %></option>
                <% }) %>
              </select>
            </td>
            <td><button type="submit">Salvar</button></td>
          </form>
          <td>
            <form action="/usuarios/<%= u.id %>?_method=DELETE" method="POST">
              <button type="submit" class="secondary">Excluir</button>
            </form>
          </td>
        </tr>
      <% }) %>
    </tbody>
  </table>
</body>
</html>
`,

  'views/eventos/index.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Eventos</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <p><a href="/dashboard">← Voltar ao Painel</a></p>
  <h2>Eventos</h2>
  <% if (usuarioLogado.perfil !== 'Participante') { %>
    <form action="/eventos" method="POST">
      <div class="grid">
        <input type="text" name="titulo" placeholder="Título do Evento" required>
        <input type="date" name="data" required>
        <select name="categoriaId" required>
          <% categorias.forEach(c => { %><option value="<%= c.id %>"><%= c.nome %></option><% }) %>
        </select>
      </div>
      <input type="text" name="descricao" placeholder="Descrição">
      <button type="submit">Criar Evento</button>
    </form>
  <% } %>
  <table>
    <thead><tr><th>Título</th><th>Data</th><th>Categoria</th><th>Organizador</th><th>Ações</th></tr></thead>
    <tbody>
      <% eventos.forEach(ev => { %>
        <tr>
          <% if (usuarioLogado.perfil !== 'Participante') { %>
            <form action="/eventos/<%= ev.id %>?_method=PUT" method="POST">
              <td><input type="text" name="titulo" value="<%= ev.titulo %>"></td>
              <td><input type="date" name="data" value="<%= ev.data %>"></td>
              <td>
                <select name="categoriaId">
                  <% categorias.forEach(c => { %>
                    <option value="<%= c.id %>" <%= ev.categoriaId === c.id ? 'selected' : '' %>><%= c.nome %></option>
                  <% }) %>
                </select>
              </td>
              <td><%= ev.organizador ? ev.organizador.nome : '-' %></td>
              <td><button type="submit">Salvar</button></td>
            </form>
            <td>
              <form action="/eventos/<%= ev.id %>?_method=DELETE" method="POST">
                <button type="submit" class="secondary">Excluir</button>
              </form>
            </td>
          <% } else { %>
            <td><%= ev.titulo %></td>
            <td><%= ev.data %></td>
            <td><%= ev.Categorium ? ev.Categorium.nome : '-' %></td>
            <td><%= ev.organizador ? ev.organizador.nome : '-' %></td>
            <td>Somente leitura</td>
          <% } %>
        </tr>
      <% }) %>
    </tbody>
  </table>
</body>
</html>
`,

  'views/inscricoes/index.ejs': `<!DOCTYPE html>
<html>
<head>
  <title>Inscrições (N:N)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body class="container">
  <p><a href="/dashboard">← Voltar ao Painel</a></p>
  <h2>Inscrições em Eventos (Relacionamento N:N)</h2>
  <form action="/inscricoes" method="POST" class="grid">
    <select name="eventoId" required>
      <% eventos.forEach(ev => { %><option value="<%= ev.id %>"><%= ev.titulo %></option><% }) %>
    </select>
    <% if (usuarioLogado.perfil === 'Admin') { %>
      <select name="usuarioId" required>
        <% usuarios.forEach(u => { %><option value="<%= u.id %>"><%= u.nome %></option><% }) %>
      </select>
    <% } %>
    <button type="submit">Inscrever</button>
  </form>
  <table>
    <thead><tr><th>ID</th><th>Participante</th><th>Evento</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>
      <% inscricoes.forEach(ins => { %>
        <tr>
          <td><%= ins.id %></td>
          <td><%= ins.Usuario ? ins.Usuario.nome : '-' %></td>
          <td><%= ins.Evento ? ins.Evento.titulo : '-' %></td>
          <td>
            <form action="/inscricoes/<%= ins.id %>?_method=PUT" method="POST" role="group">
              <select name="status">
                <option value="Confirmada" <%= ins.status === 'Confirmada' ? 'selected' : '' %>>Confirmada</option>
                <option value="Cancelada" <%= ins.status === 'Cancelada' ? 'selected' : '' %>>Cancelada</option>
              </select>
              <button type="submit">Atualizar</button>
            </form>
          </td>
          <td>
            <form action="/inscricoes/<%= ins.id %>?_method=DELETE" method="POST">
              <button type="submit" class="secondary">Cancelar/Excluir</button>
            </form>
          </td>
        </tr>
      <% }) %>
    </tbody>
  </table>
</body>
</html>
`,

  'app.js': `const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const swaggerUi = require('swagger-ui-express');

const { inicializarBanco } = require('./models');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/api/apiRoutes');
const swaggerDocument = require('./config/swagger');

const app = express();

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: 'sessao_secreta_web2_2026',
  resave: false,
  saveUninitialized: false
}));

// Documentação da API REST (Entrega 2)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rotas
app.use('/api', apiRoutes); // Entrega 2 - API REST
app.use('/', webRoutes);    // Entrega 1 - Sistema MVC

inicializarBanco().then(() => {
  app.listen(3000, () => {
    console.log('Servidor rodando em: http://localhost:3000');
    console.log('Documentação API em: http://localhost:3000/api-docs');
  });
});
`
};

for (const [caminho, conteudo] of Object.entries(arquivos)) {
  const dir = path.dirname(caminho);
  if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(caminho, conteudo, 'utf8');
  console.log('Criado:', caminho);
}

console.log('\nTudo gerado! Agora rode:\n  npm install\n  npm start');
