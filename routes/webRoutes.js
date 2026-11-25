const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const crud = require('../controllers/crudController');
const { verificarLogado, permitirPerfis } = require('../middlewares/authMvc');

router.get('/', (req, res) => 
{
	if(req.session && req.session.usuario)
	{
		return res.redirect('/dashboard');
	}	
	return res.redirect('/login');
});

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
router.get('/inscricoes', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante', 'Palestrante'), crud.listarInscricoes);
router.post('/inscricoes', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante', 'Palestrante'), crud.criarInscricao);
router.put('/inscricoes/:id', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante', 'Palestrante'), crud.atualizarInscricao);
router.delete('/inscricoes/:id', verificarLogado, permitirPerfis('Admin', 'Organizador', 'Participante', 'Palestrante'), crud.deletarInscricao);

module.exports = router;
