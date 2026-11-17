import {
  ActionIcon,
  Alert,
  Button,
  FileButton,
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { md5 } from "js-md5";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  errorText,
  invoke,
  mediaUrl,
  uploadFile,
} from "../../services/api";
import { useSession } from "../../services/session";
import "./styles.css";
export interface UploadedFile {
  name: string;
  link: string;
  hash?: string;
  remote?: boolean;
  extension?: string;
}
export function validUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}
interface Entry {
  hash?: string;
  file?: File;
  result?: UploadedFile;
  progress: number;
  error?: string;
  controller?: AbortController;
}
export function ArtifactUpload({
  label,
  value,
  onChange,
  count = 1,
  binary = false,
  accept,
}: {
  label: string;
  value: UploadedFile[];
  onChange: (value: UploadedFile[]) => void;
  count?: number;
  binary?: boolean;
  accept?: string;
}) {
  const { has } = useSession();
  const [mode, setMode] = useState("Upload");
  const [url, setUrl] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(
    () => () => {
      entriesRef.current.forEach((entry) => entry.controller?.abort());
    },
    [],
  );
  const upload = async (file: File, retryIndex?: number) => {
    if (
      retryIndex === undefined &&
      valueRef.current.length +
        entriesRef.current.filter((item) => !item.result && !item.error)
          .length >=
        count
    )
      return;
    const controller = new AbortController();
    const entry: Entry = { file, progress: 0, controller };
    const current =
      retryIndex === undefined
        ? [...entriesRef.current, entry]
        : entriesRef.current.map((x, i) => (i === retryIndex ? entry : x));
    entriesRef.current = current;
    setEntries(current);
    const update = (patch: Partial<Entry>) => {
      const next = entriesRef.current.map((item) =>
        item === entry || item.file === file
          ? Object.assign(entry, patch)
          : item,
      );
      entriesRef.current = next;
      setEntries([...next]);
    };
    try {
      if (!binary && !/\.(jpe?g|png|webp|svg)$/i.test(file.name))
        throw new Error(
          "Invalid image type. Choose JPG, JPEG, PNG, WEBP or SVG.",
        );
      const hash = md5(await file.arrayBuffer());
      if (
        count > 1 &&
        (valueRef.current.some((item) => item.hash === hash) ||
          entriesRef.current.some(
            (item) => item !== entry && !item.error && item.hash === hash,
          ))
      )
        throw new Error("Please choose unique screenshots.");
      update({ hash });
      const link = await uploadFile(
        file,
        (progress) => update({ progress }),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const result = {
        name: file.name,
        link,
        hash,
        remote: false,
        extension: file.name.split(".").pop()?.toLowerCase(),
      };
      update({ result, progress: 100 });
      valueRef.current = [...valueRef.current, result];
      changeRef.current(valueRef.current);
    } catch (error) {
      if (!controller.signal.aborted) update({ error: errorText(error) });
    }
  };
  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));
  return (
    <div className="upload-field">
      <SegmentedControl
        size="sm"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setUrl("");
        }}
        data={["Upload", "URL"]}
      />
      <div className="horizontal-field">
        <Text component="label" size="sm">
          <span className="required">*</span> {label}:
        </Text>
        <div>
          <Stack gap="xs">
            {value.map((item, index) => (
              <Group
                key={`${item.link}-${index}`}
                className="uploaded-file"
                wrap="nowrap"
              >
                {!binary && (
                  <img
                    className="uploaded-preview"
                    src={mediaUrl(item.link)}
                    alt=""
                    width={42}
                    height={42}
                  />
                )}
                <Text
                  component="a"
                  href={mediaUrl(item.link)}
                  target="_blank"
                  rel="noreferrer"
                  size="sm"
                  lineClamp={1}
                  style={{ flex: 1 }}
                >
                  {item.name}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(index)}
                >
                  <IconTrash size={15} />
                </ActionIcon>
              </Group>
            ))}
            {entries
              .filter((entry) => !entry.result)
              .map((entry, index) => (
                <div key={index}>
                  <Group justify="space-between">
                    <Text size="xs">{entry.file?.name}</Text>
                    <ActionIcon
                      size="xs"
                      aria-label="Cancel upload"
                      onClick={() => {
                        entry.controller?.abort();
                        const remaining = entriesRef.current.filter(
                          (x) => x !== entry,
                        );
                        entriesRef.current = remaining;
                        setEntries(remaining);
                      }}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Group>
                  {entry.error ? (
                    <Alert color="red" title="Upload failed">
                      {entry.error}
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() =>
                          entry.file &&
                          upload(entry.file, entries.indexOf(entry))
                        }
                      >
                        Retry
                      </Button>
                    </Alert>
                  ) : (
                    <Progress
                      value={entry.progress}
                      aria-label={`Uploading ${entry.file?.name}`}
                      mt={4}
                    />
                  )}
                </div>
              ))}
            {value.length < count &&
              (mode === "Upload" ? (
                has("am:pub:app:upload") ? (
                  binary ? (
                    <FileButton
                      onChange={(file) => file && upload(file)}
                      accept={accept}
                    >
                      {(props) => (
                        <Button
                          {...props}
                          variant="default"
                          leftSection={<IconUpload size={15} />}
                        >
                          Select
                        </Button>
                      )}
                    </FileButton>
                  ) : (
                    <Dropzone
                      role="button"
                      aria-label={`Select ${label}`}
                      multiple={false}
                      useFsAccessApi={false}
                      inputProps={{ "aria-label": `${label} file` }}
                      accept={[
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/svg+xml",
                      ]}
                      onDrop={(files) => files[0] && upload(files[0])}
                      style={{ padding: 12, minHeight: 0 }}
                    >
                      <Group gap="xs">
                        <IconUpload size={15} />
                        <Text size="sm">Select or drop an image</Text>
                      </Group>
                    </Dropzone>
                  )
                ) : (
                  <Alert color="yellow">
                    Upload permission is required. You can use a hosted URL.
                  </Alert>
                )
              ) : (
                <Group align="flex-start" wrap="nowrap">
                  <TextInput
                    aria-label={`${label} URL`}
                    placeholder="https://example.com/file"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    error={
                      url && !validUrl(url)
                        ? "Enter a valid HTTP or HTTPS URL"
                        : undefined
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="light"
                    disabled={!validUrl(url)}
                    onClick={() => {
                      if (value.some((x) => x.link === url)) return;
                      onChange([
                        ...value,
                        {
                          name: url.split("/").pop() || url,
                          link: url,
                          remote: true,
                          extension: url.split(".").pop()?.split("?")[0],
                        },
                      ]);
                      setUrl("");
                    }}
                  >
                    Add
                  </Button>
                </Group>
              ))}
            {!binary && (
              <Text size="xs" c="dimmed">
                {count === 1
                  ? "Supported image types: .jpg, .jpeg, .png, .webp and .svg. Recommended icon size: 144px × 144px."
                  : "Upload three unique screenshots. Recommended dimensions: min. 320px, max. 3840px."}
              </Text>
            )}
            {binary && mode === "URL" && (
              <Alert color="yellow" title="External application link">
                Ensure the file remains available at this URL for device
                installations.
              </Alert>
            )}
          </Stack>
        </div>
      </div>
    </div>
  );
}
export async function checkBinary(value?: UploadedFile) {
  if (!value?.hash) return;
  try {
    await invoke("GET", `/applications/release-hash/${value.hash}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      throw new Error("A release already exists for this binary.");
    throw error;
  }
}
