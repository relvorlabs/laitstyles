import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { cn } from "@/lib/utils";
import { getCurrentSession } from "@/modules/auth/server/session";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";
import { AppProvider } from "@/providers/providers";
import {
  ANONYMOUS_APP_SESSION,
  type AppSession,
  SessionProvider,
} from "@/providers/session-provider";
import "./theme-entry.css";

export const metadata: Metadata = {
  title: "Laitstyle",
  description: "One-of-one second-hand pieces from Lagos.",
  icons: {
    icon: "/brand/laitstyle-symbol.svg",
    shortcut: "/brand/laitstyle-symbol.svg",
  },
};

async function resolveAppSession(): Promise<AppSession> {
  const session = await getCurrentSession();
  if (session.kind === "consumer" || session.kind === "staff") {
    return {
      signedIn: true,
      identityKey: session.authUserId,
      email: session.email,
      displayName: session.displayName,
      role: session.kind === "staff" ? session.role : null,
    };
  }
  return ANONYMOUS_APP_SESSION;
}

// Cache Components requires the uncached session read to sit behind a
// Suspense boundary that covers every route (not just routes that happen to
// have their own, like the storefront's), so it's isolated in its own async
// component rather than awaited directly in RootLayout.
async function SessionSlot({ children }: { children: React.ReactNode }) {
  const session = await resolveAppSession();
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProvider>
          <Suspense fallback={<AppShellFallback />}>
            <SessionSlot>{children}</SessionSlot>
          </Suspense>
        </AppProvider>
      </body>
    </html>
  );
}
