// Regression guards for the CP12/CP13 production cutover artifacts.
//
// These tests validate the *non-active* Hosting proposal and the environment
// hygiene rules. They intentionally read the files from disk instead of
// importing them so the assertions describe the exact bytes that would be
// deployed or committed.
//
// They do not connect to Firebase and do not validate live backend behavior.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const modernRoot = path.resolve(repoRoot, 'modern');

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

interface HostingHeader {
  key: string;
  value: string;
}

interface HostingHeaderRule {
  source: string;
  headers: HostingHeader[];
}

interface ModernHostingConfig {
  hosting: {
    public: string;
    ignore: string[];
    headers: HostingHeaderRule[];
    rewrites: Array<{ source: string; destination: string }>;
  };
}

describe('firebase.modern.json cutover proposal', () => {
  const config = readJson<ModernHostingConfig>(
    path.join(repoRoot, 'firebase.modern.json'),
  );

  it('serves the production Vite build from modern/dist', () => {
    expect(config.hosting.public).toBe('modern/dist');
  });

  it('excludes source maps and environment files from deployment', () => {
    expect(config.hosting.ignore).toEqual(
      expect.arrayContaining(['**/.*', '**/node_modules/**', '**/*.map']),
    );
  });

  it('provides a single catch-all SPA rewrite to the app shell', () => {
    expect(config.hosting.rewrites).toEqual([
      { source: '**', destination: '/index.html' },
    ]);
  });

  it('caches content-hashed assets immutably', () => {
    const rule = config.hosting.headers.find(
      (candidate) => candidate.source === '/assets/**',
    );
    expect(rule).toBeDefined();
    expect(rule?.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    });
  });

  it('gives the app shell a revalidating cache policy', () => {
    const noCacheSources = config.hosting.headers
      .filter((rule) =>
        rule.headers.some(
          (header) =>
            header.key === 'Cache-Control' && header.value === 'no-cache',
        ),
      )
      .map((rule) => rule.source);

    expect(noCacheSources).toEqual(expect.arrayContaining(['/', '/index.html']));
  });

  it('applies baseline security headers on every response', () => {
    const catchAll = config.hosting.headers.find(
      (candidate) => candidate.source === '**',
    );
    expect(catchAll).toBeDefined();

    const headers = new Map(
      catchAll?.headers.map((header) => [header.key, header.value]),
    );
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('does not put a catch-all Cache-Control on every response', () => {
    // A catch-all Cache-Control would compete with the more specific asset and
    // app-shell rules. Firebase header precedence is subtle, so the proposal
    // deliberately scopes Cache-Control to explicit sources.
    const catchAll = config.hosting.headers.find(
      (candidate) => candidate.source === '**',
    );
    expect(
      catchAll?.headers.some((header) => header.key === 'Cache-Control'),
    ).toBe(false);
  });
});

describe('environment configuration hygiene', () => {
  const gitignore = readFileSync(path.join(modernRoot, '.gitignore'), 'utf8');
  const envExample = readFileSync(
    path.join(modernRoot, '.env.example'),
    'utf8',
  );

  it('ignores every environment file variant but keeps the example', () => {
    const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
    expect(lines).toContain('.env');
    expect(lines).toContain('.env.*');
    expect(lines).toContain('!.env.example');
  });

  it('documents every required Firebase client variable', () => {
    const required = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_DATABASE_URL',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];

    for (const name of required) {
      expect(envExample).toMatch(new RegExp(`^${name}=`, 'm'));
    }
  });

  it('never documents server-side credential variables in the client example', () => {
    // Only inspect variable assignments: the explanatory comment legitimately
    // warns against adding these credentials, so matching the words in prose
    // would be a false positive.
    const assignments = envExample
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes('=') && !line.startsWith('#'));

    for (const line of assignments) {
      expect(line).not.toMatch(/private_key/i);
      expect(line).not.toMatch(/client_secret/i);
      expect(line).not.toMatch(/refresh_token/i);
      expect(line).not.toMatch(/service[_ -]?account/i);
    }
  });
});
