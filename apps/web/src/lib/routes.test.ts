import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROUTES, linkTarget, primaryNavRoutes } from './routes';

const APP_DIR = join(process.cwd(), 'src', 'app');

/** Every URL the App Router actually serves, derived from `page.tsx` files. */
function pageRoutes(dir = APP_DIR): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    if (statSync(absolute).isDirectory()) {
      routes.push(...pageRoutes(absolute));
      continue;
    }
    if (entry !== 'page.tsx') {
      continue;
    }
    const segments = relative(APP_DIR, dir)
      .split(sep)
      .filter((segment) => segment.length > 0 && !/^\(.+\)$/.test(segment));
    routes.push(segments.length === 0 ? '/' : `/${segments.join('/')}`);
  }
  return routes.sort();
}

describe('route catalogue', () => {
  it('has unique ids and hrefs', () => {
    const ids = ROUTES.map((route) => route.id);
    const hrefs = ROUTES.map((route) => route.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('matches the App Router tree exactly', () => {
    const implemented = ROUTES.filter((route) => route.status === 'implemented')
      .map((route) => route.href)
      .sort();
    // If this fails: add the new page to `routes.ts`, or remove the catalogue
    // entry. The sitemap must never describe a page that does not exist.
    expect(implemented).toEqual(pageRoutes());
  });

  it('explains why a route is unavailable', () => {
    for (const route of ROUTES.filter((item) => item.status !== 'implemented')) {
      expect(route.availabilityNoteKey, `${route.id} needs an availabilityNoteKey`).toBeTruthy();
    }
  });

  it('keeps every parent reference resolvable', () => {
    const ids = new Set(ROUTES.map((route) => route.id));
    for (const route of ROUTES) {
      if (route.parentId) {
        expect(ids.has(route.parentId), `${route.id} → ${route.parentId}`).toBe(true);
      }
    }
  });

  it('only puts implemented, signed-in pages in the primary navigation', () => {
    const navRoutes = primaryNavRoutes();
    expect(navRoutes.length).toBeGreaterThan(0);
    for (const route of navRoutes) {
      expect(route.status).toBe('implemented');
      expect(route.access).toBe('authenticated');
      expect(route.dynamic).not.toBe(true);
    }
  });

  it('links only implemented, non-parameterized routes', () => {
    for (const route of ROUTES) {
      const target = linkTarget(route);
      if (route.status === 'implemented' && !route.dynamic) {
        expect(target?.href).toBe(route.href);
      } else {
        expect(target).toBeNull();
      }
    }
  });
});
