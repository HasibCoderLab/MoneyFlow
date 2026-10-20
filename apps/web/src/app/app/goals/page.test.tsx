import type { GoalResponse } from '@moneyflow/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/goals',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    fetchGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    moveGoal: vi.fn(),
  };
});

import { ApiClientError, createGoal, deleteGoal, fetchGoals, moveGoal } from '@/lib/api-client';
import GoalsPage from './page';

const mockedFetchGoals = vi.mocked(fetchGoals);
const mockedCreateGoal = vi.mocked(createGoal);
const mockedDeleteGoal = vi.mocked(deleteGoal);
const mockedMoveGoal = vi.mocked(moveGoal);

function goalFixture(overrides: Partial<GoalResponse> = {}): GoalResponse {
  return {
    id: 'goal-1',
    name: 'Emergency fund',
    type: 'EMERGENCY_FUND',
    currency: 'BDT',
    targetMinor: '3000000',
    startDate: '2026-10-01',
    deadline: '2027-03-31',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    figures: {
      savedMinor: '800000',
      remainingMinor: '2200000',
      percentTimes10: '267',
      overfunded: false,
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('goals route (wired to the IT-10 goal endpoints)', () => {
  beforeEach(() => {
    mockedFetchGoals.mockReset();
    mockedCreateGoal.mockReset();
    mockedDeleteGoal.mockReset();
    mockedMoveGoal.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders server-computed progress, the deadline, and a detail link', async () => {
    mockedFetchGoals.mockResolvedValue([goalFixture()]);
    render(<GoalsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Savings goals' })).toBeTruthy();
    // includeArchived=true keeps archived history visible with its chip.
    expect(mockedFetchGoals).toHaveBeenCalledWith(true);

    expect(screen.getByText('BDT 8,000 of BDT 30,000 tracked')).toBeTruthy();
    expect(screen.getByText('26.7% of target')).toBeTruthy();
    expect(screen.getByText('BDT 22,000 remaining')).toBeTruthy();
    expect(screen.getByText('Deadline Mar 31, 2027')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View details' }).getAttribute('href')).toBe(
      '/app/goals/goal-1',
    );
    // Real data — the sample-data banner must not label it otherwise.
    expect(screen.queryByText(/UI preview — sample data/)).toBeNull();
  });

  it('shows overfunding truthfully: exact percentage above 100 and a negative remainder', async () => {
    mockedFetchGoals.mockResolvedValue([
      goalFixture({
        figures: {
          savedMinor: '3600000',
          remainingMinor: '-600000',
          percentTimes10: '1200',
          overfunded: true,
        },
      }),
    ]);
    render(<GoalsPage />);

    expect(await screen.findByText('BDT 6,000 over target')).toBeTruthy();
    expect(screen.getByText('120% of target')).toBeTruthy();
    // The fill caps at 100 while the text keeps the real value.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows the honest empty state and offers creation and the preset', async () => {
    mockedFetchGoals.mockResolvedValue([]);
    render(<GoalsPage />);

    expect(await screen.findByText('No goals yet.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: 'New goal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Emergency-fund preset' })).toBeTruthy();
  });

  it('asks a signed-out visitor to sign in instead of showing figures', async () => {
    mockedFetchGoals.mockRejectedValue(new ApiClientError('Unauthorized', 401));
    render(<GoalsPage />);

    expect(await screen.findByText('Sign in to see your data')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('offers a retry after a failure and renders the loaded goals', async () => {
    mockedFetchGoals
      .mockRejectedValueOnce(new ApiClientError('Server exploded', 500))
      .mockResolvedValueOnce([goalFixture()]);
    render(<GoalsPage />);

    expect(await screen.findByText('Could not load your data')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('BDT 8,000 of BDT 30,000 tracked')).toBeTruthy();
    expect(mockedFetchGoals).toHaveBeenCalledTimes(2);
  });

  it('validates the create form locally and posts canonical decimal values', async () => {
    mockedFetchGoals.mockResolvedValue([]);
    mockedCreateGoal.mockResolvedValue(goalFixture());
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'New goal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByText('Enter a goal name.')).toBeTruthy();
    expect(screen.getByText('Enter a target like 30000 or 30000.50.')).toBeTruthy();
    expect(mockedCreateGoal).not.toHaveBeenCalled();

    // Labels also hold their inline error text, so match on the leading name.
    fireEvent.change(screen.getByLabelText(/^Goal name/), {
      target: { value: ' New laptop ' },
    });
    fireEvent.change(screen.getByLabelText(/^Target amount/), { target: { value: '48000.50' } });
    fireEvent.change(screen.getByLabelText(/^Deadline/), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByText('The deadline cannot be before the start date.')).toBeTruthy();
    expect(mockedCreateGoal).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Deadline/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));

    await waitFor(() => {
      expect(mockedCreateGoal).toHaveBeenCalledWith({
        name: 'New laptop',
        type: 'GENERAL',
        target: '48000.50',
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        priority: 'MEDIUM',
      });
    });
    await waitFor(() => expect(mockedFetchGoals).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Save goal' })).toBeNull();
  });

  it('pre-fills the emergency-fund preset but keeps the target editable', async () => {
    mockedFetchGoals.mockResolvedValue([]);
    mockedCreateGoal.mockResolvedValue(goalFixture({ type: 'EMERGENCY_FUND' }));
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Emergency-fund preset' }));

    expect((screen.getByLabelText('Goal name') as HTMLInputElement).value).toBe('Emergency fund');
    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('EMERGENCY_FUND');
    expect((screen.getByLabelText(/^Target amount/) as HTMLInputElement).value).toBe('30000');
    // Labelled as a suggestion, not advice.
    expect(screen.getByText(/Suggested example target/)).toBeTruthy();

    // The user's own amount wins: the preset never overwrites it.
    fireEvent.change(screen.getByLabelText(/^Target amount/), { target: { value: '50000' } });
    expect((screen.getByLabelText(/^Target amount/) as HTMLInputElement).value).toBe('50000');

    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));

    await waitFor(() =>
      expect(mockedCreateGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EMERGENCY_FUND',
          name: 'Emergency fund',
          target: '50000',
        }),
      ),
    );
  });

  it('surfaces a server rejection above the form and keeps it open', async () => {
    mockedFetchGoals.mockResolvedValue([]);
    mockedCreateGoal.mockRejectedValue(new ApiClientError('Unknown field "targetMinor".', 400));
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'New goal' }));
    fireEvent.change(screen.getByLabelText(/^Goal name/), { target: { value: 'Goal' } });
    fireEvent.change(screen.getByLabelText(/^Target amount/), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Unknown field "targetMinor".',
    );
    expect(screen.getByRole('button', { name: 'Save goal' })).toBeTruthy();
  });

  it('pauses through the API and reloads the list', async () => {
    mockedFetchGoals.mockResolvedValue([goalFixture()]);
    mockedMoveGoal.mockResolvedValue(goalFixture({ status: 'PAUSED' }));
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Pause: Emergency fund' }));

    await waitFor(() => expect(mockedMoveGoal).toHaveBeenCalledWith('goal-1', 'pause'));
    await waitFor(() => expect(mockedFetchGoals).toHaveBeenCalledTimes(2));
  });

  it('keeps archived goals readable and offers unarchive instead of pause', async () => {
    mockedFetchGoals.mockResolvedValue([goalFixture({ status: 'ARCHIVED' })]);
    render(<GoalsPage />);

    expect(await screen.findByText('Archived')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unarchive' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause: Emergency fund' })).toBeNull();
  });

  it('deletes only after explicit confirmation', async () => {
    mockedFetchGoals.mockResolvedValue([goalFixture()]);
    mockedDeleteGoal.mockResolvedValue(undefined);
    render(<GoalsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete: Emergency fund' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mockedDeleteGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete goal' }));

    await waitFor(() => expect(mockedDeleteGoal).toHaveBeenCalledWith('goal-1'));
    await waitFor(() => expect(mockedFetchGoals).toHaveBeenCalledTimes(2));
  });
});
