import { InfoIcon } from '@/components/icons';
import { MOCK_DATA_DISCLAIMER } from '@/lib/mock-data';

/**
 * Prominent, accessible notice that everything in this build is sample
 * data. Rendered inside the app shell so it is visible on every preview
 * page (AGENTS.md rule 12: nothing fake may appear real).
 */
export function MockDataBanner() {
  return (
    <aside className="mf-mock-banner" role="note" aria-label="Preview data notice">
      <InfoIcon />
      <span>
        <strong>UI preview — sample data.</strong> {MOCK_DATA_DISCLAIMER} No account, bank, or API
        is connected.
      </span>
    </aside>
  );
}
