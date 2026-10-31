'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ApiClientError, deleteMyAccount, downloadTransactionsCsv } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Real data controls (IT-12, ADR-0011). Both actions call the authenticated
 * API — there is no fixture download, optimistic success message, or hidden
 * delete. The export is streamed by the server; the deletion requires the
 * current password plus the exact phrase `DELETE` and ends every session.
 */

/** CSV export control. The API names the file; the browser downloads its bytes. */
export function ExportTransactionsControl() {
  const { t } = useLocale();
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const runExport = async () => {
    setFeedback(null);
    setExporting(true);
    try {
      const { blob, filename } = await downloadTransactionsCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setFeedback({
        tone: 'success',
        text: t('data.exportStarted', { filename }),
      });
    } catch (failure) {
      setFeedback({
        tone: 'error',
        text: failure instanceof ApiClientError ? failure.message : t('data.exportError'),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mf-form__actions">
      <Button onClick={() => void runExport()} disabled={exporting}>
        {exporting ? t('data.exporting') : t('data.exportButton')}
      </Button>
      <p className="mf-field__hint">{t('data.exportHint')}</p>
      {feedback ? (
        <p
          className={feedback.tone === 'error' ? 'mf-field__error' : 'mf-field__hint'}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}

/** Permanent account deletion with password re-entry and an exact phrase. */
export function DeleteAccountControl() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  // ADR-0011: after success, return to the public landing page. The short
  // pause lets the confirmed-deletion message be read; the link below works
  // immediately and the stale cookie is already unusable server-side.
  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => window.location.assign('/'), 3000);
    return () => clearTimeout(timer);
  }, [deleted]);

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setPassword('');
    setConfirmation('');
    setError(null);
  };

  const runDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setDeleting(true);
    try {
      await deleteMyAccount({ password, confirmation });
      setPassword('');
      setConfirmation('');
      setOpen(false);
      setDeleted(true);
    } catch (failure) {
      setPassword('');
      setError(failure instanceof ApiClientError ? failure.message : t('data.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="mf-empty" role="status" aria-live="polite">
        <p className="mf-empty__title">{t('data.deletedTitle')}</p>
        <p className="mf-empty__text">{t('data.deletedBody')}</p>
        <a className="mf-btn mf-btn--primary" href="/">
          {t('data.returnHome')}
        </a>
        <p className="mf-field__hint">{t('data.returning')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mf-form__actions">
        <Button variant="danger" onClick={() => setOpen(true)}>
          {t('data.deleteButton')}
        </Button>
        <p className="mf-field__hint">{t('data.deleteHint')}</p>
      </div>

      <Dialog
        open={open}
        title={t('data.deleteDialogTitle')}
        description={t('data.deleteDialogBody')}
        onClose={close}
      >
        <form className="mf-form" noValidate onSubmit={runDelete}>
          <div className="mf-field">
            <label className="mf-field__label" htmlFor="delete-password">
              {t('data.currentPassword')}
            </label>
            <input
              id="delete-password"
              className="mf-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="mf-field">
            <label className="mf-field__label" htmlFor="delete-confirmation">
              {t('data.confirmLabel')}
            </label>
            <input
              id="delete-confirmation"
              className="mf-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-describedby="delete-confirmation-hint"
            />
            <p id="delete-confirmation-hint" className="mf-field__hint">
              {t('data.confirmHint')}
            </p>
          </div>

          {error ? (
            <p className="mf-field__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={close} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={deleting || password.length === 0 || confirmation !== 'DELETE'}
            >
              {deleting ? t('data.deleting') : t('data.deleteConfirmButton')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
