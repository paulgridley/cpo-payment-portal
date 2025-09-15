// Azure App Service startup file
// This ensures the application starts correctly on Azure Linux App Service
const path = require('path');

// Set the main application file
process.chdir(__dirname);

// Start the application
require('./dist/index.js');