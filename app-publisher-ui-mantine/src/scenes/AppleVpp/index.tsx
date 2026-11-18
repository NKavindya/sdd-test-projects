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
import {
  Alert,
  Anchor,
  AspectRatio,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EntgraPageHeader } from "../../components";
import IntegrationPermission from "../../components/IntegrationPermission";
import { platformApi } from "../../services/platformIntegrations";
import { VPP_SYNC } from "../../services/platformContracts";
import { useSession } from "../../services/session";
export default function AppleVpp() {
  const { t } = useTranslation();
  const { has } = useSession();
  const permitted = has(VPP_SYNC);
  const canReadMetadata = permitted && has("dm:metadata:view");
  const [metadata, setMetadata] = useState<unknown>();
  const [loading, setLoading] = useState(canReadMetadata);
  const [metadataFailed, setMetadataFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    setMetadata(undefined);
    setMetadataFailed(false);
    if (!canReadMetadata) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    platformApi
      .depMetadata(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMetadata(data?.metaValue);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMetadataFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canReadMetadata, attempt]);
  useEffect(() => () => pending.current?.abort(), []);
  if (!permitted) return <IntegrationPermission />;
  const sync = async () => {
    if (pending.current || !metadata || !canReadMetadata) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      await platformApi.syncVpp(controller.signal);
      if (!controller.signal.aborted)
        notifications.show({ message: t("vpp.syncSuccess"), color: "green" });
    } catch {
      if (!controller.signal.aborted)
        notifications.show({ message: t("vpp.syncError"), color: "red" });
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <>
      <EntgraPageHeader
        title={t("vpp.title")}
        crumbs={[{ label: t("vpp.title") }]}
      />
      <Stack p={{ base: "md", sm: 40 }} gap="md">
        <Text size="sm">{t("vpp.intro")}</Text>
        <Text size="sm">{t("vpp.followUp")}</Text>
        <Paper withBorder p="xl">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Stack gap="xl">
              <Stack gap="sm">
                <Title order={4}>{t("vpp.purchaseTitle")}</Title>
                <Text size="sm">{t("vpp.purchaseBody")}</Text>
                <Text size="sm">
                  {t("vpp.visit")}{" "}
                  <Anchor
                    href="https://business.apple.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("vpp.businessManager")}
                  </Anchor>
                </Text>
              </Stack>
              <Stack gap="sm">
                <Title order={4}>{t("vpp.importTitle")}</Title>
                <Text size="sm">{t("vpp.importBody")}</Text>
                {loading && (
                  <Group>
                    <Loader size="xs" />
                    <Text size="sm">{t("vpp.loadingMetadata")}</Text>
                  </Group>
                )}
                {metadataFailed && (
                  <Alert color="red" title={t("vpp.metadataError")}>
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => setAttempt((value) => value + 1)}
                    >
                      {t("platform.retry")}
                    </Button>
                  </Alert>
                )}
                {!!metadata && canReadMetadata && (
                  <Button
                    w="fit-content"
                    loading={busy}
                    onClick={() => void sync()}
                  >
                    {t("vpp.syncApps")}
                  </Button>
                )}
              </Stack>
            </Stack>
            <AspectRatio ratio={16 / 9}>
              <Box
                component="iframe"
                title={t("vpp.tutorial")}
                src="https://www.youtube.com/embed/Fi9_TjJkEDY"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ border: 0, borderRadius: 4 }}
              />
            </AspectRatio>
          </SimpleGrid>
        </Paper>
      </Stack>
    </>
  );
}
