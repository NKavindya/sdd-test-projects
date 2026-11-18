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
import { Center, Stack, Title } from "@mantine/core";
import { type ReactNode, lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Busy, PermissionResult } from "./components";
import Applications from "./scenes/Applications";
import Home from "./scenes/Home";
import Login from "./scenes/Login";
import { useSession } from "./services/session";
const AndroidEnterprise = lazy(() => import("./scenes/AndroidEnterprise"));
const AppleVpp = lazy(() => import("./scenes/AppleVpp"));
const AndroidEnterprisePage = lazy(
  () => import("./scenes/AndroidEnterprisePage"),
);
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
          <Route
            path="/add-new-app/android-enterprise"
            element={<AndroidEnterprise />}
          />
          <Route path="/add-new-app/apple-vpp" element={<AppleVpp />} />
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
            element={<AndroidEnterprisePage />}
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
