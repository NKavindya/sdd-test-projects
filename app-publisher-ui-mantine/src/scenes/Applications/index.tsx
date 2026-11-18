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
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Menu,
  Modal,
  Rating,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArchive,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandWindows,
  IconDeviceDesktop,
  IconDotsVertical,
  IconEyeOff,
  IconPencil,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { integrationAccess } from "../../services/platformContracts";
import { useNavigate } from "react-router-dom";
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
import { api, showError } from "../../services/api";
import { applicationFilter } from "../../services/contracts.mjs";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import type { Filter } from "../../services/types";
import ManagedConfigurations from "./components/ManagedConfigurations";
import "./styles.css";
export function PlatformIcon({ type }: { type: string }) {
  const Icon =
    type === "android"
      ? IconBrandAndroid
      : type === "ios"
        ? IconBrandApple
        : type === "windows"
          ? IconBrandWindows
          : IconDeviceDesktop;
  return (
    <Tooltip label={type || "Web App"}>
      <Icon
        size={21}
        color={type === "android" ? "#7db343" : "#4288BA"}
        aria-label={type || "Web App"}
      />
    </Tooltip>
  );
}
export function AppDetailsDrawer({
  id,
  onClose,
  onChanged,
}: {
  id: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { has, scopes, androidEnterpriseToken } = useSession();
  const { t } = useTranslation();
  const managedConfigurationsAllowed = integrationAccess(
    scopes,
    androidEnterpriseToken,
  ).managedConfigurations;
  const navigate = useNavigate();
  const resource = useResource(() => api.app(id!), [id], id !== null);
  const app = resource.data;
  const packageName =
    app?.packageName || app?.applicationReleases?.[0]?.packageName;
  const [managedOpened, setManagedOpened] = useState(false);
  const [managedUnavailable, setManagedUnavailable] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"delete" | "retire">();
  const [releasePage, setReleasePage] = useState(1);
  const edit = (field: string) => {
    setValue(
      Array.isArray(app?.[field])
        ? (app?.[field] as string[]).join(", ")
        : String(app?.[field] || ""),
    );
    setEditing(field);
  };
  const editable = (label: string, field: string) => (
    <Group gap={4}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {has("am:pub:app:update") && (
        <ActionIcon
          aria-label={`Edit ${label}`}
          size="xs"
          variant="subtle"
          onClick={() => edit(field)}
        >
          <IconPencil size={13} />
        </ActionIcon>
      )}
    </Group>
  );
  return (
    <>
      <Drawer
        opened={id !== null}
        onClose={onClose}
        position="right"
        size="40%"
        className="app-drawer"
        title="Application details"
      >
        {resource.loading ? (
          <Busy />
        ) : resource.error ? (
          <Failure error={resource.error} retry={resource.reload} />
        ) : (
          app && (
            <>
              <Group justify="flex-end">
                <Menu>
                  <Menu.Target>
                    <ActionIcon
                      aria-label="Application actions"
                      variant="subtle"
                      color="dark"
                    >
                      <IconDotsVertical />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {has("am:admin:pub:app:update") && (
                      <>
                        <Menu.Item
                          leftSection={<IconArchive size={14} />}
                          onClick={() => setAction("retire")}
                        >
                          Retire
                        </Menu.Item>
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          disabled={app.isDeletableApp === false}
                          onClick={() => setAction("delete")}
                        >
                          Delete
                        </Menu.Item>
                      </>
                    )}
                    {app.isHideableApp && has("am:pub:app:update") && (
                      <Menu.Item
                        disabled
                        leftSection={<IconEyeOff size={14} />}
                      >
                        Hide
                      </Menu.Item>
                    )}
                    {app.isAndroidEnterpriseApp &&
                      managedConfigurationsAllowed && (
                        <Menu.Item
                          disabled={!packageName || managedUnavailable}
                          title={
                            !packageName || managedUnavailable
                              ? t("ae.managedUnavailable")
                              : undefined
                          }
                          onClick={() => setManagedOpened(true)}
                          leftSection={<IconSettings size={14} />}
                        >
                          {t("ae.managedConfigurations")}
                        </Menu.Item>
                      )}
                    {!has("am:admin:pub:app:update") &&
                      !app.isHideableApp &&
                      !(
                        app.isAndroidEnterpriseApp &&
                        managedConfigurationsAllowed
                      ) && <Menu.Label>No actions available</Menu.Label>}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Stack align="center" gap="sm">
                <AppIcon
                  name={app.name}
                  path={app.applicationReleases?.[0]?.iconPath}
                  size={100}
                />
                <Group gap={4}>
                  <Title order={2}>{app.name}</Title>
                  {has("am:pub:app:update") && (
                    <ActionIcon
                      aria-label="Edit name"
                      variant="subtle"
                      onClick={() => edit("name")}
                    >
                      <IconPencil />
                    </ActionIcon>
                  )}
                </Group>
              </Stack>
              <section className="drawer-section">
                <Group justify="space-between">
                  <Text fw={600} size="sm">
                    Releases
                  </Text>
                  {has(typeScope(app.type)) &&
                    !(
                      ["PUBLIC", "WEB_CLIP", "WEB_APP"].includes(app.type) &&
                      app.applicationReleases?.length > 0
                    ) && (
                      <Button
                        size="xs"
                        rightSection={<IconPlus size={14} />}
                        onClick={() =>
                          navigate(
                            `/apps/${app.deviceType || "all"}/${app.id}/add-release`,
                          )
                        }
                      >
                        New Release
                      </Button>
                    )}
                </Group>
                <Stack mt="lg">
                  {(app.applicationReleases || [])
                    .slice((releasePage - 1) * 4, releasePage * 4)
                    .map((release) => (
                      <button
                        className="release-card"
                        key={release.uuid}
                        onClick={() =>
                          navigate(
                            `${app.type === "CUSTOM" ? "/firmware" : "/apps"}/releases/${release.uuid}`,
                          )
                        }
                      >
                        <Group wrap="nowrap">
                          <AppIcon name={app.name} path={release.iconPath} />
                          <div>
                            <Text fw={600} size="sm">
                              {release.version}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ✓ {release.currentStatus} │ {release.releaseType}{" "}
                              │ ☆ {release.rating || 0}
                            </Text>
                          </div>
                        </Group>
                      </button>
                    ))}
                </Stack>
                {(app.applicationReleases?.length || 0) > 4 && (
                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="subtle"
                      size="xs"
                      disabled={releasePage === 1}
                      onClick={() => setReleasePage((x) => x - 1)}
                    >
                      Previous
                    </Button>
                    <Text size="xs">{releasePage}</Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      disabled={
                        releasePage * 4 >= app.applicationReleases.length
                      }
                      onClick={() => setReleasePage((x) => x + 1)}
                    >
                      Next
                    </Button>
                  </Group>
                )}
              </section>
              <section className="drawer-section">
                {editable("Description", "description")}
                <Text size="sm">{app.description}</Text>
              </section>
              <section className="drawer-section">
                {editable("Categories", "categories")}
                <Tags values={app.categories} />
              </section>
              <section className="drawer-section">
                {editable("Tags", "tags")}
                <Tags values={app.tags} color="dark" />
              </section>
              <section className="drawer-section">
                {editable("Unrestricted Roles", "unrestrictedRoles")}
                {app.unrestrictedRoles?.length ? (
                  <Tags values={app.unrestrictedRoles} />
                ) : (
                  <div className="info-box">
                    Application is not restricted to any roles.
                  </div>
                )}
              </section>
              {has("am:admin:pub:app:review:view") && (
                <section className="drawer-section">
                  <Title order={1}>{app.rating || "0.0"}</Title>
                  <Rating value={app.rating || 0} readOnly />
                </section>
              )}
            </>
          )
        )}
      </Drawer>
      {managedOpened &&
        app?.isAndroidEnterpriseApp &&
        managedConfigurationsAllowed &&
        androidEnterpriseToken &&
        packageName && (
          <ManagedConfigurations
            token={androidEnterpriseToken}
            packageName={packageName}
            onClose={() => setManagedOpened(false)}
            onUnavailable={() => setManagedUnavailable(true)}
            onReady={() => setManagedUnavailable(false)}
          />
        )}
      <Modal
        opened={!!editing}
        onClose={() => !saving && setEditing(undefined)}
        title={`Edit ${editing || ""}`}
        centered
      >
        <Stack>
          {editing === "description" ? (
            <Textarea
              label="Description"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
            />
          ) : (
            <TextInput
              label={
                ["tags", "categories", "unrestrictedRoles"].includes(
                  editing || "",
                )
                  ? "Values separated by commas"
                  : "Name"
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={
                editing === "name" && (!value.trim() || value.length > 20)
              }
              onClick={async () => {
                if (!app || !editing) return;
                setSaving(true);
                try {
                  await api.updateApp(app.id, {
                    [editing]: [
                      "tags",
                      "categories",
                      "unrestrictedRoles",
                    ].includes(editing)
                      ? value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean)
                      : value,
                  });
                  setEditing(undefined);
                  await resource.reload();
                  onChanged();
                } catch (error) {
                  showError(error);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
      <ConfirmAction
        opened={!!action}
        title={
          action === "delete" ? "Delete application" : "Retire application"
        }
        message={`Are you sure you want to ${action} ${app?.name || "this application"}?`}
        onClose={() => setAction(undefined)}
        onConfirm={async () => {
          if (!app) return;
          if (action === "delete") await api.deleteApp(app.id);
          else await api.retireApp(app.id);
          onClose();
          onChanged();
        }}
      />
    </>
  );
}
export function typeScope(type: string) {
  return (
    (
      {
        ENTERPRISE: "am:pub:ent-app:update",
        PUBLIC: "am:pub:pub-app:update",
        WEB_APP: "am:pub:web-app:update",
        WEB_CLIP: "am:pub:web-app:update",
        CUSTOM: "am:pub:custom-app:update",
      } as Record<string, string>
    )[type] || ""
  );
}
export default function Applications() {
  const [filter, setFilter] = useState<Filter>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("10");
  const [selected, setSelected] = useState<number | null>(null);
  const resource = useResource(
    () => api.list(applicationFilter(filter, page, Number(limit))),
    [filter, page, limit],
  );
  const apps =
    filter.appTypes?.toString() === "CUSTOM"
      ? []
      : resource.data?.applications || [];
  return (
    <>
      <EntgraPageHeader
        title="Applications"
        crumbs={[{ label: "Apps" }]}
        description="Applications available in the corporate store. You can search for specific applications here."
      />
      <div className="page-content">
        <EntgraSearchFilter
          onSearch={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
        {!!resource.error && (
          <Failure error={resource.error} retry={resource.reload} />
        )}
        <EntgraTable
          columns={[
            "Application",
            "Categories",
            "Platform",
            "Type",
            "Subscription",
          ]}
          loading={resource.loading}
          rows={apps.map((app) => (
            <Table.Tr key={app.id}>
              <Table.Td>
                <button
                  className="app-link"
                  onClick={() => setSelected(app.id)}
                >
                  <AppIcon
                    path={app.applicationReleases?.[0]?.iconPath}
                    name={app.name}
                  />
                  <Text size="sm">{app.name}</Text>
                  {app.applicationReleases?.some(
                    (r) => r.currentStatus === "PUBLISHED",
                  ) && (
                    <Badge
                      color="green"
                      circle
                      size="xs"
                      aria-label="Published"
                    >
                      ✓
                    </Badge>
                  )}
                </button>
              </Table.Td>
              <Table.Td>
                <Tags values={app.categories} />
              </Table.Td>
              <Table.Td>
                <PlatformIcon type={app.deviceType} />
              </Table.Td>
              <Table.Td>
                <Text size="xs">{app.type}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{app.subMethod}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
          page={page}
          total={Math.ceil(
            (resource.data?.pagination?.count || 0) / Number(limit),
          )}
          onPage={setPage}
        />
        <Group justify="flex-end" mt="sm">
          <Select
            aria-label="Page size"
            w={110}
            size="xs"
            value={limit}
            data={["10", "20", "50"].map((value) => ({
              value,
              label: `${value} / page`,
            }))}
            onChange={(value) => {
              setLimit(value || "10");
              setPage(1);
            }}
          />
        </Group>
      </div>
      <AppDetailsDrawer
        key={selected}
        id={selected}
        onClose={() => setSelected(null)}
        onChanged={resource.reload}
      />
    </>
  );
}
