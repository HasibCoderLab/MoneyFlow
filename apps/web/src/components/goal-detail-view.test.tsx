import type { GoalDetailResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/goals/goal-1',
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchGoal: vi.fn(),
    addGoalContribution: vi.fn(),
    reverseGoalContribution: vi.fn(),
    moveGoal: vi.fn(),
    deleteGoal: vi.fn(),
  };
});

import {
  ApiClientError,
  addGoalContribution,
  deleteGoal,
  fetchGoal,
  reverseGoalContribution,
} from '@/lib/api-client';
import { GoalDetailView } from './goal-detail-view';

const mockedFetchGoal = vi.mocked(fetchGoal);
const mockedAdd = vi.mocked(addGoalContribution);
const mockedReverse = vi.mocked(reverseGoalContribution);
const mockedDelete = vi.mocked(deleteGoal);

const CONTRIBUTION_ID = 'c1c1c1c1-1111-4111-8111-111111111111';
const REVERSAL_ID = 'd2d2d2d2-2222-4222-8222-222222222222';

function detailFixture(overrides: Partial<GoalDetailResponse> = {}): GoalDetailResponse {
  return {
    id: 'goal-1',
    name: 'Emergency fund',
    type: 'EMERGENCY_FUND',
    currency: 'BDT',
    targetMinor: '3000000',
    startDate: '2026-10-01',
    deadline: null,
    priority: 'MEDIUM',
    status: 'ACTIVE',
    figures: {
      savedMinor: '800000',
      remainingMinor: '2200000',
      percentTimes10: '267',
      overfunded: false,
    },
    contributions: [
      {
        id: CONTRIBUTION_ID,
        goalId: 'goal-1',
        amountMinor: '800000',
        occurredAt: '2026-10-18T18:00:00.000Z',
        note: 'salary leftover',
        reversesContributionId: null,
        reversedByContributionId: null,
        createdAt: '2026-10-18T18:00:00.000Z',
      },
    ],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('goal detail (wired to the IT-10 ledger endpoints)', () => {
  beforeEach(() => {
    mockedFetchGoal.mockReset();
    mockedAdd.mockReset();
    mockedReverse.mockReset();
    mockedDelete.mockReset();
    push.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the goal, derived progress, and its ledger history', async () => {
    mockedFetchGoal.mockResolvedValue(
      detailFixture({
        contributions: [
          {
            id: REVERSAL_ID,
            goalId: 'goal-1',
            amountMinor: '-800000',
            occurredAt: '2026-10-19T06:00:00.000Z',
            note: null,
            reversesContributionId: CONTRIBUTION_ID,
            reversedByContributionId: null,
            createdAt: '2026-10-19T06:00:00.000Z',
          },
          {
            id: CONTRIBUTION_ID,
            goalId: 'goal-1',
            amountMinor: '800000',
            occurredAt: '2026-10-18T18:00:00.000Z',
            note: 'salary leftover',
            reversesContributionId: null,
            reversedByContributionId: REVERSAL_ID,
            createdAt: '2026-10-18T18:00:00.000Z',
          },
        ],
        figures: {
          savedMinor: '0',
          remainingMinor: '3000000',
          percentTimes10: '0',
          overfunded: false,
        },
      }),
    );
    render(<GoalDetailView goalId="goal-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Emergency fund' })).toBeTruthy();
    expect(screen.getByText('BDT 0 of BDT 30,000 tracked')).toBeTruthy();
    expect(screen.getByText('0% of target')).toBeTruthy();

    // Both ledger rows are visible: the reversal (negative) and the original.
    expect(screen.getByText('Reversal')).toBeTruthy();
    expect(screen.getByText('−BDT 8,000')).toBeTruthy();
    expect(screen.getByText('Contribution')).toBeTruthy();
    expect(screen.getByText('BDT 8,000')).toBeTruthy();
    expect(screen.getByText(/salary leftover/)).toBeTruthy();
    // The original was already reversed, so it offers no second reverse action.
    expect(screen.getByText('Already reversed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reverse:/ })).toBeNull();
  });

  it('adds a contribution through the API and reloads the server figures', async () => {
    mockedFetchGoal.mockResolvedValue(detailFixture());
    mockedAdd.mockResolvedValue({
      id: 'new-row',
      goalId: 'goal-1',
      amountMinor: '50000',
      occurredAt: '2026-10-20T00:00:00.000Z',
      note: null,
      reversesContributionId: null,
      reversedByContributionId: null,
      createdAt: '2026-10-20T00:00:00.000Z',
    });
    render(<GoalDetailView goalId="goal-1" />);

    fireEvent.change(await screen.findByLabelText(/^Contribution amount/), {
      target: { value: '500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add contribution' }));

    await waitFor(() => expect(mockedAdd).toHaveBeenCalledWith('goal-1', { amount: '500' }));
    await waitFor(() => expect(mockedFetchGoal).toHaveBeenCalledTimes(2));
    // The form clears after a successful append.
    expect((screen.getByLabelText(/^Contribution amount/) as HTMLInputElement).value).toBe('');
  });

  it('validates the contribution locally before calling the API', async () => {
    mockedFetchGoal.mockResolvedValue(detailFixture());
    render(<GoalDetailView goalId="goal-1" />);

    fireEvent.change(await screen.findByLabelText(/^Contribution amount/), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add contribution' }));

    expect(await screen.findByText('The contribution must be greater than zero.')).toBeTruthy();
    expect(mockedAdd).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Contribution amount/), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2099-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add contribution' }));

    expect(await screen.findByText('Choose today or an earlier date.')).toBeTruthy();
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it('reverses a contribution only after confirmation and shows the server message on conflict', async () => {
    mockedFetchGoal.mockResolvedValue(detailFixture());
    mockedReverse.mockRejectedValue(
      new ApiClientError('This contribution has already been reversed.', 409),
    );
    render(<GoalDetailView goalId="goal-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reverse: BDT 8,000' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mockedReverse).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reverse contribution' }));

    await waitFor(() => expect(mockedReverse).toHaveBeenCalledWith('goal-1', CONTRIBUTION_ID));
    expect(await screen.findByText('This contribution has already been reversed.')).toBeTruthy();
  });

  it('explains that contributions need an active goal and hides the form', async () => {
    mockedFetchGoal.mockResolvedValue(detailFixture({ status: 'PAUSED' }));
    render(<GoalDetailView goalId="goal-1" />);

    expect(
      await screen.findByText(/Contributions can only be added while the goal is active/),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add contribution' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Resume: Emergency fund' })).toBeTruthy();
  });

  it('deletes after confirmation and returns to the goals list', async () => {
    mockedFetchGoal.mockResolvedValue(detailFixture());
    mockedDelete.mockResolvedValue(undefined);
    render(<GoalDetailView goalId="goal-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mockedDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete goal' }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('goal-1'));
    expect(push).toHaveBeenCalledWith('/app/goals');
  });

  it('asks a signed-out visitor to sign in', async () => {
    mockedFetchGoal.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<GoalDetailView goalId="goal-1" />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
  });

  it('offers a retry after a failure', async () => {
    mockedFetchGoal
      .mockRejectedValueOnce(new ApiClientError('Server exploded', 500))
      .mockResolvedValueOnce(detailFixture());
    render(<GoalDetailView goalId="goal-1" />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Emergency fund' })).toBeTruthy();
    expect(mockedFetchGoal).toHaveBeenCalledTimes(2);
  });
});
