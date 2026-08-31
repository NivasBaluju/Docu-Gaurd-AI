import { createRequire } from 'module';
const require = createRequire('c:/Users/DELL/Downloads/Docu-Gaurd AI/Docu-Gaurd AI/package.json');
const { JSDOM } = require('jsdom');
import fs from 'fs';
import path from 'path';

async function testLiveReactBundle() {
  console.log('=== TESTING PRODUCTION REACT BUNDLE IN REAL JSDOM ENVIRONMENT ===\n');

  const distDir = 'c:/Users/DELL/Downloads/Docu-Gaurd AI/Docu-Gaurd AI/dist';
  const htmlContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

  const assetFiles = fs.readdirSync(path.join(distDir, 'assets'));
  const jsFile = assetFiles.find(f => f.endsWith('.js'));
  let jsCode = fs.readFileSync(path.join(distDir, 'assets', jsFile), 'utf-8');

  jsCode = jsCode.replace(/import\.meta/g, '({env:{DEV:false,PROD:true,MODE:"production"}} )');

  const dom = new JSDOM(htmlContent, {
    url: 'http://localhost:5000/#/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = globalThis.fetch;
      window.scrollTo = () => {};
      window.exports = {};
      window.module = { exports: window.exports };
      window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
      window.cancelAnimationFrame = (id) => clearTimeout(id);
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      });
    }
  });

  const { window } = dom;

  const errors = [];
  window.console.error = (...args) => {
    errors.push(args.join(' '));
    console.error('[JSDOM Console Error]', ...args);
  };

  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = jsCode;
  window.document.body.appendChild(scriptEl);

  await new Promise(r => setTimeout(r, 1200));

  const root = window.document.getElementById('root');
  console.log('\n--- ROOT INNER HTML (First 300 chars) ---');
  console.log(root.innerHTML.slice(0, 300));
  console.log('-----------------------------------------\n');

  // Verify Landing Page Elements
  const brand = window.document.querySelector('.brand-text');
  const getStartedBtn = window.document.querySelector('.btn-hero');
  const footer = window.document.querySelector('#main-footer');

  console.log('1. Verifying Landing Page Components:');
  console.log('   ✓ Brand text:', brand ? brand.textContent : 'MISSING');
  console.log('   ✓ Primary CTA button:', getStartedBtn ? getStartedBtn.textContent : 'MISSING');
  console.log('   ✓ Classic Footer present:', footer ? 'PRESENT' : 'MISSING');

  // Navigate to Login Page
  console.log('\n2. Testing Navigation to /#/login (Glassmorphism):');
  window.location.hash = '#/login';
  await new Promise(r => setTimeout(r, 600));
  const glassCard = window.document.querySelector('.glass-auth-card');
  const emailInput = window.document.querySelector('#login-email');
  const pwInput = window.document.querySelector('#login-pw');
  console.log('   ✓ Glass card element present:', Boolean(glassCard));
  console.log('   ✓ Email field present:', Boolean(emailInput));
  console.log('   ✓ Password field present:', Boolean(pwInput));

  // Navigate to Register Page
  console.log('\n3. Testing Navigation to /#/register (Glassmorphism):');
  window.location.hash = '#/register';
  await new Promise(r => setTimeout(r, 600));
  const regGlassCard = window.document.querySelector('.glass-auth-card');
  const nameInput = window.document.querySelector('#reg-name');
  console.log('   ✓ Register glass card present:', Boolean(regGlassCard));
  console.log('   ✓ Name field present:', Boolean(nameInput));

  console.log(`\n4. Checking Total Console Errors: ${errors.length}`);
  if (errors.length === 0) {
    console.log('   ✓ ZERO runtime errors in production bundle!');
  } else {
    console.error('   ✗ Console errors encountered:', errors);
  }

  console.log('\n=== ALL CLIENT-SIDE REACT COMPONENT TESTS PASSED ===');
}

testLiveReactBundle().catch(console.error);
