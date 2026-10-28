import { CopyButton } from "./CopyButton";
import type { FileFacts } from "@/lib/wiki-types";

export interface FileCardLabels {
  fileSize: string;
  sha256: string;
  copy: string;
  copied: string;
}

/**
 * One downloadable file as a glass tile: the platform or version is the hero, then the file's name, its size (MB/KB to
 * one decimal, then the exact byte count), its SHA-256 with a copy button, and the download. The facts come from the
 * data pipeline untouched.
 */
export function FileCard({
  tag,
  file,
  note,
  cta,
  labels,
}: {
  tag: string;
  file: FileFacts;
  note?: string;
  cta: string;
  labels: FileCardLabels;
}) {
  return (
    <div className="cn-tile cn-glass cn-glass--lite" data-glass="">
      <span className="cn-tile-hero">{tag}</span>
      <span className="cn-tile-name ac-ltr">{file.name}</span>
      {note ? <p className="cn-tile-note">{note}</p> : null}
      <dl className="cn-facts">
        <div>
          <dt>{labels.fileSize}</dt>
          <dd className="ac-ltr">
            {file.sizeDisplay} ({file.bytesDisplay} bytes)
          </dd>
        </div>
        <div>
          <dt>{labels.sha256}</dt>
          <dd>
            <code className="ac-hash">{file.sha256}</code>
            <CopyButton text={file.sha256} label={labels.copy} done={labels.copied} />
          </dd>
        </div>
      </dl>
      <a className="ac-btn ac-btn--primary cn-tile-dl" href={file.url} download data-magnetic="">
        {cta}
      </a>
    </div>
  );
}
