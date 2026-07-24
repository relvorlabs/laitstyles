// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  withdraw: vi.fn(),
}));

vi.mock("./review-actions", () => ({
  submitReviewAction: mocks.submit,
  withdrawReviewAction: mocks.withdraw,
}));

import { ReviewForm } from "./review-form";

const body = "The piece arrived beautifully packed and fits exactly as expected.";

async function completeRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "5 stars" }));
  await user.type(screen.getByLabelText("Your review"), body);
}

describe("ReviewForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submit.mockResolvedValue({ status: "idle" });
    mocks.withdraw.mockResolvedValue({ status: "idle" });
  });

  it("presents a labelled rating group, five named radios, and visible review fields", () => {
    render(<ReviewForm intent="create" orderLineId="line-a" orderNumber="LS-1001" />);

    expect(screen.getByRole("group", { name: "Rating" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "1 star" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "2 stars" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "4 stars" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "5 stars" })).toBeTruthy();
    expect(screen.getByLabelText("Review title (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Your review")).toBeTruthy();
    expect(screen.getByLabelText("Fit")).toBeTruthy();
    expect(screen.getByText("0/2000")).toBeTruthy();
  });

  it("shows client validation beside the relevant fields", async () => {
    const user = userEvent.setup();
    render(<ReviewForm intent="create" orderLineId="line-a" orderNumber="LS-1001" />);

    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(await screen.findByText(/rating/i, { selector: "[role='alert']" })).toBeTruthy();
    expect(screen.getByText(/at least 20/i, { selector: "[role='alert']" })).toBeTruthy();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("shows pending copy while the Server Action is in flight", async () => {
    let resolveAction: ((value: { status: "idle" }) => void) | undefined;
    mocks.submit.mockImplementationOnce(
      () => new Promise<{ status: "idle" }>((resolve) => (resolveAction = resolve)),
    );
    const user = userEvent.setup();
    render(<ReviewForm intent="create" orderLineId="line-a" orderNumber="LS-1001" />);
    await completeRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(
      (await screen.findByRole("button", { name: "Submitting review…" })) as HTMLButtonElement,
    ).toMatchObject({ disabled: true });
    resolveAction?.({ status: "idle" });
  }, 15_000);

  it("renders field errors returned by the Server Action", async () => {
    mocks.submit.mockResolvedValueOnce({
      status: "error",
      code: "invalid-review-fields",
      message: "Check the highlighted review fields and try again.",
      fieldErrors: { body: ["Please add a little more detail."] },
    });
    const user = userEvent.setup();
    render(<ReviewForm intent="create" orderLineId="line-a" orderNumber="LS-1001" />);
    await completeRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(await screen.findByText("Please add a little more detail.")).toBeTruthy();
    expect(screen.getByText("Check the highlighted review fields and try again.")).toBeTruthy();
  }, 15_000);

  it("prefills an existing review for editing", () => {
    render(
      <ReviewForm
        intent="edit"
        orderLineId="line-a"
        orderNumber="LS-1001"
        defaultValues={{
          rating: 4,
          title: "A lasting favourite",
          body,
          fit: "runs_small",
        }}
      />,
    );

    expect(screen.getByRole<HTMLInputElement>("radio", { name: "4 stars" }).checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>("Review title (optional)").value).toBe(
      "A lasting favourite",
    );
    expect(screen.getByLabelText<HTMLTextAreaElement>("Your review").value).toBe(body);
    expect(screen.getByLabelText<HTMLSelectElement>("Fit").value).toBe("runs_small");
    expect(screen.getByRole("button", { name: "Update review" })).toBeTruthy();
  });

  it("requires a separate confirmation before withdrawing", async () => {
    const user = userEvent.setup();
    render(
      <ReviewForm
        allowWithdrawal
        intent="edit"
        orderLineId="line-a"
        orderNumber="LS-1001"
        defaultValues={{ rating: 5, body, fit: "true_to_size" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Withdraw review" }));
    expect(mocks.withdraw).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog", { name: "Withdraw your review?" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Yes, withdraw review" }));

    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledTimes(1));
    expect(mocks.withdraw.mock.calls[0]?.[0]).toEqual({ status: "idle" });
    const submitted = mocks.withdraw.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("orderNumber")).toBe("LS-1001");
    expect(submitted.get("orderLineId")).toBe("line-a");
  });

  it("renders an expected withdrawal failure inline", async () => {
    mocks.withdraw.mockResolvedValueOnce({
      status: "error",
      code: "withdrawal-failed",
      message: "We could not withdraw this review. Return to your order and try again.",
    });
    const user = userEvent.setup();
    render(
      <ReviewForm
        allowWithdrawal
        intent="edit"
        orderLineId="line-a"
        orderNumber="LS-1001"
        defaultValues={{ rating: 5, body, fit: "true_to_size" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Withdraw review" }));
    await user.click(screen.getByRole("button", { name: "Yes, withdraw review" }));

    expect(await screen.findByText("We could not withdraw this review")).toBeTruthy();
    expect(
      screen.getByText("We could not withdraw this review. Return to your order and try again."),
    ).toBeTruthy();
  });
});
