require('dotenv').config();
const { ConfidentialClientApplication } = require('@azure/msal-node');

const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};

const cca = new ConfidentialClientApplication(config);

const tokenRequest = {
  scopes: ['https://graph.microsoft.com/.default'],
};

cca.acquireTokenByClientCredential(tokenRequest).then((response) => {
  console.log('Access Token:', response.accessToken ? 'Obtained successfully' : 'Failed to obtain');
}).catch((error) => {
  console.error('Auth error:', error);
});
