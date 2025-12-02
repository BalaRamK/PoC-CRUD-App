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

async function printToken() {
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default']
  };
  const response = await cca.acquireTokenByClientCredential(tokenRequest);
  console.log(response.accessToken);
}
printToken();