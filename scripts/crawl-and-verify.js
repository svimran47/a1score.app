const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  '/',
  '/matches',
  '/matches/4555883',
  '/players',
  '/players/erling-haaland-82604',
  '/clubs',
  '/clubs/131',
  '/leagues',
  '/leagues/GB1',
  '/search',
  '/transfers'
];

const BANNED_TERMS = [
  'transfermarkt',
  'fotmob',
  'transfermarkt.technology',
  'fotmob.com',
  'scraper',
  'scraped',
  'edge scrapers'
];

const BANNED_IMAGE_HOSTS = [
  'transfermarkt.technology',
  'tmssl.akamaized.net',
  'images.fotmob.com',
  'fotmob.com',
  'api-sports.io'
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetchUrl(`${BASE_URL}/`);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`Server ready on ${BASE_URL} (status: ${res.statusCode})`);
        return true;
      }
    } catch (e) {
      // wait 1 second
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Server failed to start after ${maxAttempts} seconds`);
}

async function run() {
  console.log('--- STARTING NEXT.JS SERVER FOR AUDIT CRAWL ---');
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    shell: true,
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  try {
    await waitForServer();

    console.log('\n--- CRAWLING AND VERIFYING ALL 12 ROUTES ---');
    const results = [];
    let overallPassed = true;

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      console.log(`\nTesting Route: ${route} (${url})`);
      
      const { statusCode, body } = await fetchUrl(url);
      console.log(`  HTTP Status: ${statusCode}`);

      // 1. Check Title for duplicate branding
      const titleMatch = body.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'NO_TITLE';
      const hasDoubleTitle = /\| a1score\.app\s*\|\s*a1score\.app/i.test(title);
      console.log(`  Title: "${title}"`);
      if (hasDoubleTitle) {
        console.error(`  [FAIL] Duplicate branding found in title: "${title}"`);
        overallPassed = false;
      } else {
        console.log(`  [PASS] Title format clean.`);
      }

      // 2. Check for banned terms in HTML
      const lowerBody = body.toLowerCase();
      const termHits = [];
      for (const term of BANNED_TERMS) {
        if (lowerBody.includes(term)) {
          termHits.push(term);
        }
      }

      if (termHits.length > 0) {
        console.error(`  [FAIL] Found banned terms in HTML: ${termHits.join(', ')}`);
        overallPassed = false;
      } else {
        console.log(`  [PASS] 0 banned source terms in rendered HTML.`);
      }

      // 3. Check for banned image hostnames
      const imageHostHits = [];
      for (const host of BANNED_IMAGE_HOSTS) {
        if (lowerBody.includes(host)) {
          imageHostHits.push(host);
        }
      }

      if (imageHostHits.length > 0) {
        console.error(`  [FAIL] Found third-party image hosts in HTML: ${imageHostHits.join(', ')}`);
        overallPassed = false;
      } else {
        console.log(`  [PASS] 0 third-party image hostnames in rendered HTML.`);
      }

      // 4. Check canonical and og:url
      const canonicalMatch = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](.*?)["']/i);
      const ogUrlMatch = body.match(/<meta[^>]+property=["']og:url["'][^>]+content=["'](.*?)["']/i);
      console.log(`  Canonical: ${canonicalMatch ? canonicalMatch[1] : 'N/A'}`);
      console.log(`  og:url:    ${ogUrlMatch ? ogUrlMatch[1] : 'N/A'}`);

      results.push({
        route,
        statusCode,
        title,
        hasDoubleTitle,
        termHits,
        imageHostHits,
        passed: statusCode === 200 && !hasDoubleTitle && termHits.length === 0 && imageHostHits.length === 0
      });
    }

    console.log('\n========================================');
    console.log('FINAL CRAWL VERIFICATION SUMMARY:');
    console.log('========================================');
    results.forEach(r => {
      console.log(`${r.passed ? '✓ PASS' : '✗ FAIL'} ${r.route} (Status ${r.statusCode}) - "${r.title}"`);
      if (r.termHits.length > 0) console.log(`    Banned terms: ${r.termHits.join(', ')}`);
      if (r.imageHostHits.length > 0) console.log(`    Banned image hosts: ${r.imageHostHits.join(', ')}`);
      if (r.hasDoubleTitle) console.log(`    Double title detected!`);
    });

    if (overallPassed) {
      console.log('\n✓ ALL 12 ROUTES PASSED WITH ZERO VIOLATIONS.');
    } else {
      console.log('\n✗ VERIFICATION FAILED ON ONE OR MORE ROUTES.');
      process.exitCode = 1;
    }
  } finally {
    console.log('\nShutting down Next.js server...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], { shell: true });
    } else {
      serverProcess.kill('SIGTERM');
    }
  }
}

run().catch(err => {
  console.error('Fatal error during crawl:', err);
  process.exit(1);
});
