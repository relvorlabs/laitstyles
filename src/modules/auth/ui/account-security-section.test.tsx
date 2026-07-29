// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  factors: vi.fn(),
  sessions: vi.fn(),
  requestEmail: vi.fn(),
  changePassword: vi.fn(),
  enrollTotp: vi.fn(),
  createChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
  removeFactor: vi.fn(),
  signOutOthers: vi.fn(),
}));

vi.mock("@/modules/auth/client/account-security-hooks", () => ({
  useAccountSecurityFactors: () => mocks.factors(),
  useAccountSecuritySessions: () => mocks.sessions(),
  useRequestAccountEmailChange: () => mutation(mocks.requestEmail),
  useChangeAccountPassword: () => mutation(mocks.changePassword),
  useEnrollTotp: () => mutation(mocks.enrollTotp),
  useCreateMfaChallenge: () => mutation(mocks.createChallenge),
  useVerifyMfaChallenge: () => mutation(mocks.verifyChallenge),
  useRemoveMfaFactor: () => mutation(mocks.removeFactor),
  useSignOutOtherSessions: () => mutation(mocks.signOutOthers),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    unoptimized: _unoptimized,
    ...props
  }: {
    alt: string;
    src: string;
    unoptimized?: boolean;
  }) => (
    // biome-ignore lint/performance/noImgElement: test-only stand-in for next/image.
    <img alt={alt} {...props} />
  ),
}));

import { AccountSecurityModals } from "@/modules/auth/ui/account-security-modals";
import { AccountSecuritySection } from "@/modules/auth/ui/account-security-section";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.factors.mockReturnValue({
    data: { factors: [] },
    isPending: false,
    isError: false,
  });
  mocks.sessions.mockReturnValue({
    data: {
      current: {
        sessionId: "session-1",
        authenticatedAt: "2026-07-29T10:00:00.000Z",
        assuranceLevel: "aal1",
      },
      otherSessions: { kind: "count-unavailable" },
    },
    isPending: false,
    isError: false,
  });
});

afterEach(cleanup);

describe("account security interactions", () => {
  it("opens the email-change workflow from the cumulative security page", async () => {
    const user = userEvent.setup();

    render(<AccountSecuritySection />);
    await user.click(screen.getByRole("button", { name: "Change email" }));

    expect(screen.getByRole("dialog", { name: "Change email." })).not.toBeNull();
    expect(screen.getByLabelText("New email address")).not.toBeNull();
  });

  it("keeps an email change pending until provider confirmation", async () => {
    const user = userEvent.setup();
    mocks.requestEmail.mockResolvedValueOnce({
      status: "confirmation-sent",
      email: "new@example.com",
    });

    render(<AccountSecurityModals modal="email" onClose={vi.fn()} onNotice={vi.fn()} />);
    await user.type(screen.getByLabelText("New email address"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Confirmation pending.")).not.toBeNull();
    expect(screen.getByText(/new@example\.com/)).not.toBeNull();
  });

  it("shows stable password validation and provider errors", async () => {
    const user = userEvent.setup();
    mocks.changePassword.mockRejectedValueOnce(new Error("Your current password is incorrect."));

    render(<AccountSecurityModals modal="password" onClose={vi.fn()} onNotice={vi.fn()} />);
    await user.type(screen.getByLabelText("Current password"), "WrongPassword1!");
    await user.type(screen.getByLabelText("New password"), "NewPassword1!");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Your current password is incorrect.",
    );
  });

  it("keeps TOTP enrollment unverified until challenge verification succeeds", async () => {
    const user = userEvent.setup();
    mocks.enrollTotp.mockResolvedValueOnce({
      status: "unverified",
      factorId: "factor-1",
      totp: {
        qrCode: "data:image/svg+xml,qr",
        secret: "ABCDEF123456",
        uri: "otpauth://totp/Laitstyle",
      },
    });
    mocks.createChallenge.mockResolvedValue({
      challengeId: "challenge-1",
      expiresAt: "2026-07-29T12:00:00.000Z",
    });
    mocks.verifyChallenge
      .mockRejectedValueOnce(new Error("That verification code is invalid or has expired."))
      .mockResolvedValueOnce({ status: "verified", factorId: "factor-1" });
    const notice = vi.fn();

    render(<AccountSecuritySection onNotice={notice} />);
    await user.click(screen.getByRole("button", { name: "Enable 2FA" }));
    await user.type(screen.getByLabelText("Authenticator name"), "My phone");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Verification pending.")).not.toBeNull();
    expect(screen.getByText("ABCDEF123456")).not.toBeNull();

    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify authenticator" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/invalid or has expired/i);

    await user.click(screen.getByRole("button", { name: "Verify authenticator" }));
    await waitFor(() => expect(notice).toHaveBeenCalledWith("Two-factor authentication enabled"));
  });

  it("challenges before confirmed removal of a verified factor", async () => {
    const user = userEvent.setup();
    mocks.factors.mockReturnValue({
      data: {
        factors: [
          {
            id: "factor-1",
            friendlyName: "My phone",
            factorType: "totp",
            status: "verified",
          },
        ],
      },
      isPending: false,
      isError: false,
    });
    mocks.createChallenge.mockResolvedValueOnce({
      challengeId: "challenge-1",
      expiresAt: "2026-07-29T12:00:00.000Z",
    });
    mocks.verifyChallenge.mockResolvedValueOnce({ status: "verified", factorId: "factor-1" });
    mocks.removeFactor.mockResolvedValueOnce({ status: "removed", factorId: "factor-1" });
    const notice = vi.fn();

    render(<AccountSecuritySection onNotice={notice} />);
    await user.click(screen.getByRole("button", { name: "Remove My phone" }));
    expect(screen.getByText("Remove this authenticator?")).not.toBeNull();
    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Remove authenticator" }));

    expect(mocks.createChallenge).toHaveBeenCalledWith({ factorId: "factor-1" });
    expect(mocks.verifyChallenge).toHaveBeenCalledWith({
      challengeId: "challenge-1",
      factorId: "factor-1",
      code: "123456",
    });
    expect(mocks.removeFactor).toHaveBeenCalledWith("factor-1");
    expect(notice).toHaveBeenCalledWith("Authenticator removed");
  });

  it("shows truthful session semantics and signs out only other sessions", async () => {
    const user = userEvent.setup();
    mocks.signOutOthers.mockResolvedValueOnce({ status: "signed-out" });
    const notice = vi.fn();

    render(<AccountSecuritySection onNotice={notice} />);

    expect(screen.queryByText(/Chrome on Windows|Safari on iPhone/)).toBeNull();
    expect(screen.getByText(/cannot list or name your other active sessions/i)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out others" }));
    await user.click(screen.getByRole("button", { name: "Confirm sign out" }));

    expect(mocks.signOutOthers).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledWith("Other sessions signed out");
  });
});

function mutation(mutateAsync: ReturnType<typeof vi.fn>) {
  return { mutateAsync, isPending: false };
}
