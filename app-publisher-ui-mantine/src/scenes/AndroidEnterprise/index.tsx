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
  Box,
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Stepper,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { EntgraPageHeader } from "../../components";
import IntegrationPermission from "../../components/IntegrationPermission";
import { ApiError } from "../../services/api";
import {
  enterpriseResultKey,
  integrationAccess,
} from "../../services/platformContracts";
import { platformApi } from "../../services/platformIntegrations";
import { useSession } from "../../services/session";
import "./styles.css";
export default function AndroidEnterprise() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { scopes, androidEnterpriseToken } = useSession();
  const [packageName, setPackageName] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    packageName: string;
  }>();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  if (!integrationAccess(scopes, androidEnterpriseToken).androidImport)
    return <IntegrationPermission android />;
  const sync = async () => {
    if (pending.current) return;
    const value = packageName.trim();
    if (!value) {
      setInvalid(true);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setInvalid(false);
    try {
      await platformApi.importAndroidPackage(value, controller.signal);
      if (controller.signal.aborted) return;
      setResult({ status: 200, packageName: value });
      notifications.show({ message: t("ae.syncSuccess"), color: "green" });
    } catch (error) {
      if (!controller.signal.aborted)
        setResult({
          status: error instanceof ApiError ? error.status : 0,
          packageName: value,
        });
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
        title={t("ae.title")}
        crumbs={[{ label: t("ae.title") }]}
        description={t("ae.description")}
      />
      <Box className="ae-import-content">
        <Stepper active={result ? 1 : 0} mb="xl" size="sm">
          <Stepper.Step label={t("platform.application")} />
          <Stepper.Step label={t("platform.result")} />
        </Stepper>
        <Paper withBorder p="xl" radius="md">
          {result ? (
            <Center mih={240}>
              <Stack align="center" ta="center">
                <ThemeIcon
                  size={72}
                  radius="xl"
                  color={result.status === 200 ? "green" : "red"}
                >
                  {result.status === 200 ? (
                    <IconCheck size={44} />
                  ) : (
                    <IconX size={44} />
                  )}
                </ThemeIcon>
                <Title order={2}>
                  {t(enterpriseResultKey(result.status), {
                    package: result.packageName,
                  })}
                </Title>
                {result.status === 200 ? (
                  <Button onClick={() => navigate("/apps")}>
                    {t("platform.goToApplications")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => setResult(undefined)}
                  >
                    {t("platform.back")}
                  </Button>
                )}
              </Stack>
            </Center>
          ) : (
            <Box
              component="form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void sync();
              }}
              className="ae-package-form"
            >
              <TextInput
                required
                label={t("ae.packageLabel")}
                placeholder="com.bng.calculator"
                value={packageName}
                onChange={(event) => {
                  setPackageName(event.target.value);
                  setInvalid(false);
                }}
                error={invalid ? t("ae.packageRequired") : undefined}
                disabled={busy}
              />
              <Group justify="center" mt="lg">
                <Button type="submit" loading={busy}>
                  {t(busy ? "ae.syncing" : "platform.next")}
                </Button>
              </Group>
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
}
