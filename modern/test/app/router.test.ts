// Structural guards for the application router.
//
// The route table is the contract between legacy bookmarks and the React
// features. CP14 made feature routes lazy, so these tests assert both the
// route shape and that every feature is still resolved through a lazy loader
// (which keeps the initial bundle small without dropping routes).

import { router } from '@/app/router';

const children = router.routes[0].children ?? [];

function paths(): string[] {
  return children.map((child) => child.path ?? '(index)');
}

describe('application route table', () => {
  it('keeps every legacy-compatible route', () => {
    expect(paths()).toEqual([
      '(index)',
      'courses',
      'courses/:courseId/:category/*',
      'courses/:courseId',
      'labs',
      'calendar',
      'reader',
      'admin',
      'login',
      'migration/not-found',
      '*',
    ]);
  });

  it('defines a single root layout route', () => {
    expect(router.routes).toHaveLength(1);
    expect(router.routes[0].path).toBe('/');
    expect(children.length).toBeGreaterThan(0);
  });

  it('loads every feature through a lazy loader', () => {
    for (const child of children) {
      expect(typeof child.lazy).toBe('function');
      expect(child.Component).toBeUndefined();
    }
  });

  it('keeps admin behind the same route path so protection cannot be bypassed', () => {
    const admin = children.find((child) => child.path === 'admin');
    expect(admin).toBeDefined();
    expect(typeof admin?.lazy).toBe('function');
  });
});
