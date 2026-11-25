const jwt = require('jsonwebtoken');
const { Perfil, Usuario, Categoria, Evento, Inscricao } = require('../../models');
const { JWT_SECRET } = require('../../middlewares/authApi');

async function validarDonoInscricaoApi(req) {
  const inscricao = await Inscricao.findByPk(req.params.id);
  if (!inscricao) return { erro: 404, msg: 'Inscrição não encontrada.' };

  const usuario = req.usuarioApi;
  if (usuario.perfil === 'Participante' && inscricao.usuarioId != usuario.id) {
    return { erro: 403, msg: 'Você só pode modificar suas próprias inscrições.' };
  }

  return { inscricao };
}

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
    const registro = await Perfil.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Perfil não encontrado' });
    await registro.update({ nome: req.body.nome });
    res.status(200).json({ mensagem: 'Perfil atualizado', dado: registro });
  },
  async deletarPerfil(req, res) {
    const registro = await Perfil.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Perfil não encontrado' });
    await registro.destroy();
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
    const registro = await Usuario.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Usuário não encontrado' });
    await registro.update(req.body);
    res.status(200).json({ mensagem: 'Usuário atualizado', dado: registro });
  },
  async deletarUsuario(req, res) {
    const registro = await Usuario.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Usuário não encontrado' });
    await registro.destroy();
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
    const registro = await Categoria.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Categoria não encontrada' });
    await registro.update({ nome: req.body.nome });
    res.status(200).json({ mensagem: 'Categoria atualizada', dado: registro });
  },
  async deletarCategoria(req, res) {
    const registro = await Categoria.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Categoria não encontrada' });
    await registro.destroy();
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

  	const eventoDuplicado = await Evento.findOne({ where: { titulo, data } });
  	if (eventoDuplicado) {
  	  return res.status(400).json({ erro: 'Já existe um evento com este título nesta data.' });
  	}
  	
    const novo = await Evento.create({
      ...req.body,
      organizadorId: req.body.organizadorId || req.usuarioApi.id
    });
    res.status(201).json(novo);
  },
  async atualizarEvento(req, res) {
    const registro = await Evento.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Evento não encontrado' });
    await registro.update(req.body);
    res.status(200).json({ mensagem: 'Evento atualizado', dado: registro });
  },
  async deletarEvento(req, res) {
    const registro = await Evento.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Evento não encontrado' });
    await registro.destroy();
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

	const usuarioId = req.body.usuarioId || req.usuarioApi.id;
  	const { eventoId, status } = req.body;
  	
  	const jaInscrito = await Inscricao.findOne({ where: { usuarioId, eventoId } });
  	if (jaInscrito) {
  	  return res.status(400).json({ erro: 'Usuário já está inscrito neste evento.' });
  	}
  	
    const novo = await Inscricao.create({
      usuarioId: req.body.usuarioId || req.usuarioApi.id,
      eventoId: req.body.eventoId,
      status: req.body.status || 'Confirmada'
    });
    res.status(201).json(novo);
  },
  async atualizarInscricao(req, res) {

  	const { inscricao, erro, msg } = await validarDonoInscricaoApi(req);
  	if (erro) return res.status(erro).json({ erro: msg });
  	
    const registro = await Inscricao.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Inscrição não encontrada' });
    await registro.update({ status: req.body.status });
    res.status(200).json({ mensagem: 'Inscrição atualizada', dado: registro });
  },
  async deletarInscricao(req, res) {
    const registro = await Inscricao.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ erro: 'Inscrição não encontrada' });
    await registro.destroy();
    res.status(200).json({ mensagem: 'Inscrição excluída' });
  }
};
