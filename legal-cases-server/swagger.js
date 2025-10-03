// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Court Decisions API',
      version: '1.0.0',
      description: 'API for managing court decisions and attached PDF files',
    },
  },
  apis: ['./index.js'], // מסמכים נלקחים מה-JSDoc ב-index.js
};

const openapiSpecification = swaggerJsdoc(options);
module.exports = openapiSpecification;
