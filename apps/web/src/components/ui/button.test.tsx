import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('button primitive', () => {
  it('renders a primary button by default', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.className).toContain('mf-btn--primary');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('supports the ghost variant and submit type', () => {
    render(
      <Button variant="ghost" type="submit">
        Cancel
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.className).toContain('mf-btn--ghost');
    expect(button.getAttribute('type')).toBe('submit');
  });

  it('does not fire while disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
