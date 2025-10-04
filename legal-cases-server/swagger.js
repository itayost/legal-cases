// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Court Decisions + Text Concordance API',
      version: '1.1.0',
      description: 'Manage court decisions (metadata, files) and ingest/search TXT with word index, context windows, groups, phrases, and stats'
    },
    servers: [{ url: 'http://localhost:3000' }]
  },
  apis: ['./index.js']
};

module.exports = swaggerJsdoc(options);
