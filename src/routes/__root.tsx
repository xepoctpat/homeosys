import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Homeostat";
const assetBase = import.meta.env.BASE_URL || "/";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#090a0c" },
      {
        name: "description",
        content:
          "A self-regulating cellular automaton. Heat, energy, and season shape occupancy; cybernetic feedback rewrites the rules when the field starts to fail.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${assetBase}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: `${assetBase}__grok/manifest.webmanifest` },
      { rel: "apple-touch-icon", href: `${assetBase}__grok/icon-180.png` },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const inner = (
    <>
      <PreviewHostBridge />
      <AuthProvider>
        <div className="h-dvh min-h-0 overflow-hidden">{children}</div>
      </AuthProvider>
    </>
  );

  if (typeof document !== "undefined" && document.getElementById("homeostat-root")) {
    return inner;
  }

  return (
    <html lang="en" className="h-dvh overflow-hidden antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="h-dvh overflow-hidden bg-bg font-sans text-fg">
        {inner}
        <Scripts />
      </body>
    </html>
  );
}
