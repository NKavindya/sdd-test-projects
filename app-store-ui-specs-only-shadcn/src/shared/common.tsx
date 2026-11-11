import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PackageOpen, ShieldX, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" />
    </div>
  );
}
export function Empty({
  firmware = false,
  title,
  description,
}: {
  firmware?: boolean;
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="status-panel">
      <PackageOpen size={100} strokeWidth={1} className="text-slate-300" />
      <h2>
        {t(title || (firmware ? 'No firmware uploaded' : 'No apps, yet.'))}
      </h2>
      <p>
        {t(
          description ||
            (firmware
              ? 'Once the administrator uploads firmware, it will appear here.'
              : 'No apps available, yet! When the administration uploads, apps will show up here.'),
        )}
      </p>
    </div>
  );
}
export function Forbidden({
  message = "You don't have permission to view apps.",
}: {
  message?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="status-panel">
      <ShieldX size={90} className="text-slate-300" />
      <h1>403</h1>
      <p>{t(message)}</p>
      <p>
        {t(
          'We are sorry, You do not have access to this page or resources for some reason.',
        )}
      </p>
    </div>
  );
}
export function Stars({
  value = 0,
  onChange,
}: {
  value?: number;
  onChange?: (n: number) => void;
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} stars`}
            onClick={() => onChange(n)}
          >
            <Star
              size={22}
              fill={n <= value ? '#ffa940' : 'none'}
              color={n <= value ? '#ffa940' : '#cbd5e1'}
            />
          </button>
        ) : (
          <Star
            key={n}
            size={14}
            fill={n <= value ? '#ffa940' : '#cbd5e1'}
            color={n <= value ? '#ffa940' : '#cbd5e1'}
          />
        ),
      )}
    </span>
  );
}
export function Confirm({
  message,
  onConfirm,
  onClose,
}: {
  message: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onOpenChange={onClose} title={t(message)}>
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          {t('Cancel')}
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('Done')}
        </Button>
      </div>
    </Modal>
  );
}
