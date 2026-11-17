import { Breadcrumbs, Group, Text } from "@mantine/core";
import { IconHome, IconPackage } from "@tabler/icons-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
export function EntgraPageHeader({
  title,
  description,
  crumbs = [],
  icon,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: { label: string; to?: string }[];
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <header className="page-heading">
      <Group justify="space-between">
        <div className="page-title">
          {icon || <IconPackage size={17} />}
          <span>{t(title)}</span>
        </div>
        {actions}
      </Group>
      <Breadcrumbs separator="/" mt={12}>
        <Link to="/apps">
          <IconHome size={15} /> {t("Home")}
        </Link>
        {crumbs.map((item, index) =>
          item.to ? (
            <Link key={index} to={item.to}>
              {t(item.label)}
            </Link>
          ) : (
            <span key={index}>{t(item.label)}</span>
          ),
        )}
      </Breadcrumbs>
      {description && (
        <Text size="sm" mt={22}>
          {t(description)}
        </Text>
      )}
    </header>
  );
}
