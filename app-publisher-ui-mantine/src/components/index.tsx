import {
  Alert,
  Avatar,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronRight, IconLock, IconPackage } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorText, mediaUrl, showError } from "../services/api";
export function PermissionResult() {
  const { t } = useTranslation();
  return (
    <Center mih={400}>
      <Stack align="center">
        <IconLock size={54} color="#4288BA" />
        <Title order={2}>{t("Permission required")}</Title>
        <Text c="dimmed">
          {t("Contact your administrator to request access to this page.")}
        </Text>
      </Stack>
    </Center>
  );
}
export function Empty({
  text = "No data",
  action,
}: {
  text?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Center mih={160}>
      <Stack align="center" gap={8}>
        <IconPackage size={42} stroke={1} color="#b8bfc5" />
        <Text c="dimmed" size="sm">
          {t(text)}
        </Text>
        {action}
      </Stack>
    </Center>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert color="red" title="Unable to load data" my="md">
      {errorText(error)}
      {retry && (
        <Button variant="light" size="xs" mt="sm" onClick={retry}>
          Retry
        </Button>
      )}
    </Alert>
  );
}
export function Busy() {
  return (
    <Center mih={180}>
      <Loader size="sm" />
    </Center>
  );
}
export function AppIcon({
  path,
  name,
  size = 42,
}: {
  path?: string;
  name?: string;
  size?: number;
}) {
  return (
    <Avatar
      src={mediaUrl(path)}
      name={name}
      color="#4288BA"
      size={size}
      radius={10}
    >
      <IconPackage size={size / 2} />
    </Avatar>
  );
}
export function Tags({
  values = [],
  color = "blue",
}: {
  values?: string[];
  color?: string;
}) {
  return (
    <Group gap={6}>
      {values.map((value) => (
        <Badge
          key={value}
          radius={3}
          variant="filled"
          color={color}
          size="sm"
          tt="none"
          fw={400}
        >
          {value}
        </Badge>
      ))}
    </Group>
  );
}
export function ConfirmAction({
  opened,
  title,
  message,
  onClose,
  onConfirm,
  danger = true,
}: {
  opened: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) {
          setError(undefined);
          onClose();
        }
      }}
      title={title}
      centered
    >
      <Text size="sm">{message}</Text>
      {!!error && <Failure error={error} />}
      <Group justify="flex-end" mt="xl">
        <Button variant="default" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          color={danger ? "red" : undefined}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(undefined);
            try {
              await onConfirm();
              onClose();
            } catch (failure) {
              setError(failure);
              showError(failure);
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm
        </Button>
      </Group>
    </Modal>
  );
}
export const Forward = () => <IconChevronRight size={14} />;

export { EntgraPageHeader } from "./EntgraPageHeader";
export { EntgraTable } from "./EntgraTable";
