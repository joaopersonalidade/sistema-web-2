const express = require('express');
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
