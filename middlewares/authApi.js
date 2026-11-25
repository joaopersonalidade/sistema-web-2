const jwt = require('jsonwebtoken');
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
      erro: `Acesso negado. Perfil '${req.usuarioApi?.perfil}' não autorizado.`
    });
  };
}

module.exports = { verificarToken, permitirPerfisApi, JWT_SECRET };
