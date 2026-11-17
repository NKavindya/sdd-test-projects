import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Pagination,
  Progress,
  Rating,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppIcon, Busy, ConfirmAction, Failure } from "../../components";
import {
  ArtifactUpload,
  type UploadedFile,
} from "../../components/ArtifactUpload";
import { api, invoke, mediaUrl, showError } from "../../services/api";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import type {
  Application,
  Release as ReleaseEntity,
} from "../../services/types";
import { PlatformIcon } from "../Applications";
import "./styles.css";
function readableMetadata(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return (Array.isArray(parsed) && !parsed.length) ||
      (parsed && typeof parsed === "object" && !Object.keys(parsed).length)
      ? null
      : JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}
function formattedDate(value: unknown) {
  if (!value) return "";
  const raw = typeof value === "number" && value < 1e12 ? value * 1000 : value;
  const normalized =
    typeof raw === "string" ? raw.replace(/\bIST\b/, "+0530") : raw;
  const date = new Date(normalized as string | number);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
function EditRelease({
  app,
  release,
  opened,
  onClose,
  onSaved,
}: {
  app: Application;
  release: ReleaseEntity;
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(0);
  const [icon, setIcon] = useState<UploadedFile[]>([]);
  const [screenshots, setScreenshots] = useState<UploadedFile[]>([]);
  const [artifact, setArtifact] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("");
  const [metadata, setMetadata] = useState("");
  const [supported, setSupported] = useState("");
  const [version, setVersion] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    if (opened) {
      setStep(0);
      setDescription(release.description || "");
      setChannel(release.releaseType || "");
      setMetadata(release.metaData || "");
      setSupported(release.supportedOsVersions || "");
      setVersion(release.version || "");
      setUrl(release.installerPath || "");
      setIcon(
        release.iconPath
          ? [{ name: "Current icon", link: release.iconPath }]
          : [],
      );
      setScreenshots(
        (release.screenshots || []).map((link, i) => ({
          name: `Screenshot ${i + 1}`,
          link,
        })),
      );
      setArtifact(
        release.installerPath
          ? [{ name: "Current application", link: release.installerPath }]
          : [],
      );
      setError(undefined);
    }
  }, [opened, release]);
  return (
    <Modal
      opened={opened}
      onClose={() => !busy && onClose()}
      title="Edit release"
      size="lg"
      centered
    >
      <Stack>
        {!!error && <Failure error={error} />}{" "}
        {step === 0 ? (
          <>
            {app.type === "ENTERPRISE" && (
              <ArtifactUpload
                label="Application"
                binary
                value={artifact}
                onChange={setArtifact}
              />
            )}
            <ArtifactUpload label="Icon" value={icon} onChange={setIcon} />
            {app.type !== "CUSTOM" && (
              <ArtifactUpload
                label="Screenshots"
                count={3}
                value={screenshots}
                onChange={setScreenshots}
              />
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={
                  icon.length !== 1 ||
                  (app.type !== "CUSTOM" && screenshots.length !== 3)
                }
                onClick={() => setStep(1)}
              >
                Continue
              </Button>
            </Group>
          </>
        ) : (
          <>
            <TextInput
              label="Release Type"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              list="release-channels"
              required
            />
            <datalist id="release-channels">
              <option value="TEST" />
              <option value="PRODUCTION" />
            </datalist>
            <Textarea
              label="Description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {["PUBLIC", "WEB_CLIP", "WEB_APP", "CUSTOM"].includes(app.type) && (
              <TextInput
                label="Version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            )}{" "}
            {app.type.startsWith("WEB") && (
              <TextInput
                label="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            )}{" "}
            {!["CUSTOM", "WEB_CLIP", "WEB_APP"].includes(app.type) && (
              <TextInput
                label="Supported OS Versions"
                value={supported}
                onChange={(e) => setSupported(e.target.value)}
              />
            )}
            <Textarea
              label="Meta Data"
              rows={4}
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                disabled={busy}
                onClick={() => setStep(0)}
              >
                Back
              </Button>
              <Button
                loading={busy}
                disabled={!description.trim() || !channel}
                onClick={async () => {
                  setBusy(true);
                  setError(undefined);
                  try {
                    const data = {
                      description,
                      releaseType: channel,
                      metaData: metadata,
                      supportedOsVersions: supported,
                      version,
                      price: release.price || 0,
                      isSharedWithAllTenants:
                        release.isSharedWithAllTenants || false,
                      iconLink: icon[0]?.link,
                      screenshotLinks: screenshots.map((item) => item.link),
                      ...(app.type.startsWith("WEB") ? { url } : {}),
                      ...(app.type === "ENTERPRISE" &&
                      artifact[0]?.link !== release.installerPath
                        ? {
                            artifactLink: artifact[0]?.link,
                            remoteStatus: !!artifact[0]?.remote,
                          }
                        : {}),
                    };
                    await api.updateRelease(app.type, release.uuid, data);
                    notifications.show({
                      message: "Release updated successfully",
                      color: "green",
                    });
                    onSaved();
                    onClose();
                  } catch (failure) {
                    setError(failure);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Update
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
export default function Release({ firmware = false }: { firmware?: boolean }) {
  const { uuid } = useParams();
  const { has, config } = useSession();
  const navigate = useNavigate();
  const resource = useResource(() => api.release(uuid!), [uuid]);
  const app = resource.data;
  const release =
    app?.applicationReleases?.find((item) => item.uuid === uuid) ||
    app?.applicationReleases?.[0];
  const lifecycle = useResource(
    async () => {
      const [changes, graph] = await Promise.all([
        invoke<any>(
          "GET",
          `/applications/life-cycle/state-changes/${encodeURIComponent(uuid!)}`,
        ),
        invoke<any>(
          "GET",
          `/applications/lifecycle-config?applicationType=${firmware ? "CUSTOM" : app?.type || ""}`,
        ),
      ]);
      return { changes, graph };
    },
    [uuid, app?.type],
    has("am:pub:app:update") && !!app,
  );
  const [reviewPage, setReviewPage] = useState(1);
  useEffect(() => setReviewPage(1), [uuid]);
  const rating = useResource(
    () =>
      invoke<{
        ratingValue: number;
        noOfUsers: number;
        ratingVariety: Record<string, number>;
      }>("GET", `/admin/reviews/${encodeURIComponent(uuid!)}/release-rating`),
    [uuid],
    has("am:admin:pub:app:review:view"),
  );
  const reviews = useResource(
    () =>
      invoke<any>(
        "GET",
        `/admin/reviews/release/${encodeURIComponent(uuid!)}?offSet=${(reviewPage - 1) * 10}&limit=10`,
      ),
    [uuid, reviewPage],
    has("am:admin:pub:app:review:view"),
  );
  const [selectedAction, setSelectedAction] = useState<string>();
  const [reason, setReason] = useState("");
  const [changing, setChanging] = useState(false);
  const [transitionError, setTransitionError] = useState<unknown>();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  if (resource.loading) return <Busy />;
  if (resource.error)
    return <Failure error={resource.error} retry={resource.reload} />;
  if (!app || !release)
    return <Failure error={new Error("UEM did not return release details.")} />;
  const graph = lifecycle.data?.graph;
  const stateMap = graph?.states || graph?.lifecycleStates || graph;
  const states: any[] = Array.isArray(stateMap)
    ? stateMap
    : stateMap && typeof stateMap === "object"
      ? Object.entries(stateMap).map(([key, value]) =>
          typeof value === "object"
            ? { ...(value as object), state: key }
            : { state: key, value },
        )
      : [];
  states.sort(
    (a, b) =>
      (config.lifecycle[a.state || a.name]?.step ?? 99) -
      (config.lifecycle[b.state || b.name]?.step ?? 99),
  );
  const current = states.find(
    (item) =>
      (item.state || item.name || item.stateName) === release.currentStatus,
  );
  const next =
    current?.proceedingStates ||
    current?.nextStates ||
    current?.transitions ||
    [];
  const actions: string[] = Array.isArray(next)
    ? next
        .map((item: any) =>
          typeof item === "string"
            ? item
            : item.action || item.state || item.name,
        )
        .filter(Boolean)
    : Object.keys(next);
  const history = Array.isArray(lifecycle.data?.changes)
    ? lifecycle.data?.changes
    : lifecycle.data?.changes?.lifecycleStates ||
      lifecycle.data?.changes?.states ||
      [];
  const reviewItems = Array.isArray(reviews.data)
    ? reviews.data
    : reviews.data?.reviews || reviews.data?.data || [];
  return (
    <div className="release-layout">
      <Paper className="release-primary" p="xl">
        <Group align="flex-start" wrap="nowrap">
          <AppIcon name={app.name} path={release.iconPath} size={150} />
          <div style={{ flex: 1 }}>
            <Title order={2}>
              {firmware
                ? release.packageName || app.packageName || app.name
                : app.name}
            </Title>
            {!firmware && (
              <Rating value={release.rating || 0} readOnly mt="xs" />
            )}
            <Group gap="xs" mt="sm">
              <Text size="sm">Platform:</Text>
              <PlatformIcon type={app.deviceType} />
              {!firmware && <Text size="sm">Version: {release.version}</Text>}
            </Group>
            <Group mt="sm" gap="xs">
              {has("am:pub:app:update") && (
                <Button
                  disabled={current?.isAppUpdatable === false}
                  size="xs"
                  variant="light"
                  leftSection={<IconPencil size={13} />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              )}
              {has("am:admin:pub:app:update") && (
                <Button
                  disabled={current?.isDeletableState === false}
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={13} />}
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </Button>
              )}
            </Group>
          </div>
          {!has("dm:hide:app:store") && (
            <Button
              component="a"
              href={`/store/${app.deviceType || "web-clip"}/apps/${release.uuid}?appType=${app.type}`}
              size="sm"
            >
              Open in store
            </Button>
          )}
        </Group>
        {firmware ? (
          <>
            <Group className="channel-box" justify="space-between">
              <Text>Channel: {release.releaseType}</Text>
              <Text>Version: {release.version}</Text>
            </Group>
            {has("am:pub:app:update") &&
              release.releaseType !== "PRODUCTION" && (
                <Button
                  variant="light"
                  size="xs"
                  mb="md"
                  onClick={async () => {
                    try {
                      await api.updateRelease(app.type, release.uuid, {
                        releaseType: "PRODUCTION",
                      });
                      await resource.reload();
                    } catch (error) {
                      showError(error);
                    }
                  }}
                >
                  Move to PRODUCTION
                </Button>
              )}
            <Title order={4}>Description</Title>
            <Text size="sm" mt="xs">
              {release.description}
            </Text>
          </>
        ) : (
          <>
            <Divider my="xl" />
            <div className="release-screenshots">
              {release.screenshots?.map((path, index) => (
                <img
                  key={path}
                  src={mediaUrl(path)}
                  alt={`${app.name} screenshot ${index + 1}`}
                />
              ))}
            </div>
            <Divider my="xl" />
            <Text size="sm" c="dimmed">
              {release.description || app.description}
            </Text>
            <Divider my="xl" />
            <Text size="sm">META DATA</Text>
            <pre className="release-metadata">
              {readableMetadata(release.metaData) || "No meta data available."}
            </pre>
            {has("am:admin:pub:app:review:view") && (
              <>
                <Divider my="xl" />
                <Text size="sm">REVIEWS</Text>
                <Group my="lg">
                  <Title order={1}>
                    {Number(
                      rating.data?.ratingValue ?? release.rating ?? 0,
                    ).toFixed(1)}
                  </Title>
                  <Rating
                    value={rating.data?.ratingValue ?? release.rating ?? 0}
                    readOnly
                  />
                  {rating.data && (
                    <Text size="sm" c="dimmed">
                      {rating.data.noOfUsers} ratings
                    </Text>
                  )}
                </Group>
                {rating.error && (
                  <Failure error={rating.error} retry={rating.reload} />
                )}
                {rating.data && (
                  <Stack gap={5} mb="xl" maw={350}>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <Group key={star} gap="sm" wrap="nowrap">
                        <Text size="xs" w={35}>
                          {star} ★
                        </Text>
                        <Progress
                          style={{ flex: 1 }}
                          aria-label={`${star} star ratings`}
                          value={
                            rating.data!.noOfUsers
                              ? ((rating.data!.ratingVariety?.[star] || 0) /
                                  rating.data!.noOfUsers) *
                                100
                              : 0
                          }
                        />
                        <Text size="xs" w={30}>
                          {rating.data!.ratingVariety?.[star] || 0}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                )}
                {reviews.loading ? (
                  <Busy />
                ) : reviews.error ? (
                  <Failure error={reviews.error} retry={reviews.reload} />
                ) : reviewItems.length ? (
                  <Stack>
                    {reviewItems.map((item: any, index: number) => (
                      <div key={item.id || index}>
                        <Text fw={500} size="sm">
                          {item.username || item.userName || item.createdBy}
                        </Text>
                        <Group gap="xs">
                          <Rating value={item.rating || 0} readOnly size="xs" />
                          <Text size="xs" c="dimmed">
                            {formattedDate(
                              item.createdAt ||
                                item.createdTimeStamp ||
                                item.timestamp,
                            )}
                          </Text>
                        </Group>
                        <Text size="sm">
                          {item.content || item.comment || item.review}
                        </Text>
                      </div>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    No data
                  </Text>
                )}
                {Number(
                  reviews.data?.recordsFiltered ??
                    reviews.data?.recordsTotal ??
                    0,
                ) > 10 && (
                  <Pagination
                    mt="lg"
                    value={reviewPage}
                    total={Math.ceil(
                      Number(
                        reviews.data.recordsFiltered ??
                          reviews.data.recordsTotal,
                      ) / 10,
                    )}
                    onChange={setReviewPage}
                  />
                )}
              </>
            )}
          </>
        )}
      </Paper>
      {has("am:pub:app:update") && (
        <Paper className="lifecycle-panel" p="xl">
          <Title order={3}>Manage Lifecycle</Title>
          <Divider my="lg" />
          <Text size="sm" mb="md">
            Ensure that your security policies are not violated by the{" "}
            {firmware ? "firmware" : "application"}. Have a thorough review and
            approval process before directly publishing it to your app store.
            You can easily transition from one state to another.
          </Text>
          <Tabs defaultValue="change">
            <Tabs.List>
              <Tabs.Tab value="change">Change Lifecycle</Tabs.Tab>
              <Tabs.Tab value="history">Lifecycle History</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="change" pt="lg">
              {lifecycle.loading ? (
                <Busy />
              ) : lifecycle.error ? (
                <Failure error={lifecycle.error} retry={lifecycle.reload} />
              ) : (
                <Stack gap="md">
                  {states.map((item, index) => {
                    const name = item.state || item.name || item.stateName;
                    const display = config.lifecycle[name];
                    return (
                      <div
                        className={`lifecycle-state ${name === release.currentStatus ? "current" : ""}`}
                        key={name || index}
                      >
                        <Text
                          size="sm"
                          fw={name === release.currentStatus ? 600 : 400}
                        >
                          {display?.title || name}
                        </Text>
                        {name === release.currentStatus && (
                          <>
                            <Text size="sm" c="dimmed" mt={4}>
                              {display?.text || item.description}
                            </Text>
                            <Group gap={4} mt="sm">
                              {actions.map((action) => (
                                <Button
                                  key={action}
                                  size="compact-xs"
                                  onClick={() => {
                                    setSelectedAction(action);
                                    setReason("");
                                    setTransitionError(undefined);
                                  }}
                                >
                                  {action}
                                </Button>
                              ))}
                            </Group>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {!states.length && (
                    <Alert>Lifecycle configuration is unavailable.</Alert>
                  )}
                </Stack>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="history" pt="lg">
              {history.length ? (
                <Stack>
                  {history.map((item: any, index: number) => (
                    <div key={index}>
                      <Text size="sm" fw={500}>
                        {typeof item === "string"
                          ? item
                          : item.currentState || item.state || item.nextState}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.updatedBy || item.createdBy || ""}{" "}
                        {formattedDate(item.updatedAt || item.createdAt)}
                      </Text>
                      {item.reason && <Text size="sm">{item.reason}</Text>}
                    </div>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No lifecycle history available.
                </Text>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      )}
      <Modal
        opened={!!selectedAction}
        onClose={() => !changing && setSelectedAction(undefined)}
        title="Confirm changing lifecycle state"
        centered
      >
        <Text size="sm">
          You are going to change the lifecycle state from{" "}
          {release.currentStatus} to {selectedAction}.
        </Text>
        <Textarea
          label="Reason"
          placeholder="Leave a comment (optional)"
          rows={5}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          mt="lg"
        />
        {!!transitionError && <Failure error={transitionError} />}
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setSelectedAction(undefined)}
          >
            Cancel
          </Button>
          <Button
            loading={changing}
            onClick={async () => {
              setChanging(true);
              try {
                await invoke(
                  "POST",
                  `/applications/life-cycle/${release.uuid}`,
                  { action: selectedAction, reason },
                );
                setSelectedAction(undefined);
                await Promise.all([resource.reload(), lifecycle.reload()]);
                notifications.show({
                  message: "Lifecycle updated successfully",
                  color: "green",
                });
              } catch (error) {
                setTransitionError(error);
              } finally {
                setChanging(false);
              }
            }}
          >
            Confirm
          </Button>
        </Group>
      </Modal>
      <ConfirmAction
        opened={deleting}
        title="Delete release"
        message="Are you sure you want to delete this release?"
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          await api.deleteRelease(release.uuid);
          navigate(firmware ? `/firmware/${app.id}/releases` : "/apps");
        }}
      />
      <EditRelease
        app={app}
        release={release}
        opened={editing}
        onClose={() => setEditing(false)}
        onSaved={resource.reload}
      />
    </div>
  );
}
