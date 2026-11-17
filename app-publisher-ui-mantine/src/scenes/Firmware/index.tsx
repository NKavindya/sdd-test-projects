import {
  ActionIcon,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconEye, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppIcon,
  Busy,
  ConfirmAction,
  EntgraPageHeader,
  EntgraTable,
  Failure,
  Tags,
} from "../../components";
import { EntgraSearchFilter } from "../../components/SearchFilter";
import { api } from "../../services/api";
import { applicationFilter } from "../../services/contracts.mjs";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import type { Application, Filter, Release } from "../../services/types";
import "./styles.css";
export default function Firmware({ releases = false }: { releases?: boolean }) {
  const { has } = useSession();
  const { appId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>({});
  const [deleting, setDeleting] = useState<Application>();
  const types = useResource(
    api.deviceTypes,
    [],
    !releases &&
      (has("dm:device-type:view") || has("dm:admin:device-type:view")),
  );
  const active = tab || types.data?.[0]?.name;
  const resource = useResource(
    () => api.list(applicationFilter(filter, page, 10, active)),
    [filter, page, active],
    !releases && !!active,
  );
  const app = useResource(() => api.app(Number(appId)), [appId], releases);
  const releaseList = useResource(
    () =>
      api.releases(Number(appId), {
        ...filter,
        offset: (page - 1) * 10,
        limit: 10,
      }),
    [appId, filter, page],
    releases,
  );
  const rows: Release[] = Array.isArray(releaseList.data)
    ? releaseList.data
    : releaseList.data?.applicationReleases ||
      releaseList.data?.releases ||
      app.data?.applicationReleases ||
      [];
  if (releases)
    return (
      <>
        <EntgraPageHeader
          title="Firmware"
          crumbs={[
            { label: "Firmware", to: "/firmware" },
            { label: app.data?.deviceType || "" },
            { label: app.data?.name || "Releases" },
          ]}
          actions={
            has("am:pub:custom-app:update") &&
            app.data && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() =>
                  navigate(`/apps/${app.data!.deviceType}/${appId}/add-release`)
                }
              >
                New Release
              </Button>
            )
          }
        />
        <div className="page-content">
          {app.data && (
            <Group className="firmware-summary" justify="space-between">
              <Text size="sm">
                Firmware Name: <strong>{app.data.name}</strong>
              </Text>
              <Text size="sm">Description: {app.data.description}</Text>
              <Tags values={app.data.firmwareModels} />
            </Group>
          )}
          <EntgraSearchFilter
            key={appId}
            firmware
            releases
            onSearch={(next) => {
              setFilter(next);
              setPage(1);
            }}
          />
          {!!(app.error || releaseList.error) && (
            <Failure
              error={app.error || releaseList.error}
              retry={() => {
                void app.reload();
                void releaseList.reload();
              }}
            />
          )}
          <EntgraTable
            columns={[
              "Firmware Package Name",
              "Version",
              "Release Channels",
              "Lifecycle Status",
            ]}
            loading={app.loading || releaseList.loading}
            rows={rows.map((release) => (
              <Table.Tr key={release.uuid}>
                <Table.Td>
                  <button
                    className="text-link"
                    onClick={() =>
                      navigate(`/firmware/releases/${release.uuid}`)
                    }
                  >
                    {release.packageName ||
                      app.data?.packageName ||
                      app.data?.name}
                  </button>
                </Table.Td>
                <Table.Td>{release.version}</Table.Td>
                <Table.Td>{release.releaseType}</Table.Td>
                <Table.Td>{release.currentStatus}</Table.Td>
              </Table.Tr>
            ))}
            page={page}
            total={Math.ceil(
              (releaseList.data?.pagination?.count || rows.length) / 10,
            )}
            onPage={setPage}
          />
        </div>
      </>
    );
  return (
    <>
      <EntgraPageHeader
        title="Firmware"
        crumbs={[{ label: "Firmware" }]}
        description="Easily manage and configure firmware versions for all your devices. This helps ensure consistent behavior, security, and smooth updates across all your devices."
      />
      <div className="page-content">
        {types.loading ? (
          <Busy />
        ) : types.error ? (
          <Failure error={types.error} retry={types.reload} />
        ) : !types.data?.length ? (
          <Failure
            error={
              new Error(
                "Device types are unavailable. Device-type view permission is required.",
              )
            }
          />
        ) : (
          <>
            <Tabs
              value={active || null}
              onChange={(value) => {
                setTab(value);
                setFilter({});
                setPage(1);
              }}
            >
              <Tabs.List>
                {types.data?.map((type) => (
                  <Tabs.Tab key={type.name} value={type.name}>
                    {type.name === "ios"
                      ? "iOS"
                      : type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
            <div style={{ marginTop: 16 }}>
              <EntgraSearchFilter
                key={active}
                firmware
                onSearch={(next) => {
                  setFilter(next);
                  setPage(1);
                }}
              />
            </div>
            {!!resource.error && (
              <Failure error={resource.error} retry={resource.reload} />
            )}
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4, xl: 6 }} spacing="lg">
              {has("am:pub:custom-app:update") && (
                <button
                  className="create-firmware-card"
                  onClick={() =>
                    navigate(
                      `/add-new-app/custom-app?deviceType=${encodeURIComponent(active || "")}`,
                    )
                  }
                >
                  <IconPlus size={20} />
                  <Text size="sm">Create Firmware</Text>
                </button>
              )}
              {resource.loading ? (
                <Busy />
              ) : (
                resource.data?.applications?.map((item) => (
                  <Card key={item.id} withBorder padding={0} radius="md">
                    <button
                      className="firmware-card-main"
                      onClick={() => navigate(`/firmware/${item.id}/releases`)}
                    >
                      <Stack align="center" gap="md">
                        <AppIcon
                          path={item.applicationReleases?.[0]?.iconPath}
                          name={item.name}
                          size={80}
                        />
                        <Text fw={600} lineClamp={1} w="100%">
                          {item.name}
                        </Text>
                      </Stack>
                      <Text c="dimmed" size="sm" lineClamp={1} mt="xs">
                        {item.description}
                      </Text>
                      <Tags values={item.categories} />
                    </button>
                    <Group className="firmware-card-actions" grow>
                      {has("am:pub:custom-app:update") && (
                        <Tooltip label="New Release">
                          <ActionIcon
                            aria-label={`New release for ${item.name}`}
                            variant="subtle"
                            onClick={() =>
                              navigate(
                                `/apps/${item.deviceType}/${item.id}/add-release`,
                              )
                            }
                          >
                            <IconPlus size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip label="View releases">
                        <ActionIcon
                          aria-label={`View ${item.name}`}
                          variant="subtle"
                          onClick={() =>
                            navigate(`/firmware/${item.id}/releases`)
                          }
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {has("am:admin:pub:app:update") && (
                        <Tooltip label="Delete firmware">
                          <ActionIcon
                            aria-label={`Delete ${item.name}`}
                            color="red"
                            variant="subtle"
                            disabled={item.isDeletableApp === false}
                            onClick={() => setDeleting(item)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Card>
                ))
              )}
            </SimpleGrid>
            <Group justify="flex-end" mt="lg">
              <Button
                variant="subtle"
                size="xs"
                disabled={page === 1}
                onClick={() => setPage((x) => x - 1)}
              >
                Previous
              </Button>
              <Text size="sm">{page}</Text>
              <Button
                variant="subtle"
                size="xs"
                disabled={page * 10 >= (resource.data?.pagination?.count || 0)}
                onClick={() => setPage((x) => x + 1)}
              >
                Next
              </Button>
            </Group>
          </>
        )}
      </div>
      <ConfirmAction
        opened={!!deleting}
        title="Delete firmware"
        message={`Are you sure you want to delete ${deleting?.name}?`}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          await api.deleteApp(deleting!.id);
          await resource.reload();
        }}
      />
    </>
  );
}
