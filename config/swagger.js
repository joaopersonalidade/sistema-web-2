const crudPaths = (tag, recurso, exemploBody, permissaoEscrita) => ({
  [`/api/${recurso}`]: {
    get: {
      tags: [tag],
      summary: `Listar todos (${recurso})`,
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Sucesso' }, 401: { description: 'Token ausente' } }
    },
    post: {
      tags: [tag],
      summary: `Criar (${recurso}) - Permissão: ${permissaoEscrita}`,
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', example: exemploBody } } } },
      responses: { 201: { description: 'Criado' }, 401: { description: 'Token ausente' }, 403: { description: 'Sem permissão' } }
    }
  },
  [`/api/${recurso}/{id}`]: {
    put: {
      tags: [tag],
      summary: `Atualizar (${recurso}) - Permissão: ${permissaoEscrita}`,
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', example: exemploBody } } } },
      responses: { 200: { description: 'Atualizado' }, 403: { description: 'Sem permissão' }, 404: { description: 'Não encontrado' } }
    },
    delete: {
      tags: [tag],
      summary: `Excluir (${recurso}) - Permissão: ${permissaoEscrita}`,
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
          content: { 'application/json': { schema: { type: 'object', example: { email: 'example@example.com', senha: '*******' } } } }
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
