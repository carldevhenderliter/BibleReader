import type { FathersGreekUndertextAnnotationFile } from "@/lib/fathers/types";

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<{
    getFileHandle: (
      name: string,
      options?: { create?: boolean }
    ) => Promise<{
      createWritable: () => Promise<{
        write: (contents: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }>;
};

export async function saveFathersAnnotationFile(
  annotationFile: FathersGreekUndertextAnnotationFile
): Promise<"filesystem" | "download"> {
  const fileContents = `${JSON.stringify(annotationFile, null, 2)}\n`;
  const browserWindow = window as DirectoryPickerWindow;

  if (typeof browserWindow.showDirectoryPicker === "function") {
    const directoryHandle = await browserWindow.showDirectoryPicker({
      mode: "readwrite"
    });
    const fileHandle = await directoryHandle.getFileHandle(`${annotationFile.workSlug}.json`, {
      create: true
    });
    const writable = await fileHandle.createWritable();

    await writable.write(fileContents);
    await writable.close();

    return "filesystem";
  }

  const downloadUrl = URL.createObjectURL(
    new Blob([fileContents], {
      type: "application/json"
    })
  );
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = `${annotationFile.workSlug}.json`;
  link.rel = "noopener";
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);

  return "download";
}
