function verificarLogado(req, res, next) {
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
    return res.status(403).send(`
      <h1>403 - Acesso Negado</h1>
      <p>Seu perfil (${usuario ? usuario.perfil : 'Visitante'}) não tem permissão para esta rota.</p>
      <a href="/dashboard">Voltar ao Painel</a>
    `);
  };
}

module.exports = { verificarLogado, permitirPerfis };
