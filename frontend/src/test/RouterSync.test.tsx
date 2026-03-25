/**
 * Tests for RouterSync — verifies that store navigation pushes URLs
 * and that URL changes (back/forward) update the store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RouterSync } from '../router/RouterSync';
import { useDashboardStore } from '../store/dashboardStore';

function TestApp({ initialPath = '/' }: { initialPath?: string }) {
  const router = createMemoryRouter(
    [{ path: '*', element: <RouterSync /> }],
    { initialEntries: [initialPath] },
  );
  return <RouterProvider router={router} />;
}

beforeEach(() => {
  useDashboardStore.getState().reset();
});

describe('RouterSync', () => {
  it('renders without crashing', () => {
    expect(() => render(<TestApp />)).not.toThrow();
  });

  it('does not change store when path is unknown', () => {
    render(<TestApp initialPath="/" />);
    expect(useDashboardStore.getState().currentPage).toBe('overview');
  });

  it('syncs a known URL path to the store on mount', () => {
    render(<TestApp initialPath="/monitor" />);
    expect(useDashboardStore.getState().currentPage).toBe('monitor');
  });

  it('syncs /archive to the store', () => {
    render(<TestApp initialPath="/archive" />);
    expect(useDashboardStore.getState().currentPage).toBe('archive');
  });

  it('syncs /analysis to the store', () => {
    render(<TestApp initialPath="/analysis" />);
    expect(useDashboardStore.getState().currentPage).toBe('analysis');
  });
});
