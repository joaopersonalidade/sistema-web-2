# Sistema de Gerenciamento de Eventos (MVC + API REST)

Projeto desenvolvido para a disciplina de Desenvolvimento Web, contemplando uma aplicação web completa no padrão **MVC** (Entrega 1) e uma **API RESTful** autenticada via **JWT** e documentada com **Swagger** (Entrega 2).

## Integrantes

* João Vítor Antunes da Luz

* Matheus Henrique dos Santos

## Tecnologias Utilizadas

* **Back-end:** Node.js, Express

* **Banco de Dados & ORM:** SQLite, Sequelize

* **Views & Sessão (MVC):** EJS, `express-session`, `method-override`

* **API & Segurança:** JSON Web Token (`jsonwebtoken`), `bcryptjs`

* **Documentação:** Swagger UI (`swagger-ui-express` / OpenAPI 3.0)

## Arquitetura do Projeto

```
├── config/          # Configuração do banco de dados (Sequelize) e Swagger
├── controllers/     # Regras de negócio (MVC Web e API REST)
├── middlewares/     # Autenticação/autorização (Sessão e JWT)
├── models/          # Entidades e relacionamentos do Sequelize
├── routes/          # Definição das rotas Web e Endpoints da API
├── views/           # Templates HTML dinâmicos em EJS
├── app.js           # Ponto de entrada e configuração do servidor Express
└── package.json     # Dependências e scripts do projeto

```

## Modelagem do Banco de Dados

O sistema possui **5 entidades** e **4 relacionamentos**:

* **Perfil (1:N) Usuario:** Define os níveis de acesso do sistema (`Admin`, `Organizador`, `Participante`).

* **Categoria (1:N) Evento:** Classifica os eventos disponíveis por área/tema.

* **Usuario (1:N) Evento:** Identifica o organizador responsável pela criação do evento.

* **Usuario (N:N) Evento via Inscricao:** Gerencia as inscrições dos participantes nos eventos (incluindo controle de titularidade para impedir alterações indevidas).

## Como Executar o Projeto

1. **Clone o repositório e acesse a pasta:**

   ```
   git clone <url-do-seu-repositorio>
   cd <pasta-do-projeto>
   
   ```

2. **Instale as dependências:**

   ```
   npm install
   
   ```

3. **Inicie o servidor:**

   ```
   npm start
   
   ```

   *(Ao iniciar pela primeira vez, o Sequelize cria automaticamente o arquivo `database.sqlite` e popula os dados iniciais).*

4. **Acesse no navegador:**

   * **Aplicação Web (MVC):** `http://localhost:3000`

   * **Documentação Interativa da API (Swagger UI):** `http://localhost:3000/api-docs`

## Credenciais de Acesso (Ambiente de Teste)

* **Administrador:** `admin@eventos.com` / `123` *(ajuste caso tenha usado outro e-mail/senha no seed)*

* **Organizador:** `org@eventos.com` / `123`

* **Participante:** `participante@eventos.com` / `123`

## Principais Endpoints da API (`/api`)

### Autenticação

* `POST /api/login` — Autentica o usuário com e-mail e senha e retorna o Token JWT (`Bearer`).

### Recursos Protegidos (Requer cabeçalho `Authorization: Bearer <token>`)

* `GET | POST | PUT | DELETE /api/perfis` — Gerenciamento de perfis de acesso (`Admin`).

* `GET | POST | PUT | DELETE /api/usuarios` — Gerenciamento de usuários (`Admin`).

* `GET | POST | PUT | DELETE /api/categorias` — Gerenciamento de categorias (`Admin` e `Organizador`).

* `GET | POST | PUT | DELETE /api/eventos` — Listagem pública para autenticados; criação, edição e exclusão restritas (`Admin` e `Organizador`).

* `GET | POST | PUT | DELETE /api/inscricoes` — Controle de inscrições nos eventos (com validação de dono do registro).

## Códigos de Status HTTP Utilizados na API

* `200 OK` — Requisição processada com sucesso (`GET`, `PUT`, `DELETE`).

* `201 Created` — Novo recurso criado com sucesso (`POST`).

* `400 Bad Request` — Dados inválidos ou tentativa de cadastro duplicado.

* `401 Unauthorized` — Token ausente ou credenciais inválidas.

* `403 Forbidden` — Token inválido/expirado ou usuário sem permissão para a ação.

* `404 Not Found` — Recurso ou ID não encontrado no banco de dados.

* `500 Internal Server Error` — Erro interno inesperado no servidor.
