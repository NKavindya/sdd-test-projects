import {
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Stepper,
  Table,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import {
  ConfirmAction,
  EntgraPageHeader,
  EntgraTable,
  Failure,
} from "../../components";
import { validUrl } from "../../components/ArtifactUpload";
import { invoke, showError } from "../../services/api";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
export default function ServiceProviders() {
  const { has } = useSession();
  const prefix = "/identity-server-applications";
  const resource = useResource(() =>
    invoke<any[]>("GET", `${prefix}/identity-servers`),
  );
  const providers = useResource(() =>
    invoke<any[]>(
      "GET",
      `${prefix}/identity-servers/identity-service-providers`,
    ),
  );
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<any>();
  const [deleting, setDeleting] = useState<any>();
  const [page, setPage] = useState(1);
  const sps = useResource(
    () =>
      invoke<any>(
        "GET",
        `${prefix}/${selected?.id}/service-providers?limit=10&offset=${(page - 1) * 10}`,
      ),
    [selected?.id, page],
    !!selected,
  );
  const form = useForm({
    initialValues: {
      providerName: "",
      name: "",
      description: "",
      url: "",
      username: "",
      password: "",
    },
    validate: {
      providerName: (value) => (value ? null : "Provider is required"),
      name: (value) => (value.trim() ? null : "Name is required"),
      url: (value) => (validUrl(value) ? null : "Enter a valid URL"),
      username: (value) => (value ? null : "Username is required"),
      password: (value) => (value ? null : "Password is required"),
    },
  });
  const servers = Array.isArray(resource.data) ? resource.data : [];
  const items = Array.isArray(sps.data)
    ? sps.data
    : sps.data?.serviceProviders || [];
  return (
    <>
      <EntgraPageHeader
        title="Manage Service Provider Apps"
        crumbs={[{ label: "Manage" }, { label: "Service Providers" }]}
        description="Connect with service provider applications by providing the information below."
      />
      <div className="page-content">
        <Stepper active={selected ? 1 : 0} mb="xl">
          <Stepper.Step label="Discover Identity Servers" />
          <Stepper.Step label="View Service Provider Apps" />
        </Stepper>
        <Paper withBorder p="xl">
          {resource.error ? (
            <Failure error={resource.error} retry={resource.reload} />
          ) : null}
          {!selected ? (
            <>
              <EntgraTable
                columns={["Name", "IS Provider Name", "URL", "Actions"]}
                loading={resource.loading}
                rows={servers.map((server) => (
                  <Table.Tr key={server.id}>
                    <Table.Td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(server)}
                      >
                        {server.name}
                      </button>
                    </Table.Td>
                    <Table.Td>
                      {server.providerName ||
                        server.identityServiceProviderName}
                    </Table.Td>
                    <Table.Td>{server.url}</Table.Td>
                    <Table.Td>
                      {has("am:pub:sp:connect") && (
                        <Button
                          color="red"
                          variant="subtle"
                          size="xs"
                          onClick={() => setDeleting(server)}
                        >
                          Delete
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              />
              {has("am:pub:sp:connect") && (
                <Button
                  mt="xl"
                  rightSection={<IconPlus size={15} />}
                  onClick={() => setConnecting(true)}
                >
                  Connect
                </Button>
              )}
            </>
          ) : (
            <>
              <Group justify="space-between" mb="md">
                <Title order={3}>{selected.name}</Title>
                <Button
                  variant="default"
                  onClick={() => setSelected(undefined)}
                >
                  Back
                </Button>
              </Group>
              {sps.error ? (
                <Failure error={sps.error} retry={sps.reload} />
              ) : null}
              <EntgraTable
                columns={["Name", "Description"]}
                loading={sps.loading}
                rows={items.map((item: any, index: number) => (
                  <Table.Tr key={item.id || index}>
                    <Table.Td>{item.name || item.applicationName}</Table.Td>
                    <Table.Td>{item.description}</Table.Td>
                  </Table.Tr>
                ))}
                page={page}
                total={Math.ceil((sps.data?.count || items.length) / 10)}
                onPage={setPage}
              />
            </>
          )}
        </Paper>
      </div>
      <Modal
        opened={connecting}
        onClose={() => {
          if (!busy) {
            setConnecting(false);
            form.reset();
          }
        }}
        title="Connect to New Identity Server"
        size="lg"
        centered
      >
        <form
          onSubmit={form.onSubmit(async (values) => {
            setBusy(true);
            try {
              await invoke("POST", `${prefix}/identity-servers`, values);
              form.reset();
              setConnecting(false);
              await resource.reload();
            } catch (error) {
              showError(error);
            } finally {
              setBusy(false);
            }
          })}
        >
          <Stack>
            {providers.error ? (
              <Failure error={providers.error} retry={providers.reload} />
            ) : null}
            <Select
              required
              label="Provider"
              data={(providers.data || []).map((provider: any) =>
                typeof provider === "string"
                  ? provider
                  : {
                      value: provider.name || provider.id,
                      label: provider.name || provider.providerName,
                    },
              )}
              {...form.getInputProps("providerName")}
            />
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <Textarea
              label="App Description"
              rows={4}
              {...form.getInputProps("description")}
            />
            <TextInput
              label="URL"
              required
              placeholder="https://identityserver.com"
              {...form.getInputProps("url")}
            />
            <TextInput
              label="Username"
              required
              autoComplete="off"
              {...form.getInputProps("username")}
            />
            <PasswordInput
              label="Password"
              required
              autoComplete="new-password"
              {...form.getInputProps("password")}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                disabled={busy}
                onClick={() => {
                  setConnecting(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <ConfirmAction
        opened={!!deleting}
        title="Delete identity server"
        message={`Delete ${deleting?.name}?`}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          await invoke("DELETE", `${prefix}/identity-servers/${deleting.id}`);
          await resource.reload();
        }}
      />
    </>
  );
}
