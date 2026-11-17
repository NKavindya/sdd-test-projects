import { Alert, Center, Stack, Title } from "@mantine/core";
import { type ReactNode, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Busy, PermissionResult } from "./components";
import Applications from "./scenes/Applications";
import Home from "./scenes/Home";
import Login from "./scenes/Login";
import { useSession } from "./services/session";
const Release = lazy(() => import("./scenes/Release"));
const Create = lazy(() => import("./scenes/Create"));
const Firmware = lazy(() => import("./scenes/Firmware"));
const Manage = lazy(() => import("./scenes/Manage"));
const ServiceProviders = lazy(() => import("./scenes/ServiceProviders"));
function Gate({
  scope,
  children,
}: {
  scope: string | string[];
  children: ReactNode;
}) {
  const { has } = useSession();
  return (Array.isArray(scope) ? scope.some(has) : has(scope)) ? (
    children
  ) : (
    <PermissionResult />
  );
}
function CreateRoute({ addRelease = false }: { addRelease?: boolean }) {
  const location = useLocation();
  return (
    <Create key={location.pathname + location.search} addRelease={addRelease} />
  );
}
function Protected() {
  const { username } = useSession();
  const location = useLocation();
  return username ? (
    <Home />
  ) : (
    <Navigate
      to={`/login?redirect=${encodeURIComponent("/app-publisher" + location.pathname + location.search)}`}
      replace
    />
  );
}
function Deferred({ label }: { label: string }) {
  return (
    <Center mih={450}>
      <Stack maw={550}>
        <Title order={2}>{label}</Title>
        <Alert title="Integration deferred">
          This integration is not available yet.
        </Alert>
      </Stack>
    </Center>
  );
}
export default function App() {
  return (
    <Suspense fallback={<Busy />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Navigate to="/apps" replace />} />
          <Route
            path="/apps"
            element={
              <Gate scope="am:pub:app:view">
                <Applications />
              </Gate>
            }
          />
          <Route
            path="/apps/releases/:uuid"
            element={
              <Gate scope="am:pub:app:view">
                <Release />
              </Gate>
            }
          />
          <Route
            path="/apps/:deviceType/:appId/add-release"
            element={<CreateRoute addRelease />}
          />
          <Route
            path="/firmware"
            element={
              <Gate scope="am:pub:app:view">
                <Firmware />
              </Gate>
            }
          />
          <Route
            path="/firmware/:appId/releases"
            element={
              <Gate scope="am:pub:app:view">
                <Firmware releases />
              </Gate>
            }
          />
          <Route
            path="/firmware/releases/:uuid"
            element={
              <Gate scope="am:pub:app:view">
                <Release firmware />
              </Gate>
            }
          />
          <Route path="/add-new-app/:variant" element={<CreateRoute />} />
          <Route
            path="/manage"
            element={
              <Gate scope={["am:pub:app:update", "am:admin:pub:app:update"]}>
                <Manage />
              </Gate>
            }
          />
          <Route
            path="/manage/service-providers"
            element={
              <Gate scope="am:pub:sp:app:view">
                <ServiceProviders />
              </Gate>
            }
          />
          <Route
            path="/manage/android-enterprise/pages/:pageName/:pageId"
            element={
              <Gate scope="and:enterprise:view">
                <Deferred label="Android Enterprise" />
              </Gate>
            }
          />
          <Route
            path="*"
            element={
              <Center mih={400}>
                <Stack>
                  <Title order={2}>Page not found</Title>
                  <a href="/app-publisher/apps">Go to applications</a>
                </Stack>
              </Center>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
