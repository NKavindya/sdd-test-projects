import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import {
  Busy,
  ConfirmAction,
  EntgraPageHeader,
  Failure,
} from "../../components";
import { api, invoke, showError } from "../../services/api";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import "./styles.css";
export default function Manage() {
  const { has } = useSession();
  const [adding, setAdding] = useState<string>();
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ kind: string; name: string }>();
  const [renamed, setRenamed] = useState("");
  const [deleting, setDeleting] = useState<{ kind: string; name: string }>();
  const resource = useResource(
    async () => {
      const [categories, tags] = await Promise.all([
        api.categories(),
        api.tags(),
      ]);
      return { categories, tags };
    },
    [],
    has("am:pub:app:update"),
  );
  const mutate = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setAdding(undefined);
      setPending([]);
      setEdit(undefined);
      await resource.reload();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <EntgraPageHeader
        title="Manage General Settings"
        crumbs={[{ label: "Manage" }, { label: "General" }]}
        description="Manage application categories and tags by adding/deleting as required."
      />
      <div className="page-content">
        {!has("am:pub:app:update") && (
          <Failure
            error={
              new Error(
                "Category and tag lists require am:pub:app:update in addition to administration permissions.",
              )
            }
          />
        )}{" "}
        {!!resource.error && (
          <Failure error={resource.error} retry={resource.reload} />
        )}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {["categories", "tags"].map((kind) => (
            <Paper withBorder p="xl" key={kind}>
              <Group justify="space-between">
                <Title order={3}>
                  {kind === "categories" ? "Categories" : "Tags"}
                </Title>
                {has(
                  kind === "categories"
                    ? "am:admin:pub:app:update"
                    : "am:pub:app:update",
                ) && (
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<IconPlus size={13} />}
                    onClick={() => {
                      setAdding(kind);
                      setPending([]);
                    }}
                  >
                    Add
                  </Button>
                )}
              </Group>
              {adding === kind && (
                <Stack mt="lg">
                  <TagsInput
                    label={
                      kind === "categories" ? "New categories" : "New tags"
                    }
                    placeholder="Type a name and press Enter"
                    value={pending}
                    onChange={setPending}
                  />
                  <Group>
                    <Button
                      size="xs"
                      loading={busy}
                      disabled={!pending.length}
                      onClick={() =>
                        mutate(() =>
                          invoke(
                            "POST",
                            kind === "categories"
                              ? "/admin/applications/categories"
                              : "/applications/tags",
                            pending,
                          ),
                        )
                      }
                    >
                      Save
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => setAdding(undefined)}
                    >
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              )}
              <div className="taxonomy-list">
                {resource.loading ? (
                  <Busy />
                ) : (
                  (resource.data?.[kind as "categories" | "tags"] || []).map(
                    (item) => {
                      const name = item.categoryName || item.tagName;
                      const canRename = has(
                        kind === "categories"
                          ? "am:admin:pub:app:update"
                          : "am:pub:app:update",
                      );
                      const canDelete = has("am:admin:pub:app:update");
                      return (
                        <Badge
                          key={name}
                          color={kind === "categories" ? "blue" : "dark"}
                          radius={3}
                          size="lg"
                          fw={400}
                          tt="none"
                          rightSection={
                            <Group gap={2}>
                              {canRename && (
                                <ActionIcon
                                  aria-label={`Rename ${name}`}
                                  size="xs"
                                  variant="transparent"
                                  c="white"
                                  onClick={() => {
                                    setEdit({ kind, name });
                                    setRenamed(name);
                                  }}
                                >
                                  <IconPencil size={12} />
                                </ActionIcon>
                              )}
                              {canDelete && (
                                <ActionIcon
                                  aria-label={`Delete ${name}`}
                                  size="xs"
                                  variant="transparent"
                                  c="white"
                                  disabled={
                                    item.isCategoryDeletable === false ||
                                    item.isTagDeletable === false
                                  }
                                  onClick={() => setDeleting({ kind, name })}
                                >
                                  <IconTrash size={12} />
                                </ActionIcon>
                              )}
                            </Group>
                          }
                        >
                          {name}
                        </Badge>
                      );
                    },
                  )
                )}
                {!resource.loading &&
                  !resource.data?.[kind as "categories" | "tags"].length && (
                    <Text c="dimmed" size="sm">
                      No data
                    </Text>
                  )}
              </div>
            </Paper>
          ))}
        </SimpleGrid>
      </div>
      <Modal
        opened={!!edit}
        onClose={() => setEdit(undefined)}
        title="Rename"
        centered
      >
        <TextInput
          label="Name"
          value={renamed}
          onChange={(e) => setRenamed(e.target.value)}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setEdit(undefined)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!renamed.trim()}
            onClick={() =>
              mutate(() =>
                invoke(
                  "PUT",
                  `${edit?.kind === "categories" ? "/admin/applications/categories" : "/applications/tags"}/rename?from=${encodeURIComponent(edit!.name)}&to=${encodeURIComponent(renamed.trim())}`,
                ),
              )
            }
          >
            Save
          </Button>
        </Group>
      </Modal>
      <ConfirmAction
        opened={!!deleting}
        title="Confirm deletion"
        message={`Delete ${deleting?.name}? Items in use may be rejected by UEM.`}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          const kind = deleting!.kind;
          await invoke(
            "DELETE",
            `/admin/applications/${kind}?${kind === "categories" ? "category-name" : "tag-name"}=${encodeURIComponent(deleting!.name)}`,
          );
          await resource.reload();
        }}
      />
    </>
  );
}
