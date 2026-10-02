// Central configuration for SEO Wizard.
// Multi-tenant sites, credential paths, ports, and shared constants.
const path = require('path');

const PROFILE_DIR = 'C:/Users/Jay/AppData/Local/hermes/profiles/eisen-seo-wizard';
const SA_KEY = path.join(PROFILE_DIR, 'auth', 'service-account-key.json');

// Path to the internal Notes database (Vistaran Knowledge Base).
const NOTES_ROOT = 'C:/Users/Jay/Documents/Vistaran-Knowledge-Base';

// Google API scopes (service account is already delegated for these).
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
];

// The three tenants: Website A / B / C.
const SITES = [
  {
    key: 'vistaran',
    label: 'Website A',
    name: 'Vistaran Tech',
    domain: 'vistaran.com',
    homepage: 'https://vistaran.com',
    gscProperty: 'sc-domain:vistaran.com',
    ga4Property: '438910146',
    competitors: ['cognizant.com', 'tcs.com', 'infosys.com'],
    aiEngines: ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai'],
  },
  {
    key: 'boomerr',
    label: 'Website B',
    name: 'Boomerr',
    domain: 'boomerr.ai',
    homepage: 'https://boomerr.ai',
    gscProperty: 'sc-domain:boomerr.ai',
    ga4Property: '524940807',
    competitors: ['uptimerobot.com', 'pingdom.com', 'site24x7.com'],
    aiEngines: ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai'],
  },
  {
    key: 'lushly',
    label: 'Website C',
    name: 'Lushly',
    domain: 'lushlyapp.com',
    homepage: 'https://lushlyapp.com',
    gscProperty: 'sc-domain:lushlyapp.com',
    ga4Property: '545006848',
    competitors: ['urbankisaan.com', 'mybageecha.com', 'ugaoo.com'],
    aiEngines: ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai'],
  },
];

const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const DB_FILE = path.join(__dirname, 'data', 'seo-wizard.db');

// AI referral domains (for Organic vs AI referral distribution).
const AI_REFERRERS = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'claude.ai',
  'bard.google.com',
  'bing.com/chat',
  'you.com',
  'phind.com',
];

module.exports = {
  PROFILE_DIR,
  SA_KEY,
  NOTES_ROOT,
  SCOPES,
  SITES,
  PORT,
  CLIENT_DIST,
  DB_FILE,
  AI_REFERRERS,
};
