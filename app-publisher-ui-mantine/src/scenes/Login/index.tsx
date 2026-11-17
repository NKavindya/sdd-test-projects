import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorText, request } from "../../services/api";
import { safeRedirect, useSession } from "../../services/session";
import "./styles.css";
export default function Login() {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const redirect = safeRedirect(
    new URLSearchParams(location.search).get("redirect"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useForm({
    initialValues: { username: "", password: "" },
    validate: {
      username: (value) => (value.trim() ? null : "Username is required"),
      password: (value) => (value ? null : "Password is required"),
    },
  });
  useEffect(() => {
    if (!session.username && session.isSso)
      window.location.assign(
        `${session.config.serverConfig.ssoLoginUri}?redirect=${encodeURIComponent(redirect)}`,
      );
  }, [session.username, session.isSso, redirect, session.config]);
  if (session.username)
    return <Navigate to={redirect.replace("/app-publisher", "")} replace />;
  return (
    <Center className="login-page">
      <Paper className="login-card" p={36} withBorder>
        <Stack>
          <Text c="blue" fw={600}>
            Entgra UEM
          </Text>
          <Title order={2}>App Publisher</Title>
          <Text c="dimmed" size="sm">
            Sign in to manage your application catalogue.
          </Text>
          {error && (
            <Alert color="red" title="Invalid Login Details">
              {error}
            </Alert>
          )}
          <form
            onSubmit={form.onSubmit(async (values) => {
              setBusy(true);
              setError("");
              try {
                await request(
                  "POST",
                  session.config.serverConfig.loginUri,
                  new URLSearchParams({ ...values, platform: "publisher" }),
                  {
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                    },
                  },
                );
                form.setFieldValue("password", "");
                await session.refresh();
                navigate(redirect.replace("/app-publisher", ""), {
                  replace: true,
                });
              } catch (failure) {
                setError(errorText(failure));
              } finally {
                setBusy(false);
              }
            })}
          >
            <Stack>
              <TextInput
                label="Username"
                autoComplete="username"
                required
                {...form.getInputProps("username")}
              />
              <PasswordInput
                label="Password"
                autoComplete="current-password"
                required
                {...form.getInputProps("password")}
              />
              <Button type="submit" loading={busy} fullWidth mt="sm">
                Sign In
              </Button>
            </Stack>
          </form>
          {session.isSso && (
            <Button
              variant="light"
              onClick={() =>
                window.location.assign(
                  `${session.config.serverConfig.ssoLoginUri}?redirect=${encodeURIComponent(redirect)}`,
                )
              }
            >
              Continue with SSO
            </Button>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}
