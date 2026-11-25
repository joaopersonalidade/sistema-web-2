const { Usuario, Perfil } = require('../models');

module.exports = {
  telaLogin(req, res) {
  	if(req.session && req.session.usuario)
  	{
  		return res.redirect('/dashboard');
  	}
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
