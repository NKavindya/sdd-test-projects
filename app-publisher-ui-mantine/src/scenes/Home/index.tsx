import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  Select,
  Tooltip,
} from "@mantine/core";
import {
  IconApps,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconPackage,
  IconPlugConnected,
  IconPlus,
  IconSettings,
  IconTarget,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConfirmAction } from "../../components";
import { EntgraFooter } from "../../components/EntgraFooter";
import { EntgraHeader } from "../../components/EntgraHeader";
import { EntgraSider } from "../../components/EntgraSider";
import { useSession } from "../../services/session";
import "./styles.css";
export default function Home() {
  const { has, username, logout } = useSession();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const entries = [
    {
      label: "Applications",
      path: "/apps",
      scope: "am:pub:app:view",
      icon: <IconApps size={17} />,
    },
    {
      label: "Firmware",
      path: "/firmware",
      scope: "am:pub:app:view",
      icon: <IconPackage size={17} />,
    },
    {
      label: "Public App",
      path: "/add-new-app/public",
      scope: "am:pub:pub-app:update",
    },
    {
      label: "Enterprise App",
      path: "/add-new-app/enterprise",
      scope: "am:pub:ent-app:update",
    },
    {
      label: "Web App",
      path: "/add-new-app/web-clip",
      scope: "am:pub:web-app:update",
    },
    {
      label: "Android Enterprise",
      path: "/add-new-app/android-enterprise",
      scope: "and:enterprise:view",
    },
    {
      label: "Apple VPP",
      path: "/add-new-app/apple-vpp",
      scope: "am:store:vpp:assets:modify",
    },
    { label: "General", path: "/manage", scope: "am:pub:app:update" },
    {
      label: "Service Providers",
      path: "/manage/service-providers",
      scope: "am:pub:sp:app:view",
    },
  ].filter(
    (x) =>
      has(x.scope) || (x.path === "/manage" && has("am:admin:pub:app:update")),
  );
  const go = (path: string) => {
    navigate(path);
    setMobile(false);
  };
  const leaf = (entry: (typeof entries)[number]) => (
    <NavLink
      key={entry.path}
      label={collapsed ? undefined : t(entry.label)}
      aria-label={t(entry.label)}
      leftSection={entry.icon}
      active={
        location.pathname === entry.path ||
        (entry.path === "/firmware" &&
          location.pathname.startsWith("/firmware/"))
      }
      onClick={() => go(entry.path)}
    />
  );
  return (
    <AppShell
      padding={20}
      navbar={{
        width: collapsed ? 80 : 250,
        breakpoint: "sm",
        collapsed: { mobile: !mobile },
      }}
    >
      <EntgraSider>
        <a
          href="/app-publisher/apps"
          className="brand"
          aria-label="Entgra App Publisher home"
        >
          <img src="/app-publisher/branding/logo-white.png" alt="Entgra" />
          {!collapsed && <span className="brand-wordmark">Entgra</span>}
        </a>
        <div className="sider-scroll">
          <NavLink
            className="publisher-root"
            label={!collapsed && "App Publisher"}
            leftSection={<IconApps size={17} />}
            defaultOpened
          >
            {entries
              .filter((x) => ["/apps", "/firmware"].includes(x.path))
              .map(leaf)}
            {entries.some((x) => x.path.startsWith("/add-new-app")) && (
              <NavLink
                label={!collapsed && t("Add New App")}
                aria-label="Add New App"
                leftSection={<IconPlus size={18} />}
                defaultOpened={location.pathname.startsWith("/add-new-app")}
              >
                {entries
                  .filter((x) => x.path.startsWith("/add-new-app"))
                  .map(leaf)}
              </NavLink>
            )}
            {entries.some((x) => x.path.startsWith("/manage")) && (
              <NavLink
                label={!collapsed && t("Configurations")}
                aria-label="Configurations"
                leftSection={<IconSettings size={18} />}
                defaultOpened={location.pathname.startsWith("/manage")}
              >
                {entries.filter((x) => x.path.startsWith("/manage")).map(leaf)}
                {has("and:enterprise:view") && (
                  <NavLink
                    label={t("Android Enterprise")}
                    onClick={() =>
                      go(
                        "/manage/android-enterprise/pages/configurations/default",
                      )
                    }
                  />
                )}
              </NavLink>
            )}
          </NavLink>
          {!has("dm:hide:endpoint:mgt") && (
            <NavLink
              component="a"
              href="/endpoint-mgt/"
              label={!collapsed && "Endpoint Mgt"}
              aria-label="Endpoint Manager"
              leftSection={<IconPlugConnected size={17} />}
            />
          )}{" "}
          {!has("dm:hide:app:store") && (
            <NavLink
              component="a"
              href="/store/"
              label={!collapsed && "App Store"}
              aria-label="App Store"
              leftSection={<IconPlugConnected size={17} />}
            />
          )}
        </div>
        <Tooltip
          label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <ActionIcon
            className="collapse-nav"
            variant="transparent"
            c="white"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() =>
              mobile ? setMobile(false) : setCollapsed(!collapsed)
            }
          >
            {collapsed ? (
              <IconChevronRight size={18} />
            ) : (
              <IconChevronLeft size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </EntgraSider>
      <AppShell.Main>
        <EntgraHeader>
          <Group wrap="nowrap" gap="xs">
            <Burger
              hiddenFrom="sm"
              opened={mobile}
              onClick={() => setMobile(!mobile)}
              aria-label="Toggle navigation"
              size="sm"
            />
            <IconTarget size={16} />
            <Select
              className="jump-select"
              aria-label="Navigate me to"
              placeholder={t("Navigate me to…")}
              searchable
              clearable
              value={null}
              data={entries.map((x) => ({ value: x.path, label: t(x.label) }))}
              onChange={(value) => value && go(value)}
              nothingFoundMessage="No matching pages"
            />
          </Group>
          <Group wrap="nowrap" gap="lg">
            <Select
              aria-label="Language"
              variant="unstyled"
              w={120}
              data={[
                { value: "en", label: "🇺🇸 English" },
                { value: "es", label: "🇪🇸 Español" },
                { value: "fr", label: "🇫🇷 Français" },
                { value: "ja", label: "🇯🇵 日本語" },
              ]}
              value={i18n.language}
              onChange={(value) => value && i18n.changeLanguage(value)}
            />
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  aria-label="User menu"
                  variant="transparent"
                  radius="xl"
                >
                  <Avatar size={32} color="blue">
                    <IconUser size={18} />
                  </Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{username}</Menu.Label>
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={() => setConfirmLogout(true)}
                >
                  {t("Logout")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </EntgraHeader>
        <main className="scene-outlet">
          <Outlet />
        </main>
        <EntgraFooter />
      </AppShell.Main>
      <ConfirmAction
        opened={confirmLogout}
        title="Confirm logout"
        message="Are you sure you want to sign out?"
        onClose={() => setConfirmLogout(false)}
        onConfirm={logout}
        danger={false}
      />
    </AppShell>
  );
}
