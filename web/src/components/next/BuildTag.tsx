import { BUILD_TAG } from "@/lib/next";

/** `CORVUS NEXT // V6.0`, set as telemetry: the same line in the header, the footer and the release manifest. */
export function BuildTag({ className = "" }: { className?: string }) {
  return (
    <span className={`cn-buildtag ${className}`.trim()} translate="no" dir="ltr">
      {BUILD_TAG}
    </span>
  );
}
