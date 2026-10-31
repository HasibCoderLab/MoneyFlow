'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';
import {
  ROUTE_GROUPS,
  ROUTES,
  linkTarget,
  type AppRouteMeta,
  type RouteGroup,
  type RouteStatus,
} from '@/lib/routes';

const STATUS_KEYS: Record<RouteStatus, TranslationKey> = {
  implemented: 'sitemap.status.implemented',
  planned: 'sitemap.status.planned',
  deferred: 'sitemap.status.deferred',
};

const GROUP_KEYS: Record<RouteGroup, TranslationKey> = ROUTE_GROUPS.reduce(
  (keys, group) => ({ ...keys, [group.id]: group.labelKey }),
  {} as Record<RouteGroup, TranslationKey>,
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

function matchesQuery(
  route: AppRouteMeta,
  query: string,
  t: (key: TranslationKey) => string,
): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${t(route.labelKey)} ${t(route.descriptionKey)} ${route.href} ${t(
    STATUS_KEYS[route.status],
  )}`;
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
  const { t } = useLocale();
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
          (group === 'all' || route.group === group) && matchesQuery(route, normalizedQuery, t),
      ),
    [group, normalizedQuery, t],
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
            {t('sitemap.searchLabel')}
          </label>
          <input
            id={`${baseId}-search`}
            className="mf-input"
            type="search"
            value={query}
            placeholder={t('sitemap.searchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mf-field mf-sitemap__filter">
          <label className="mf-field__label" htmlFor={`${baseId}-group`}>
            {t('sitemap.filterLabel')}
          </label>
          <select
            id={`${baseId}-group`}
            className="mf-input"
            value={group}
            onChange={(event) => setGroup(event.target.value as GroupFilter)}
          >
            <option value="all">{t('sitemap.allAreas')}</option>
            {ROUTE_GROUPS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
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
          {t('sitemap.reset')}
        </button>
      </div>

      <p className="mf-sitemap__count" id={resultsId} aria-live="polite">
        {t('sitemap.count', { shown: filtered.length, total: ROUTES.length })}
      </p>

      <ul className="mf-sitemap__legend" aria-label={t('sitemap.legend')}>
        {(Object.keys(STATUS_KEYS) as RouteStatus[]).map((status) => (
          <li key={status}>
            <span className={`mf-sitemap__badge mf-sitemap__badge--${status}`}>
              {t(STATUS_KEYS[status])}
            </span>
          </li>
        ))}
      </ul>

      <div className="mf-sitemap__layout">
        <div className="mf-sitemap__tree">
          {filtered.length === 0 ? (
            <div className="mf-empty">
              <p className="mf-empty__title">{t('sitemap.emptyTitle')}</p>
              <p className="mf-empty__text">{t('sitemap.emptyBody')}</p>
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
                    {t(routeGroup.labelKey)}
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
                            <span className="mf-sitemap__node-label">{t(route.labelKey)}</span>
                            <code className="mf-sitemap__node-path">{route.href}</code>
                            <span
                              className={`mf-sitemap__badge mf-sitemap__badge--${route.status}`}
                            >
                              {t(STATUS_KEYS[route.status])}
                            </span>
                            {route.access === 'authenticated' ? (
                              <span className="mf-sitemap__badge mf-sitemap__badge--locked">
                                {t('sitemap.signInRequired')}
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
          <p className="mf-section__eyebrow">{t('sitemap.detailsEyebrow')}</p>
          {selected ? (
            <div id={detailId} aria-live="polite">
              <h2 className="mf-card__title" id={`${baseId}-detail-title`}>
                {t(selected.labelKey)}
              </h2>
              <p className="mf-sitemap__detail-path">
                <code>{selected.href}</code>
              </p>
              <dl className="mf-sitemap__facts">
                <div>
                  <dt>{t('sitemap.area')}</dt>
                  <dd>{t(GROUP_KEYS[selected.group])}</dd>
                </div>
                <div>
                  <dt>{t('sitemap.access')}</dt>
                  <dd>
                    {selected.access === 'public' ? t('sitemap.anyone') : t('sitemap.signedIn')}
                  </dd>
                </div>
                <div>
                  <dt>{t('sitemap.status')}</dt>
                  <dd>{t(STATUS_KEYS[selected.status])}</dd>
                </div>
                {selected.parentId ? (
                  <div>
                    <dt>{t('sitemap.parent')}</dt>
                    <dd>
                      {byId.get(selected.parentId)
                        ? t(byId.get(selected.parentId)!.labelKey)
                        : selected.parentId}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="mf-sitemap__detail-text">{t(selected.descriptionKey)}</p>
              {selected.availabilityNoteKey ? (
                <p className="mf-doc__note">{t(selected.availabilityNoteKey)}</p>
              ) : null}
              {target ? (
                <Link className="mf-btn mf-btn--primary" href={target.href}>
                  {t('sitemap.open', { name: t(selected.labelKey) })}
                </Link>
              ) : (
                <p className="mf-sitemap__detail-unavailable">
                  {selected.dynamic ? t('sitemap.dynamicNote') : t('sitemap.unavailable')}
                </p>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <details className="mf-sitemap__text-list">
        <summary>{t('sitemap.textListSummary')}</summary>
        <p className="mf-doc__note">{t('sitemap.textListNote')}</p>
        <ul>
          {filtered.map((route) => (
            <li key={route.id}>
              <strong>{t(route.labelKey)}</strong> — <code>{route.href}</code> (
              {t(GROUP_KEYS[route.group])}, {t(STATUS_KEYS[route.status])},{' '}
              {route.access === 'public' ? t('sitemap.anyone') : t('sitemap.signedIn')})
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
