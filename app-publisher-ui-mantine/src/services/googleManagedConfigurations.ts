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
export interface ManagedConfigFrame {
  register(
    event: "onconfigupdated" | "onconfigdeleted",
    handler: (event: unknown) => void,
    filter: unknown,
  ): void;
  close(): void;
}
export interface GoogleIframeApi {
  CROSS_ORIGIN_IFRAMES_FILTER: unknown;
  getContext(): {
    openChild(options: {
      url: string;
      where: HTMLElement;
      attributes: { style: string; scrolling: string; title: string };
    }): ManagedConfigFrame;
  };
}
interface GoogleClient {
  load(module: string, callback: () => void): void;
  iframes?: GoogleIframeApi;
}
declare global {
  interface Window {
    gapi?: GoogleClient;
  }
}
let loading: Promise<GoogleIframeApi> | undefined;
export function loadManagedConfigurationClient(): Promise<GoogleIframeApi> {
  if (window.gapi?.iframes) return Promise.resolve(window.gapi.iframes);
  if (loading) return loading;
  loading = new Promise<GoogleIframeApi>((resolve, reject) => {
    let script: HTMLScriptElement | undefined;
    const timer = window.setTimeout(() => {
      script?.remove();
      reject(new Error("ae.managedClientError"));
    }, 25000);
    const fail = () => {
      window.clearTimeout(timer);
      reject(new Error("ae.managedClientError"));
    };
    const initialize = () => {
      if (!window.gapi) {
        fail();
        return;
      }
      try {
        window.gapi.load("gapi.iframes", () => {
          window.clearTimeout(timer);
          if (window.gapi?.iframes) resolve(window.gapi.iframes);
          else fail();
        });
      } catch {
        fail();
      }
    };
    if (window.gapi) initialize();
    else {
      script = document.createElement("script");
      script.src = "https://apis.google.com/js/client.js";
      script.async = true;
      script.onload = initialize;
      script.onerror = () => {
        script?.remove();
        fail();
      };
      document.head.appendChild(script);
    }
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
