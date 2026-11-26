const express = require('express');
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

router.get('/categorias', verificarToken, permitirPerfisApi('Admin', 'Organizador'), api.listarCategorias);
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
