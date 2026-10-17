import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './dialog';

describe('dialog primitive', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog open={false} title="Delete?" onClose={() => {}}>
        <button type="button">Confirm</button>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a labelled modal and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Delete?" description="This cannot be undone." onClose={onClose}>
        <button type="button">Confirm</button>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Delete?' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay dismissal but not on panel clicks', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(
      <Dialog open title="Delete?" onClose={onClose}>
        <button type="button">Confirm</button>
      </Dialog>,
    );
    const overlay = container.querySelector('.mf-dialog__overlay') as HTMLElement;
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <Dialog open={false} title="Delete?" onClose={onClose}>
        <button type="button">Confirm</button>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus into the dialog on open and restores it on close', () => {
    const onClose = vi.fn();
    const fragment = (open: boolean) => (
      <>
        <button type="button">Trigger</button>
        <Dialog open={open} title="Delete?" onClose={onClose}>
          <button type="button">Confirm</button>
        </Dialog>
      </>
    );
    const { rerender } = render(fragment(false));
    screen.getByRole('button', { name: 'Trigger' }).focus();
    rerender(fragment(true));
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    rerender(fragment(false));
    expect(document.activeElement?.textContent).toBe('Trigger');
  });
});
