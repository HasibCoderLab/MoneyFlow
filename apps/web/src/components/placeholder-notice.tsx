type PlaceholderNoticeProps = {
  readonly sectionName: string;
  readonly plannedScope: string;
};

/**
 * Honest placeholder body for sections that exist in navigation but have
 * no implementation yet. States plainly that nothing works here and
 * nothing is connected (AGENTS.md rule 12).
 */
export function PlaceholderNotice({ sectionName, plannedScope }: PlaceholderNoticeProps) {
  return (
    <div className="mf-placeholder" data-testid="placeholder-notice">
      <h1>{sectionName}</h1>
      <p>
        <strong>This section is a navigation placeholder in the UI preview.</strong> No{' '}
        {sectionName.toLowerCase()} data, functionality, or screens exist yet — there is nothing to
        fill in or click here beyond navigation.
      </p>
      <p>Planned scope: {plannedScope}</p>
      <p>Everything in this preview is sample data until the backend phases are built.</p>
    </div>
  );
}
