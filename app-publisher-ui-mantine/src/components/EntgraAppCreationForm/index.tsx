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
  Alert,
  Button,
  Checkbox,
  Group,
  LoadingOverlay,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Stepper,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Busy,
  EntgraPageHeader,
  Failure,
  PermissionResult,
} from "../../components";
import {
  ArtifactUpload,
  checkBinary,
  type UploadedFile,
  validUrl,
} from "../../components/ArtifactUpload";
import { api, errorText, invoke, showError } from "../../services/api";
import { releasePath } from "../../services/contracts.mjs";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import { typeScope } from "../../scenes/Applications";
import "./styles.css";
export function EntgraAppCreationForm({
  addRelease = false,
}: {
  addRelease?: boolean;
}) {
  const { variant, deviceType, appId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { has, config } = useSession();
  const types: Record<string, string> = {
    public: "PUBLIC",
    enterprise: "ENTERPRISE",
    "web-clip": "WEB_CLIP",
    "custom-app": "CUSTOM",
  };
  const existing = useResource(
    () => api.app(Number(appId)),
    [appId],
    addRelease && has("am:pub:app:view"),
  );
  const type = addRelease
    ? existing.data?.type || ""
    : types[variant || ""] || "";
  const web = type === "WEB_CLIP" || type === "WEB_APP";
  const custom = type === "CUSTOM";
  const binary = type === "ENTERPRISE" || custom;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    success: boolean;
    message: string;
  }>();
  const [icon, setIcon] = useState<UploadedFile[]>([]);
  const [screenshots, setScreenshots] = useState<UploadedFile[]>([]);
  const [artifact, setArtifact] = useState<UploadedFile[]>([]);
  const [meta, setMeta] = useState<{ key: string; value: string }[]>([]);
  const [nameState, setNameState] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const roleGeneration = useRef(0);
  const form = useForm({
    initialValues: {
      deviceType:
        new URLSearchParams(location.search).get("deviceType") ||
        deviceType ||
        "",
      name: "",
      description: "",
      categories: [] as string[],
      tags: [] as string[],
      unrestrictedRoles: [] as string[],
      firmwareModelIds: [] as string[],
      packageName: "",
      version: "",
      releaseType: "",
      releaseDescription: "",
      url: "",
      osMin: "",
      osMax: "",
      published: false,
      Package_Url: "",
      Dependency_Package_Url: "",
      Certificate_Hash: "",
      Encoded_Cert_Content: "",
      Product_Id: "",
      Content_Uri: "",
      File_Hash: "",
      Silent_Arg: "",
    },
  });
  const options = useResource(
    async () => {
      const results = await Promise.allSettled([
        has("dm:device-type:view") || has("dm:admin:device-type:view")
          ? api.deviceTypes()
          : Promise.resolve([]),
        has("am:pub:app:update") ? api.categories() : Promise.resolve([]),
        has("am:pub:app:update") ? api.tags() : Promise.resolve([]),
      ]);
      return {
        types:
          results[0].status === "fulfilled" ? (results[0].value as any[]) : [],
        categories:
          results[1].status === "fulfilled" ? (results[1].value as any[]) : [],
        tags:
          results[2].status === "fulfilled" ? (results[2].value as any[]) : [],
        errors: results
          .filter((result) => result.status === "rejected")
          .map((result) => (result as PromiseRejectedResult).reason),
      };
    },
    [],
    !!type,
  );
  const models = useResource(
    () => api.models(form.values.deviceType),
    [form.values.deviceType],
    custom &&
      !!form.values.deviceType &&
      has("am:pub:device-firmware-models:view"),
  );
  useEffect(() => {
    if (existing.data) {
      const app = existing.data;
      form.setValues({
        name: app.name,
        description: app.description,
        deviceType: app.deviceType,
        categories: app.categories || [],
        tags: app.tags || [],
        unrestrictedRoles: app.unrestrictedRoles || [],
      });
      const release = app.applicationReleases?.[0];
      if (release) {
        if (release.iconPath)
          setIcon([
            {
              name: release.iconPath.split("/").pop() || "Icon",
              link: release.iconPath,
            },
          ]);
        setScreenshots(
          (release.screenshots || []).map((link) => ({
            name: link.split("/").pop() || "Screenshot",
            link,
          })),
        );
      }
    }
  }, [existing.data]);
  useEffect(() => {
    if (
      addRelease ||
      !type ||
      !form.values.name.trim() ||
      (!web && !form.values.deviceType) ||
      !has("am:pub:app:view")
    )
      return;
    let active = true;
    const controller = new AbortController();
    setNameState("Checking…");
    const timer = setTimeout(async () => {
      try {
        await invoke(
          "GET",
          `/applications/device-type/${encodeURIComponent(web ? "all" : form.values.deviceType)}/app-name?appName=${encodeURIComponent(form.values.name.trim())}`,
          undefined,
          "publisher",
          { signal: controller.signal },
        );
        if (active) setNameState("Available");
      } catch (error) {
        if (active) setNameState(errorText(error));
      }
    }, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.values.name, form.values.deviceType, type, addRelease, web]);
  const stage = addRelease ? step + 1 : step;
  const validateDetails = () => {
    const errors: Record<string, string> = {};
    if (!web && !form.values.deviceType)
      errors.deviceType = "Device type is required";
    if (!form.values.name.trim()) errors.name = "Name is required";
    else if (form.values.name.trim().length > 20)
      errors.name = "Name must be 20 characters or fewer";
    if (!form.values.description.trim())
      errors.description = "Description is required";
    if (!form.values.categories.length)
      errors.categories = "At least one category is required";
    if (custom && models.data?.length && !form.values.firmwareModelIds.length)
      errors.firmwareModelIds = "Select firmware models";
    form.setErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const validateUploads = async () => {
    if (
      (binary && artifact.length !== 1) ||
      icon.length !== 1 ||
      (!custom && screenshots.length !== 3)
    ) {
      showError(
        new Error(
          `Provide ${binary ? "one application file, " : ""}one icon${custom ? "" : " and three unique screenshots"} before continuing.`,
        ),
      );
      return;
    }
    setBusy(true);
    try {
      if (has("am:pub:app:upload")) await checkBinary(artifact[0]);
      setStep((x) => x + 1);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  const submit = async (skip = false) => {
    if (!skip) {
      const errors: Record<string, string> = {};
      if (!form.values.releaseType)
        errors.releaseType = "Release channel is required";
      if (!form.values.releaseDescription.trim())
        errors.releaseDescription = "Release description is required";
      if (
        (web ||
          type === "PUBLIC" ||
          custom ||
          form.values.deviceType === "windows") &&
        !form.values.version.trim()
      )
        errors.version = "Version is required";
      if (
        (type === "PUBLIC" || custom || form.values.deviceType === "windows") &&
        !form.values.packageName.trim()
      )
        errors.packageName = "Package name is required";
      if (web && !validUrl(form.values.url))
        errors.url = "Enter a valid HTTP or HTTPS URL";
      if (!web && !custom && (!form.values.osMin || !form.values.osMax))
        errors.osMin = "Supported OS version range is required";
      form.setErrors(errors);
      if (
        windows &&
        ext === "appx" &&
        (!form.values.Package_Url || !form.values.Certificate_Hash)
      ) {
        errors.Package_Url = "Package URL and certificate hash are required";
        form.setErrors(errors);
      }
      if (
        windows &&
        ext === "msi" &&
        (!form.values.Product_Id ||
          !form.values.Content_Uri ||
          !form.values.File_Hash)
      ) {
        errors.Product_Id = "Product ID, content URL and hash are required";
        form.setErrors(errors);
      }
      if (Object.keys(errors).length) return;
    }
    setBusy(true);
    try {
      const metadata = Object.fromEntries(
        meta
          .filter((row) => row.key.trim())
          .map((row) => [row.key.trim(), row.value]),
      );
      if (form.values.deviceType === "windows")
        for (const key of [
          "Package_Url",
          "Dependency_Package_Url",
          "Certificate_Hash",
          "Encoded_Cert_Content",
          "Product_Id",
          "Content_Uri",
          "File_Hash",
          "Silent_Arg",
        ] as const)
          if (form.values[key]) metadata[key] = form.values[key];
      const release: Record<string, unknown> = {
        description: form.values.releaseDescription,
        releaseType: form.values.releaseType,
        price: 0,
        isSharedWithAllTenants: false,
        metaData: JSON.stringify(metadata),
        iconLink: icon[0]?.link,
        screenshotLinks: screenshots.map((item) => item.link),
        ...(form.values.version ? { version: form.values.version } : {}),
        ...(form.values.packageName
          ? { packageName: form.values.packageName }
          : {}),
        ...(web ? { url: form.values.url } : {}),
        ...(binary
          ? {
              artifactLink: artifact[0]?.link,
              remoteStatus: !!artifact[0]?.remote,
            }
          : {}),
        ...(!web && !custom
          ? { supportedOsVersions: `${form.values.osMin}-${form.values.osMax}` }
          : {}),
      };
      if (addRelease)
        await invoke(
          "POST",
          `${releasePath(type, form.values.deviceType, Number(appId))}?is-published=${form.values.published}`,
          release,
        );
      else {
        const binding = config.applicationFormConfigs[type];
        const wrapper = {
          name: form.values.name.trim(),
          description: form.values.description,
          categories: form.values.categories,
          tags: form.values.tags,
          unrestrictedRoles: form.values.unrestrictedRoles,
          subMethod: "FREE",
          ...(web
            ? { type: "WEB_CLIP" }
            : { deviceType: form.values.deviceType }),
          ...(custom
            ? { firmwareModelIds: form.values.firmwareModelIds.map(Number) }
            : {}),
          [binding.releaseWrapperName]: skip ? [] : [release],
        };
        await invoke(
          "POST",
          `/applications${binding.endpoint}?is-published=${!skip && form.values.published}`,
          wrapper,
        );
      }
      setOutcome({
        success: true,
        message: addRelease
          ? "Release created successfully!"
          : custom
            ? "Firmware created successfully!"
            : "Application created successfully!",
      });
      setStep(addRelease ? 2 : 3);
      notifications.show({
        title: "Success",
        message: addRelease ? "Release created" : "Application created",
        color: "green",
      });
    } catch (error) {
      setOutcome({ success: false, message: errorText(error) });
      setStep(addRelease ? 2 : 3);
    } finally {
      setBusy(false);
    }
  };
  if (addRelease && existing.loading) return <Busy />;
  if (existing.error)
    return <Failure error={existing.error} retry={existing.reload} />;
  if (!type || !has(typeScope(type))) return <PermissionResult />;
  const title = addRelease
    ? "Add New Release"
    : custom
      ? "Add New Firmware"
      : `Add New ${type === "PUBLIC" ? "Public App" : web ? "Web App" : "Enterprise App"}`;
  const ext = artifact[0]?.extension;
  const windows = form.values.deviceType === "windows";
  return (
    <div key={`${variant}-${appId}`}>
      <EntgraPageHeader
        title={title}
        crumbs={[
          {
            label: addRelease
              ? "Add New Release"
              : custom
                ? "Firmware"
                : type === "PUBLIC"
                  ? "Public App"
                  : web
                    ? "Web App"
                    : "Enterprise App",
          },
        ]}
        description={
          addRelease
            ? "Add new release for the application"
            : custom
              ? "Upload and manage your device firmware releases through the Entgra App Publisher. Provide the necessary details below to publish firmware updates to your devices."
              : web
                ? "Share a web clip with the corporate app store by publishing it as a Web Clip through Entgra App Publisher, by filling in the details below."
                : type === "PUBLIC"
                  ? "Share a public mobile or desktop application to the corporate app store by publishing it as a Public App through Entgra App Publisher. Select the desired application from Google Play, Apple Store or Microsoft Store and publish it by filling in the details below."
                  : "Share your own mobile application with the corporate app store by publishing it as an Enterprise App through Entgra App Publisher, by filling in the details below."
        }
      />
      <div className="wizard-wrap">
        <Stepper active={step} mb="xl" size="sm">
          {!addRelease && <Stepper.Step label="Application" />}
          <Stepper.Step label="Uploads" />
          <Stepper.Step label="Release" />
          {(!addRelease || outcome) && <Stepper.Step label="Result" />}
        </Stepper>
        <Paper withBorder p={{ base: "md", sm: "xl" }} pos="relative">
          <LoadingOverlay visible={busy} />
          {outcome ? (
            <Stack align="center" py={50}>
              <div
                className={`result-icon ${outcome.success ? "success" : "failure"}`}
              >
                {outcome.success ? (
                  <IconCheck size={45} />
                ) : (
                  <IconX size={45} />
                )}
              </div>
              <Title order={2}>
                {outcome.success ? outcome.message : "Could not create"}
              </Title>
              {!outcome.success && (
                <Alert color="red" maw={600}>
                  {outcome.message}
                </Alert>
              )}
              <Button
                onClick={() =>
                  outcome.success
                    ? navigate(custom ? "/firmware" : "/apps")
                    : (setOutcome(undefined), setStep(addRelease ? 1 : 2))
                }
              >
                {outcome.success
                  ? custom
                    ? "Go to firmware"
                    : "Go to applications"
                  : "Back"}
              </Button>
            </Stack>
          ) : stage === 0 ? (
            <div className="wizard-form">
              <Stack gap="lg">
                {options.error ? <Failure error={options.error} /> : null}
                {options.data?.errors.map((error, i) => (
                  <Failure key={i} error={error} />
                ))}
                {!web && (
                  <Select
                    label="Device Type"
                    required
                    placeholder="Select device type"
                    disabled={
                      !!new URLSearchParams(location.search).get("deviceType")
                    }
                    data={(options.data?.types || [])
                      .filter(
                        (item) =>
                          custom ||
                          config.deviceTypes.mobileTypes.includes(item.name),
                      )
                      .map((item) => ({
                        value: item.name,
                        label:
                          item.name === "ios"
                            ? "iOS"
                            : item.name.charAt(0).toUpperCase() +
                              item.name.slice(1),
                      }))}
                    {...form.getInputProps("deviceType")}
                  />
                )}
                <TextInput
                  label={custom ? "Firmware Name" : "App Name"}
                  required
                  placeholder="ex: Lorem App"
                  maxLength={20}
                  disabled={!web && !form.values.deviceType}
                  description={nameState}
                  {...form.getInputProps("name")}
                />
                <Textarea
                  label={custom ? "Description" : "App Description"}
                  rows={7}
                  required
                  placeholder="Enter the description…"
                  {...form.getInputProps("description")}
                />
                {custom && (
                  <MultiSelect
                    label="Firmware Models"
                    required
                    searchable
                    data={(models.data || []).map((item: any) => ({
                      value: String(item.id),
                      label: item.name || item.model || String(item.id),
                    }))}
                    {...form.getInputProps("firmwareModelIds")}
                  />
                )}
                <MultiSelect
                  label="Visible Roles"
                  searchable
                  placeholder="Search roles"
                  data={[
                    ...new Set([...roles, ...form.values.unrestrictedRoles]),
                  ]}
                  onSearchChange={async (value) => {
                    if (!has("rm:roles:view") || !value) return;
                    const id = ++roleGeneration.current;
                    try {
                      const result = await api.roles(value);
                      if (id === roleGeneration.current)
                        setRoles(result.roles || []);
                    } catch (error) {
                      showError(error);
                    }
                  }}
                  {...form.getInputProps("unrestrictedRoles")}
                />
                <MultiSelect
                  label="Categories"
                  required
                  placeholder="Select a Category"
                  searchable
                  data={(options.data?.categories || []).map(
                    (item) => item.categoryName,
                  )}
                  {...form.getInputProps("categories")}
                />
                <TagsInput
                  label="Tags"
                  placeholder="Tags"
                  data={(options.data?.tags || []).map((item) => item.tagName)}
                  {...form.getInputProps("tags")}
                />
                {!has("am:pub:app:update") && (
                  <Alert color="yellow">
                    Category and tag options require application-update
                    permission.
                  </Alert>
                )}
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => validateDetails() && submit(true)}
                  >
                    Skip Release
                  </Button>
                  <Button onClick={() => validateDetails() && setStep(1)}>
                    Add Release
                  </Button>
                </Group>
              </Stack>
            </div>
          ) : stage === 1 ? (
            <div className="wizard-form">
              <Stack gap="xl">
                {binary && (
                  <ArtifactUpload
                    label="Application"
                    binary
                    count={1}
                    accept={
                      custom
                        ? undefined
                        : windows
                          ? ".msi,.appx,.exe"
                          : form.values.deviceType === "ios"
                            ? ".ipa"
                            : ".apk"
                    }
                    value={artifact}
                    onChange={setArtifact}
                  />
                )}
                <ArtifactUpload label="Icon" value={icon} onChange={setIcon} />
                {!custom && (
                  <ArtifactUpload
                    label="Screenshots"
                    count={3}
                    value={screenshots}
                    onChange={setScreenshots}
                  />
                )}
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => (addRelease ? navigate(-1) : setStep(0))}
                  >
                    Back
                  </Button>
                  <Button onClick={validateUploads}>Continue</Button>
                </Group>
              </Stack>
            </div>
          ) : (
            <div className="wizard-form">
              <Stack gap="lg">
                {(type === "PUBLIC" || custom || windows) && (
                  <TextInput
                    label="Package Name"
                    required
                    {...form.getInputProps("packageName")}
                  />
                )}{" "}
                {(web || type === "PUBLIC" || custom || windows) && (
                  <TextInput
                    label="Version"
                    required
                    {...form.getInputProps("version")}
                  />
                )}{" "}
                {web && (
                  <TextInput
                    label="URL"
                    required
                    placeholder="https://example.com"
                    {...form.getInputProps("url")}
                  />
                )}{" "}
                {windows && ext === "appx" && (
                  <>
                    <TextInput
                      label="Package URL"
                      required
                      {...form.getInputProps("Package_Url")}
                    />
                    <TextInput
                      label="Dependency Package URL"
                      {...form.getInputProps("Dependency_Package_Url")}
                    />
                    <TextInput
                      label="Certificate Hash"
                      required
                      {...form.getInputProps("Certificate_Hash")}
                    />
                    <Textarea
                      label="Certificate content"
                      {...form.getInputProps("Encoded_Cert_Content")}
                    />
                  </>
                )}{" "}
                {windows && ext === "msi" && (
                  <>
                    <TextInput
                      label="Product ID"
                      required
                      {...form.getInputProps("Product_Id")}
                    />
                    <TextInput
                      label="Content URL"
                      required
                      {...form.getInputProps("Content_Uri")}
                    />
                    <TextInput
                      label="File Hash"
                      required
                      {...form.getInputProps("File_Hash")}
                    />
                  </>
                )}
                <Select
                  label="Release Channels"
                  required
                  placeholder="Select channel"
                  data={[
                    { value: "TEST", label: "Testing" },
                    { value: "PRODUCTION", label: "Production" },
                  ]}
                  {...form.getInputProps("releaseType")}
                />
                <Textarea
                  label="Description"
                  rows={5}
                  required
                  placeholder="Enter a description for release"
                  {...form.getInputProps("releaseDescription")}
                />
                {!web && !custom && (
                  <div>
                    <Text size="sm" fw={500}>
                      Supported OS Versions <span className="required">*</span>
                    </Text>
                    <Group wrap="nowrap">
                      <TextInput
                        aria-label="Minimum OS version"
                        placeholder="Minimum"
                        style={{ flex: 1 }}
                        {...form.getInputProps("osMin")}
                      />
                      <span>–</span>
                      <TextInput
                        aria-label="Maximum OS version"
                        placeholder="Maximum"
                        style={{ flex: 1 }}
                        {...form.getInputProps("osMax")}
                      />
                    </Group>
                    <Text size="xs" c="dimmed">
                      Enter the minimum and maximum supported OS versions.
                    </Text>
                  </div>
                )}
                <div>
                  <Text size="sm" mb="xs">
                    META DATA
                  </Text>
                  <Stack gap="xs">
                    {meta.map((row, index) => (
                      <Group key={index} wrap="nowrap">
                        <TextInput
                          aria-label={`Metadata key ${index + 1}`}
                          placeholder="Key"
                          value={row.key}
                          onChange={(e) =>
                            setMeta((items) =>
                              items.map((item, i) =>
                                i === index
                                  ? { ...item, key: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <TextInput
                          aria-label={`Metadata value ${index + 1}`}
                          placeholder="Value"
                          value={row.value}
                          onChange={(e) =>
                            setMeta((items) =>
                              items.map((item, i) =>
                                i === index
                                  ? { ...item, value: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <ActionIcon
                          aria-label={`Remove metadata ${index + 1}`}
                          variant="subtle"
                          onClick={() =>
                            setMeta((items) =>
                              items.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    ))}
                    <Button
                      variant="default"
                      className="dashed"
                      leftSection={<IconPlus size={15} />}
                      w="fit-content"
                      onClick={() =>
                        setMeta((items) => [...items, { key: "", value: "" }])
                      }
                    >
                      Add
                    </Button>
                  </Stack>
                </div>
                {has("am:pub:app:update") && (
                  <Checkbox
                    label={`Directly move the release to ${custom ? "Released" : "Publish"} state`}
                    disabled={
                      !custom &&
                      existing.data?.applicationReleases?.some(
                        (release) => release.currentStatus === "PUBLISHED",
                      )
                    }
                    {...form.getInputProps("published", { type: "checkbox" })}
                  />
                )}
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => setStep((x) => x - 1)}
                  >
                    Back
                  </Button>
                  <Button onClick={() => submit()}>Submit</Button>
                </Group>
              </Stack>
            </div>
          )}
        </Paper>
      </div>
    </div>
  );
}
