import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  Select,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconEraser, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { TYPE_FILTERS } from "../../services/contracts.mjs";
import { useResource } from "../../services/hooks";
import { useSession } from "../../services/session";
import type { Filter } from "../../services/types";
import { Failure } from "../index";
interface Chip {
  key: string;
  label: string;
  value: string;
}
export function EntgraSearchFilter({
  onSearch,
  firmware = false,
  releases = false,
}: {
  onSearch: (filter: Filter) => void;
  firmware?: boolean;
  releases?: boolean;
}) {
  const { has } = useSession();
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const [editor, setEditor] = useState(false);
  const [criterion, setCriterion] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const options = useResource(
    async () => {
      const [categories, tags, types] = await Promise.all([
        has("am:pub:app:update") ? api.categories() : [],
        has("am:pub:app:update") ? api.tags() : [],
        has("dm:device-type:view") || has("dm:admin:device-type:view")
          ? api.deviceTypes()
          : [],
      ]);
      return {
        categories: categories.map((x) => x.categoryName),
        tags: tags.map((x) => x.tagName),
        types: types.map((x) => x.name),
      };
    },
    [],
    opened && !releases,
  );
  const criteria = releases
    ? [
        { value: "version", label: "Version" },
        { value: "appReleaseType", label: "Release channel" },
        { value: "appReleaseState", label: "App Status" },
      ]
    : [
        ...(has("am:pub:app:update")
          ? [
              { value: "categories", label: "Category" },
              { value: "tags", label: "Tag" },
            ]
          : []),
        ...(!firmware &&
        (has("dm:device-type:view") || has("dm:admin:device-type:view"))
          ? [{ value: "deviceType", label: "Platform" }]
          : []),
        ...(!firmware ? [{ value: "appTypes", label: "App Type" }] : []),
        { value: "appName", label: "App Name" },
        { value: "appReleaseState", label: "App Status" },
      ];
  function serialize(next: Chip[]) {
    const result: Filter = {};
    for (const chip of next) {
      if (chip.key === "categories" || chip.key === "tags")
        result[chip.key] = next
          .filter((x) => x.key === chip.key)
          .map((x) => x.value);
      else if (chip.key === "appTypes")
        result.appTypes = TYPE_FILTERS[chip.value as keyof typeof TYPE_FILTERS];
      else result[chip.key] = chip.value;
    }
    return result;
  }
  function commit(search: boolean) {
    if (editor && (!criterion || !value.trim())) {
      setInvalid(true);
      return;
    }
    const next =
      editor && criterion
        ? [
            ...chips.filter((x) => !(x.key === criterion && x.value === value)),
            {
              key: criterion,
              label:
                criteria.find((x) => x.value === criterion)?.label || criterion,
              value: value.trim(),
            },
          ]
        : chips;
    setChips(next);
    setCriterion(null);
    setValue("");
    setInvalid(false);
    setEditor(!search);
    if (search) onSearch(serialize(next));
  }
  const values =
    criterion === "categories"
      ? options.data?.categories
      : criterion === "tags"
        ? options.data?.tags
        : criterion === "deviceType"
          ? options.data?.types
          : criterion === "appTypes"
            ? Object.keys(TYPE_FILTERS)
            : criterion === "appReleaseType"
              ? ["TEST", "PRODUCTION"]
              : criterion === "appReleaseState"
                ? [
                    "CREATED",
                    "IN-REVIEW",
                    "APPROVED",
                    firmware ? "RELEASED" : "PUBLISHED",
                    "BLOCKED",
                    "REJECTED",
                    "DEPRECATED",
                    "RETIRED",
                  ]
                : undefined;
  return (
    <section className="search-panel">
      <button
        className="search-toggle"
        aria-expanded={opened}
        onClick={() => setOpened(!opened)}
      >
        <IconSearch size={15} />
        {t(
          releases
            ? "Search Firmware Releases"
            : firmware
              ? "Search Firmware"
              : "Search Apps",
        )}
      </button>
      <Collapse expanded={opened}>
        <div className="search-content">
          {options.error ? (
            <Failure error={options.error} retry={options.reload} />
          ) : null}
          <Group wrap="wrap" gap="xs" align="flex-start">
            <Group style={{ flex: 1 }} gap="xs">
              {chips.map((chip, i) => (
                <Badge
                  key={`${chip.key}-${chip.value}`}
                  className="filter-chip"
                  variant="outline"
                  rightSection={
                    <ActionIcon
                      aria-label={`Remove ${chip.label}: ${chip.value}`}
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                        const next = chips.filter((_, index) => index !== i);
                        setChips(next);
                        onSearch(serialize(next));
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  }
                >
                  {chip.label} │ {chip.value}
                </Badge>
              ))}
              {editor && (
                <Group className="filter-editor" gap={4}>
                  <Select
                    autoFocus
                    aria-label="Criterion"
                    placeholder="Select criterion"
                    w={150}
                    value={criterion}
                    data={criteria.filter(
                      (x) =>
                        ["categories", "tags"].includes(x.value) ||
                        !chips.some((c) => c.key === x.value),
                    )}
                    onChange={(next) => {
                      setCriterion(next);
                      setValue("");
                      setInvalid(false);
                    }}
                    error={invalid && !criterion ? "Required" : undefined}
                  />
                  {criterion &&
                    (values ? (
                      <Select
                        aria-label="Criterion value"
                        placeholder="Select value"
                        searchable
                        w={200}
                        value={value || null}
                        data={[...new Set(values.filter(Boolean))]}
                        onChange={(next) => setValue(next || "")}
                        error={invalid && !value ? "Required" : undefined}
                      />
                    ) : (
                      <TextInput
                        aria-label="Criterion value"
                        placeholder="Search by name"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit(true);
                        }}
                        error={invalid && !value ? "Required" : undefined}
                      />
                    ))}
                  <ActionIcon
                    aria-label="Close criterion editor"
                    variant="subtle"
                    onClick={() => {
                      setEditor(false);
                      setInvalid(false);
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              )}
              <Tooltip label="Add criterion">
                <Button
                  aria-label="Add criterion"
                  variant="default"
                  className="dashed"
                  px={10}
                  onClick={() => (editor ? commit(false) : setEditor(true))}
                >
                  <IconPlus size={18} />
                </Button>
              </Tooltip>
              <Button aria-label="Search" px={10} onClick={() => commit(true)}>
                <IconSearch size={18} />
              </Button>
            </Group>
            <Tooltip label="Clear">
              <Button
                aria-label="Clear filters"
                color="red"
                variant="outline"
                className="dashed"
                px={10}
                onClick={() => {
                  setChips([]);
                  setValue("");
                  setCriterion(null);
                  setInvalid(false);
                  onSearch({});
                }}
              >
                <IconEraser size={18} />
              </Button>
            </Tooltip>
          </Group>
        </div>
      </Collapse>
    </section>
  );
}
