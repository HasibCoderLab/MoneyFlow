import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { GoalDetailView } from '@/components/goal-detail-view';

export const metadata: Metadata = {
  title: 'Goal details — MoneyFlow',
  description: 'A savings goal, its contribution ledger, and derived progress.',
};

/**
 * Goal detail route (requirements.md §4.3, §5.8). `goalId` is validated by
 * the API on every request; the view shows loading, signed-out, and
 * error/retry states and always reloads the server's exact progress after a
 * contribution, reversal, or lifecycle move.
 */
export default async function GoalDetailPage({
  params,
}: {
  readonly params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;
  return (
    <AppShell>
      <GoalDetailView goalId={goalId} />
    </AppShell>
  );
}
