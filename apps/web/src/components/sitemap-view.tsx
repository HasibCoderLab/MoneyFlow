'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import {
  ROUTE_GROUPS,
  ROUTES,
  linkTarget,
  type AppRouteMeta,
  type RouteGroup,
  type RouteStatus,
} from '@/lib/routes';

const STATUS_LABELS: Record<RouteStatus, string> = {
  implemented: 'Available',
  planned: 'Planned',
  deferred: 'Deferred',
};

const GROUP_LABELS: Record<RouteGroup, string> = ROUTE_GROUPS.reduce(
  (labels, group) => ({ ...labels, [group.id]: group.label }),
  {} as Record<RouteGroup, string>,
);

type GroupFilter = 'all' | RouteGroup;

/** Depth of a route in the parent chain, capped so bad data cannot loop. */
function depthOf(route: AppRouteMeta, byId: Map<string, AppRouteMeta>): number {
  let depth = 0;
  let parentId = route.parentId;
  while (parentId && depth < 4) {
    const parent = byId.get(parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

function matchesQuery(route: AppRouteMeta, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${route.label} ${route.description} ${route.href} ${STATUS_LABELS[route.status]}`;
  return haystack.toLowerCase().includes(query);
}

/**
 * Interactive 2D sitemap (requirements.md §4, Phase 1).
 *
 * Read-only: it describes the real route catalogue and never links to a page
 * that does not exist. Search, area filter, and reset are local UI state; the
 * detail panel explains access, availability, and why a route is missing.
 * The tree is built from real buttons, so it is keyboard operable, and a
 * plain-text list is provided as an alternative for assistive technology.
 */
export function SiteMapView() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [selectedId, setSelectedId] = useState<string>('dashboard');
  const baseId = useId();

  const byId = useMemo(() => new Map(ROUTES.map((route) => [route.id, route])), []);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      ROUTES.filter(
        (route) =>
          (group === 'all' || route.group === group) && matchesQuery(route, normalizedQuery),
      ),
    [group, normalizedQuery],
  );

  const selected = byId.get(selectedId) ?? ROUTES[0];
  const target = selected ? linkTarget(selected) : null;
  const isDefault = group === 'all' && query.trim() === '';
  const resultsId = `${baseId}-results`;
  const detailId = `${baseId}-detail`;

  return (
    <div className="mf-sitemap">
      <div className="mf-sitemap__toolbar">
        <div className="mf-field mf-sitemap__search">
          <label className="mf-field__label" htmlFor={`${baseId}-search`}>
            Search routes
          </label>
          <input
            id={`${baseId}-search`}
            className="mf-input"
            type="search"
            value={query}
            placeholder="Search by name, path, or status"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mf-field mf-sitemap__filter">
          <label className="mf-field__label" htmlFor={`${baseId}-group`}>
            Filter by area
          </label>
          <select
            id={`${baseId}-group`}
            className="mf-input"
            value={group}
            onChange={(event) => setGroup(event.target.value as GroupFilter)}
          >
            <option value="all">All areas</option>
            {ROUTE_GROUPS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="mf-btn mf-btn--ghost"
          onClick={() => {
            setQuery('');
            setGroup('all');
            setSelectedId('dashboard');
          }}
          disabled={isDefault}
        >
          Reset
        </button>
      </div>

      <p className="mf-sitemap__count" id={resultsId} aria-live="polite">
        {filtered.length} of {ROUTES.length} routes shown.
      </p>

      <ul className="mf-sitemap__legend" aria-label="Status legend">
        {(Object.keys(STATUS_LABELS) as RouteStatus[]).map((status) => (
          <li key={status}>
            <span className={`mf-sitemap__badge mf-sitemap__badge--${status}`}>
              {STATUS_LABELS[status]}
            </span>
          </li>
        ))}
      </ul>

      <div className="mf-sitemap__layout">
        <div className="mf-sitemap__tree">
          {filtered.length === 0 ? (
            <div className="mf-empty">
              <p className="mf-empty__title">No routes match your search</p>
              <p className="mf-empty__text">
                Try a different word, choose another area, or reset the filters.
              </p>
            </div>
          ) : (
            ROUTE_GROUPS.map((routeGroup) => {
              const groupRoutes = filtered.filter((route) => route.group === routeGroup.id);
              if (groupRoutes.length === 0) {
                return null;
              }
              return (
                <section
                  key={routeGroup.id}
                  className="mf-sitemap__group"
                  aria-labelledby={`${baseId}-${routeGroup.id}`}
                >
                  <h2 className="mf-sitemap__group-title" id={`${baseId}-${routeGroup.id}`}>
                    {routeGroup.label}
                  </h2>
                  <ul className="mf-sitemap__list">
                    {groupRoutes.map((route) => {
                      const isSelected = route.id === selectedId;
                      return (
                        <li
                          key={route.id}
                          style={{ paddingInlineStart: `${depthOf(route, byId) * 1.1}rem` }}
                        >
                          <button
                            type="button"
                            className={`mf-sitemap__node${
                              isSelected ? ' mf-sitemap__node--selected' : ''
                            }`}
                            aria-pressed={isSelected}
                            aria-describedby={isSelected ? detailId : undefined}
                            onClick={() => setSelectedId(route.id)}
                          >
                            <span className="mf-sitemap__node-label">{route.label}</span>
                            <code className="mf-sitemap__node-path">{route.href}</code>
                            <span
                              className={`mf-sitemap__badge mf-sitemap__badge--${route.status}`}
                            >
                              {STATUS_LABELS[route.status]}
                            </span>
                            {route.access === 'authenticated' ? (
                              <span className="mf-sitemap__badge mf-sitemap__badge--locked">
                                Sign-in required
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <aside className="mf-card mf-sitemap__detail" aria-labelledby={`${baseId}-detail-title`}>
          <p className="mf-section__eyebrow">Route details</p>
          {selected ? (
            <div id={detailId} aria-live="polite">
              <h2 className="mf-card__title" id={`${baseId}-detail-title`}>
                {selected.label}
              </h2>
              <p className="mf-sitemap__detail-path">
                <code>{selected.href}</code>
              </p>
              <dl className="mf-sitemap__facts">
                <div>
                  <dt>Area</dt>
                  <dd>{GROUP_LABELS[selected.group]}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>
                    {selected.access === 'public'
                      ? 'Anyone'
                      : 'Signed-in users only — enforced by the API'}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{STATUS_LABELS[selected.status]}</dd>
                </div>
                {selected.parentId ? (
                  <div>
                    <dt>Parent</dt>
                    <dd>{byId.get(selected.parentId)?.label ?? selected.parentId}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mf-sitemap__detail-text">{selected.description}</p>
              {selected.availabilityNote ? (
                <p className="mf-doc__note">{selected.availabilityNote}</p>
              ) : null}
              {target ? (
                <Link className="mf-btn mf-btn--primary" href={target.href}>
                  Open {selected.label}
                </Link>
              ) : (
                <p className="mf-sitemap__detail-unavailable">
                  {selected.dynamic
                    ? 'This page needs a specific record id, so it opens from its parent page.'
                    : 'This destination is not available yet.'}
                </p>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <details className="mf-sitemap__text-list">
        <summary>Text list of all routes</summary>
        <p className="mf-doc__note">
          A plain, non-interactive list with the same information for keyboard and screen-reader
          users.
        </p>
        <ul>
          {filtered.map((route) => (
            <li key={route.id}>
              <strong>{route.label}</strong> — <code>{route.href}</code> (
              {GROUP_LABELS[route.group]}, {STATUS_LABELS[route.status]},{' '}
              {route.access === 'public' ? 'anyone' : 'signed-in users only'})
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
