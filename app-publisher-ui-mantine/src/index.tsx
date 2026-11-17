import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./services/internationalization";
import { SessionProvider } from "./services/session";
const theme = createTheme({
  primaryColor: "entgra",
  primaryShade: 6,
  colors: {
    entgra: [
      "#eef7fc",
      "#dcecf6",
      "#b7d5e9",
      "#8bbbd9",
      "#65a4cb",
      "#4d93c2",
      "#4288BA",
      "#3275a4",
      "#24658f",
      "#1c4c75",
    ],
  },
  fontFamily: "Poppins, sans-serif",
  defaultRadius: "md",
  fontSizes: { sm: "13px", md: "14px" },
  headings: { fontWeight: "600" },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <BrowserRouter basename="/app-publisher">
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
);
