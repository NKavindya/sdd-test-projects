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
  Box,
  Button,
  Group,
  Loader,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { EntgraPageHeader } from "../../components";
import IntegrationPermission from "../../components/IntegrationPermission";
import { useResource } from "../../services/hooks";
import { AE_VIEW } from "../../services/platformContracts";
import { platformApi } from "../../services/platformIntegrations";
import { useSession } from "../../services/session";
export default function AndroidEnterprisePage() {
  const { t } = useTranslation();
  const { pageName, pageId } = useParams();
  const { has } = useSession();
  const [page, setPage] = useState(1);
  const allowed = has(AE_VIEW);
  const resource = useResource(
    () => platformApi.playSyncedApps(page),
    [page, pageId],
    allowed && has("am:pub:app:view"),
  );
  if (!allowed) return <IntegrationPermission android />;
  return (
    <>
      <EntgraPageHeader
        title={t("ae.pageEditor")}
        crumbs={[
          { label: t("Android Enterprise") },
          { label: pageName || t("ae.pageEditor") },
        ]}
      />
      <Stack p="xl">
        <Title order={3}>{pageName}</Title>
        <Alert color="yellow" title={t("ae.layoutUnavailable")}>
          {t("ae.layoutUnavailableHelp")}
        </Alert>
        <Paper withBorder p="lg">
          <Title order={4} mb="lg">
            {t("ae.syncedApps")}
          </Title>
          {!has("am:pub:app:view") ? (
            <Text>{t("platform.cataloguePermission")}</Text>
          ) : resource.loading ? (
            <Group>
              <Loader size="sm" />
              <Text>{t("platform.loading")}</Text>
            </Group>
          ) : resource.error ? (
            <Alert color="red" title={t("platform.loadError")}>
              <Button variant="light" onClick={resource.reload}>
                {t("platform.retry")}
              </Button>
            </Alert>
          ) : resource.data?.applications.length ? (
            <>
              <Box style={{ overflowX: "auto" }}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("platform.application")}</Table.Th>
                      <Table.Th>{t("ae.packageLabel")}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {resource.data.applications.map((app) => (
                      <Table.Tr key={app.id}>
                        <Table.Td>{app.name}</Table.Td>
                        <Table.Td>
                          {app.packageName ||
                            app.applicationReleases?.[0]?.packageName}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
              <Pagination
                mt="md"
                value={page}
                onChange={setPage}
                total={Math.max(
                  1,
                  Math.ceil((resource.data.pagination?.count || 0) / 10),
                )}
              />
            </>
          ) : (
            <Text c="dimmed">{t("platform.noData")}</Text>
          )}
        </Paper>
      </Stack>
    </>
  );
}
