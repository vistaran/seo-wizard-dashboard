// Google API client factory — service account auth for GSC + GA4.
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { SA_KEY, SCOPES } = require('../config');

let _client = null;
let _loading = null;

async function getClient() {
  if (_client) return _client;
  if (!_loading) {
    _loading = (async () => {
      const auth = new GoogleAuth({ keyFile: SA_KEY, scopes: SCOPES });
      _client = await auth.getClient();
      return _client;
    })().catch((e) => {
      _loading = null;
      throw e;
    });
  }
  return _loading;
}

async function webmasters() {
  const client = await getClient();
  return google.webmasters({ version: 'v3', auth: client });
}

async function analyticsData() {
  const client = await getClient();
  return google.analyticsdata({ version: 'v1beta', auth: client });
}

module.exports = { getClient, webmasters, analyticsData };
