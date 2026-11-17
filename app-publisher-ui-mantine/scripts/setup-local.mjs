import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
if (
  !existsSync(".local/localhost-key.pem") ||
  !existsSync(".local/localhost.pem")
) {
  mkdirSync(".local", { recursive: true });
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      ".local/localhost-key.pem",
      "-out",
      ".local/localhost.pem",
      "-days",
      "30",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );
}
if (!process.env.NODE_EXTRA_CA_CERTS)
  process.stderr.write(
    "Set NODE_EXTRA_CA_CERTS to the UEM PEM certificate before starting Vite. See README.md.\n",
  );
