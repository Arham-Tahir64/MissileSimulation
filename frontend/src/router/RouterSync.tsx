/**
 * RouterSync — keeps dashboardStore.currentPage in sync with the URL
 * so browser back/forward and direct links work correctly.
 *
 * Source of truth priority:
 *  - URL changes (back/forward) → update store
 *  - Store changes (in-app nav) → push to URL
 *
 * Rendered as a headless component inside HashRouter in App.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardPage, useDashboardStore } from '../store/dashboardStore';

const VALID_PAGES: DashboardPage[] = [
  'overview',
  'monitor',
  'replay',
  'analysis',
  'archive',
  'settings',
];

function pathToPage(pathname: string): DashboardPage | null {
  const segment = pathname.replace(/^\//, '').split('/')[0] as DashboardPage;
  return VALID_PAGES.includes(segment) ? segment : null;
}

export function RouterSync() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentPage = useDashboardStore((s) => s.currentPage);
  const setCurrentPage = useDashboardStore((s) => s.setCurrentPage);

  // Flag: true when a URL change is driving the store update so we don't
  // immediately echo it back to the URL.
  const urlDriving = useRef(false);

  // URL → store: when the user navigates back/forward, sync the store.
  useEffect(() => {
    const page = pathToPage(pathname);
    if (!page || page === currentPage) return;
    urlDriving.current = true;
    setCurrentPage(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Store → URL: when in-app navigation changes the store, push a URL entry.
  useEffect(() => {
    if (urlDriving.current) {
      urlDriving.current = false;
      return;
    }
    const urlPage = pathToPage(pathname);
    if (urlPage !== currentPage) {
      navigate(`/${currentPage}`, { replace: urlPage === null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return null;
}
