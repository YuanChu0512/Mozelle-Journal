const previewMedia = new Map<string, string>([
  ["/articles/ddr5-96gb-8400.jpg", "/articles/ddr5-96gb-8400-preview.webp"],
  ["/articles/rtx5090-laptop-timespy.jpg", "/articles/rtx5090-laptop-timespy-preview.webp"],
  ["/articles/rtx5090-tse-details.png", "/articles/rtx5090-tse-details-preview.webp"],
  ["/articles/rtx5090-tse-rank.jpg", "/articles/rtx5090-tse-rank-preview.webp"],
  ["/articles/rtx5090-tse-result.png", "/articles/rtx5090-tse-result-preview.webp"],
  ["/articles/sparkle-cosplay-close.jpg", "/articles/sparkle-cosplay-close-preview.webp"],
  ["/articles/sparkle-cosplay-full.jpg", "/articles/sparkle-cosplay-full-preview.webp"],
]);

export function previewMediaUrl(source: string) {
  return previewMedia.get(source) ?? source;
}
