import { Button } from './Button';
import {
  Checkbox,
  Modal,
  Spinner,
  Tabs,
  toast,
  ComboBox,
  Input,
  ListBox,
  Label,
  EmptyState,
  Breadcrumbs,
} from '@heroui/react';
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Package, ShieldAlert, Star } from 'lucide-react';
import i18n from '../i18n';
export function problem(error: unknown, description?: string) {
  toast.danger(i18n.t('There was a problem'), {
    description: i18n.t(
      description || String(error instanceof Error ? error.message : error),
    ),
    timeout: 10000,
  });
}
export function done() {
  toast.success(i18n.t('Done!'), {
    description: i18n.t('Operation triggered!'),
  });
}
export function Loading() {
  return (
    <div className="loading">
      <Spinner aria-label="Loading" />
    </div>
  );
}
export function Check({
  children,
  value,
  onChange,
  disabled = false,
}: {
  children?: ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Checkbox
      slot={null}
      aria-label={children ? undefined : 'Select row'}
      isSelected={value}
      onChange={onChange}
      isDisabled={disabled}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {children && <Label>{children}</Label>}
      </Checkbox.Content>
    </Checkbox>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: {
  label: string;
  options: { id: string; label: ReactNode; text?: string }[];
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <ComboBox
      aria-label={label}
      autoFocus={autoFocus}
      selectedKey={value || null}
      onSelectionChange={(k) => k !== null && onChange(String(k))}
      isDisabled={disabled}
      menuTrigger="focus"
    >
      <ComboBox.InputGroup>
        <Input placeholder={label} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item
              key={o.id}
              id={o.id}
              textValue={o.text || String(o.label)}
            >
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
export function TabBar({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(k) => onChange(String(k))}
      className="tabbar"
    >
      <Tabs.List aria-label="Tabs">
        {items.map((o) => (
          <Tabs.Tab key={o.id} id={o.id}>
            {t(o.label)}
            <Tabs.Indicator />
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  return (
    <Modal isOpen={open} onOpenChange={(v) => !v && onClose()}>
      <Modal.Backdrop>
        <Modal.Container className={wide ? 'wide-dialog' : ''} scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            {footer && <Modal.Footer>{footer}</Modal.Footer>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  label = 'Done',
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => Promise<void> | void;
  label?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <span className="confirm-trigger" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          isDisabled={disabled}
          onPress={() => setOpen(true)}
        >
          {children}
        </Button>
      </span>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={title}
        footer={
          <>
            <Button
              variant="secondary"
              isDisabled={busy}
              onPress={() => setOpen(false)}
            >
              {t(label === 'Yes' ? 'No' : 'Cancel')}
            </Button>
            <Button
              isPending={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch {
                  /* the caller reports its operation failure */
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(label)}
            </Button>
          </>
        }
      >
        {title}
      </Dialog>
    </>
  );
}
export function Empty({
  title,
  description,
  permission = false,
}: {
  title: string;
  description?: string;
  permission?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState className={'empty ' + (permission ? 'permission' : '')}>
      <div className="empty-art">
        {permission ? <ShieldAlert size={64} /> : <Package size={64} />}
      </div>
      {permission && <strong className="code">403</strong>}
      <h2>{t(title)}</h2>
      {description && <p>{t(description)}</p>}
    </EmptyState>
  );
}
export function Forbidden({
  message = "You don't have permission to view apps.",
}: {
  message?: string;
}) {
  return (
    <Empty
      permission
      title={message}
      description="We are sorry, You do not have access to this page or resources for some reason."
    />
  );
}
export function Crumbs({
  items = [],
}: {
  items?: { label: string; to?: string; state?: object }[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deviceType } = useParams();
  return (
    <Breadcrumbs aria-label="Breadcrumb" className="crumbs" separator="/">
      <Breadcrumbs.Item
        onPress={() =>
          navigate(deviceType ? `/${deviceType}/applications` : '/')
        }
      >
        <Home size={14} />
        {t('Home')}
      </Breadcrumbs.Item>
      {items.map((item, i) => (
        <Breadcrumbs.Item
          key={i}
          onPress={
            item.to
              ? () => navigate(item.to!, { state: item.state })
              : undefined
          }
        >
          {t(item.label)}
        </Breadcrumbs.Item>
      ))}
    </Breadcrumbs>
  );
}
export function Stars({
  rating = 0,
  onChange,
}: {
  rating?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <span className="stars" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <Button
            key={n}
            isIconOnly
            variant="ghost"
            aria-label={String(n)}
            onPress={() => onChange(n)}
          >
            <Star size={22} fill={n <= rating ? '#ffa940' : 'none'} />
          </Button>
        ) : (
          <Star
            key={n}
            size={13}
            fill={n <= rating ? '#ffa940' : '#ced8e7'}
            strokeWidth={0}
          />
        ),
      )}
    </span>
  );
}
