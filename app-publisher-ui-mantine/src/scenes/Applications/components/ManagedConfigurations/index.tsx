/*
 * Copyright (C) 2018 - 2024 Entgra (Pvt) Ltd, Inc - All Rights Reserved.
 *
 * Unauthorised copying/redistribution of this file, via any medium is strictly prohibited.
 *
 * Licensed under the Entgra Commercial License, Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       https://entgra.io/licenses/entgra-commercial/1.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Alert, Box, Button, Group, Loader, Modal, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../../../services/api";
import {
  loadManagedConfigurationClient,
  type ManagedConfigFrame,
} from "../../../../services/googleManagedConfigurations";
import {
  managedConfigurationEvent,
  managedConfigurationUrl,
} from "../../../../services/platformContracts";
import { platformApi } from "../../../../services/platformIntegrations";
export default function ManagedConfigurations({
  token,
  packageName,
  onClose,
  onUnavailable,
  onReady,
}: {
  token: string;
  packageName: string;
  onClose: () => void;
  onUnavailable: () => void;
  onReady: () => void;
}) {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onUnavailable, onReady });
  callbacks.current = { onUnavailable, onReady };
  useEffect(() => {
    const controller = new AbortController();
    let frame: ManagedConfigFrame | undefined;
    let currentId: string | undefined;
    let operations = Promise.resolve();
    setLoading(true);
    setError(false);
    const mutation = (event: unknown, deleting: boolean) => {
      // Google events can arrive together. Serialize persistence so create is followed by PUT, not a second POST.
      operations = operations.then(async () => {
        if (controller.signal.aborted) return;
        setSaving(true);
        try {
          const config = managedConfigurationEvent(event);
          if (deleting) {
            await platformApi.deleteManagedConfiguration(
              config.mcmId,
              controller.signal,
            );
            currentId = undefined;
          } else {
            await platformApi.saveManagedConfiguration(
              !!currentId,
              { mcmId: config.mcmId, profileName: config.name, packageName },
              controller.signal,
            );
            currentId = config.mcmId;
          }
          if (!controller.signal.aborted)
            notifications.show({
              message: t(
                deleting ? "ae.managedDeleteSuccess" : "ae.managedSaveSuccess",
              ),
              color: "green",
            });
        } catch (failure) {
          if (!controller.signal.aborted)
            notifications.show({
              title: t("ae.managedSaveError"),
              message:
                failure instanceof ApiError
                  ? failure.message
                  : t("ae.managedInvalidEvent"),
              color: "red",
            });
        } finally {
          if (!controller.signal.aborted) setSaving(false);
        }
      });
    };
    (async () => {
      try {
        const existing = await platformApi.managedConfiguration(
          packageName,
          controller.signal,
        );
        if (existing?.mcmId && typeof existing.mcmId !== "string")
          throw new Error("Invalid managed configuration");
        currentId = existing?.mcmId;
        const client = await loadManagedConfigurationClient();
        if (controller.signal.aborted || !container.current) return;
        frame = client.getContext().openChild({
          url: managedConfigurationUrl(token, packageName, currentId),
          where: container.current,
          attributes: {
            style: "width:100%;height:600px;border:0",
            scrolling: "yes",
            title: t("ae.managedConfigurations"),
          },
        });
        frame.register(
          "onconfigupdated",
          (event) => mutation(event, false),
          client.CROSS_ORIGIN_IFRAMES_FILTER,
        );
        frame.register(
          "onconfigdeleted",
          (event) => mutation(event, true),
          client.CROSS_ORIGIN_IFRAMES_FILTER,
        );
        callbacks.current.onReady();
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
          callbacks.current.onUnavailable();
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
      frame?.close();
    };
  }, [token, packageName, attempt, t]);
  return (
    <Modal
      opened
      onClose={() => !saving && onClose()}
      closeOnEscape={!saving}
      closeOnClickOutside={!saving}
      closeButtonProps={{ disabled: saving, "aria-label": t("platform.close") }}
      centered
      size={900}
      title={t("ae.managedConfigurations")}
    >
      {loading && (
        <Group p="xl">
          <Loader size="sm" />
          <Text>{t("platform.loading")}</Text>
        </Group>
      )}
      {error && (
        <Alert color="red" title={t("ae.managedLoadError")}>
          <Text size="sm">{t("ae.managedUnavailable")}</Text>
          <Button
            mt="sm"
            variant="light"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("platform.retry")}
          </Button>
        </Alert>
      )}
      {saving && (
        <Group p="sm">
          <Loader size="xs" />
          <Text size="sm">{t("ae.managedSaving")}</Text>
        </Group>
      )}
      <Box ref={container} mih={error ? 0 : 300} />
    </Modal>
  );
}
