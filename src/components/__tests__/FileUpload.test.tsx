import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileUpload, { type UploadedFile } from "../FileUpload";

const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

const uploadMock = vi.fn().mockResolvedValue({ error: null });
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/f" } });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
        getPublicUrl: (...args: unknown[]) => getPublicUrlMock(...args),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

function makeFile(name: string, type = "image/png") {
  return new File(["x"], name, { type });
}

/** Simulates selecting `count` files via the hidden file input. */
function selectFiles(input: HTMLInputElement, count: number) {
  const files = Array.from({ length: count }, (_, i) => makeFile(`f${i}.png`));
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

describe("FileUpload — respecting maxFiles", () => {
  beforeEach(() => {
    toastErrorMock.mockClear();
    uploadMock.mockClear();
  });

  it("tells the user how many files were skipped when more are selected than remaining slots allow", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileUpload userId="u1" files={[]} onChange={onChange} maxFiles={3} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    selectFiles(input, 5); // only 3 slots available, 2 should be dropped

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("2 files skipped"));
    // Only the allowed 3 were actually uploaded.
    expect(uploadMock).toHaveBeenCalledTimes(3);
  });

  it("does not warn about skipped files when the selection fits within the remaining slots", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileUpload userId="u1" files={[]} onChange={onChange} maxFiles={5} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    selectFiles(input, 2);

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(uploadMock).toHaveBeenCalledTimes(2);
  });

  it("still shows the existing max-files error when there are zero slots left", async () => {
    const onChange = vi.fn();
    const existing: UploadedFile[] = [
      { name: "a", path: "u1/a", url: "u", type: "image/png" },
      { name: "b", path: "u1/b", url: "u", type: "image/png" },
    ];
    const { container } = render(
      <FileUpload userId="u1" files={existing} onChange={onChange} maxFiles={2} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    selectFiles(input, 1);

    expect(toastErrorMock).toHaveBeenCalledWith("Max 2 files allowed");
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
