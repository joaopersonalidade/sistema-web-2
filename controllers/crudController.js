const { Perfil, Usuario, Categoria, Evento, Inscricao } = require('../models');

async function validarDonoInscricao(req)
{
	const inscricao = await Inscricao.findByPk(req.params.id);
	if(!inscricao) return { erro: 404, msg: 'Inscrição não encontrada.'};

	const usuario = req.session.usuario;
	
	if(usuario.perfil == 'Participante' && inscricao.usuarioId != usuario.id)
	{
		return { erro: 403, msg : 'Você só pode alterar sua própria inscrição!'};
	}

	return { inscricao };
}	

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
  try
   	{
   		await Perfil.create({ nome: req.body.nome });
  		return 	res.redirect('/usuarios');
   	}
   	catch(error)
   	{
   		return res.status(404).send(`Erro ao criar perfil: ${error.message}<br>`);
  	}
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

    const eventoDuplicado = await Evento.findOne({ where:{ titulo, data } });
    if(eventoDuplicado) return res.status(400).send('Já existe um evento cadastrado com este título nesta data.');
    
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
  try
	  {
	    const usuarioId = req.body.usuarioId || req.session.usuario.id;
	    const { eventoId, status } = req.body;

		const jaInscrito = await Inscricao.findOne({ where: { usuarioId, eventoId}});
	    if(jaInscrito)
	    {
	    	return res.status(400).send('Este usuário já está inscrito neste evento!');
	    }
	    await Inscricao.create({ usuarioId, eventoId, status: status || 'Confirmada' });
	    res.redirect('/inscricoes');
	  }
  catch(err)
	  {
	  	console.error(err);
	  	return res.status(500).send('Erro ao criar inscrição.');	
	  }
  },
  async atualizarInscricao(req, res) {

	const { inscricao, erro, msg } = await validarDonoInscricao(req);
	if(erro) return res.status(erro).send(msg);
	
    await Inscricao.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.redirect('/inscricoes');
	
  },
  async deletarInscricao(req, res) {
	const { inscricao, erro, msg } = await validarDonoInscricao(req);
	if(erro) return res.status(erro).send(msg);

    await Inscricao.destroy({ where: { id: req.params.id } });
    res.redirect('/inscricoes');
  }
};
