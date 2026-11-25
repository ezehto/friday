import { FIXED } from "../chrome/fixedText";

export function PreviewBanner() {
  return (
    <p className="preview-banner label" role="note">
      {FIXED.previewBanner}
    </p>
  );
}
