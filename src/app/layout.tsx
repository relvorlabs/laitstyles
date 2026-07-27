import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";
import { type AppSession, ANONYMOUS_APP_SESSION } from "@/providers/session-provider";
import { AppProvider } from "@/providers/providers";
import { getCurrentSession } from "@/server/auth/session";
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
      email: session.email,
      displayName: session.displayName,
      role: session.kind === "staff" ? session.role : null,
    };
  }
  return ANONYMOUS_APP_SESSION;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await resolveAppSession();

  return (
    <html
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProvider session={session}>{children}</AppProvider>
      </body>
    </html>
  );
}
