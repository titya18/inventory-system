export type PreviewItem = {
  url: string;
  type: "image" | "pdf";
};


export function normalizePreviewItems(
  input: string | File | (string | File)[] | null | undefined
): PreviewItem[] {
  if (!input) return [];

  const items = Array.isArray(input) ? input : [input];

  return items.map(item => {
    if (typeof item === "string") {
      return {
        url: item.startsWith("http")
          ? item
          : `${import.meta.env.VITE_API_URL}/${item}`,
        type: item.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
      };
    }

    const blobUrl = URL.createObjectURL(item);

    return {
      url: blobUrl,
      type: item.type === "application/pdf" ? "pdf" : "image",
    };
  });
}
