import { BuildTag } from "@/components/next/BuildTag";
import { FRESH } from "@/i18n/fresh";
import Link from "next/link";
import { asset, pathOf } from "@/lib/site";
import { langData, wiki } from "@/lib/wiki";
import type { Lang, LangData } from "@/lib/wiki-types";
import { FileCard, type FileCardLabels } from "../FileCard";
import { AstraeaEnded } from "./AstraeaEnded";


export function fileLabels(d: LangData): FileCardLabels {
  return { fileSize: d.chrome.fileSize, sha256: d.chrome.sha256, copy: d.chrome.copy, copied: d.chrome.copied };
}

/** The four Corvus Store files (macOS, Windows, Linux, jar), shared with the Store page. */
export function LauncherFiles({ d }: { d: LangData }) {
  const f = d.launcherFiles;
  const labels = fileLabels(d);
  return (
    <div className="cn-tiles">
      {f.native.map((n) => (
        <FileCard
          key={n.platform}
          tag={`${n.label} · .${n.ext}`}
          file={n}
          note={n.platform === "macos" ? d.launcher.macNote : undefined}
          cta={`${d.launcher.cta} (${n.label})`}
          labels={labels}
        />
      ))}
      <FileCard tag={`${d.chrome.launcherVersion} ${f.version} · .jar`} file={f.jar} note={d.launcher.jarNote} cta={d.launcher.cta} labels={labels} />
    </div>
  );
}

/** A model's download: its icon, its name as the hero, one line, then its file tile. */
function ModelDownload({ id, heading, line, children, aside }: { id: string; heading: string; line?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="ac-wrap cn-dl-block" aria-labelledby={id}>
      <header className="cn-dl-head">
        <h2 id={id} className="cn-dl-title">
          {heading}
        </h2>
        {line ? <p className="cn-dl-line">{line}</p> : null}
      </header>
      <div className="cn-tiles cn-tiles--two">
        {children}
        {aside}
      </div>
    </section>
  );
}

function Aside({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="cn-aside cn-glass cn-glass--lite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(`icons/${icon}.png`)} alt="" width={72} height={72} className="cn-aside-icon" />
      {children}
    </div>
  );
}

export function DownloadPage({ lang }: { lang: Lang }) {
  const d = langData(lang);
  const w = wiki();
  const dl = d.download;
  const f = FRESH[lang];
  const labels = fileLabels(d);
  const mc = w.versions.mc;
  const mcLine = <p className="cn-aside-line ac-ltr">Minecraft {mc} · Fabric</p>;
  return (
    <section className="cn-dl">
      <div className="ac-wrap cn-dl-hero">
        <p className="ac-eyebrow">
          {d.chrome.launcher} <span className="ac-ltr">{d.launcherFiles.version}</span>
        </p>
        <BuildTag />
        <h1 className="cn-dl-h1">{dl.heading}</h1>
        <p className="ac-lead">{dl.body}</p>
      </div>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dl-store">
        <header className="cn-dl-head">
          <h2 id="dl-store" className="cn-dl-title">
            {dl.nativeHeading}
          </h2>
          <p className="cn-dl-line">{dl.nativeNote}</p>
        </header>
        <LauncherFiles d={d} />
        <p className="cn-dl-more">
          <Link className="ac-link" href={pathOf(lang, "changelog/")}>
            {dl.changelogLink}
          </Link>
        </p>
      </section>

      {dl.halia ? (
        <ModelDownload id="dl-halia" heading={`Halia ${d.products.halia?.jp ?? ""}`.trim()} line={d.products.halia?.tagline} aside={<Aside icon="halia">{mcLine}</Aside>}>
          <FileCard tag={`${d.chrome.version} ${dl.halia.version}`} file={dl.halia.file} cta={d.chrome.primaryCta} labels={labels} />
        </ModelDownload>
      ) : null}

      {d.products.astraea?.availability === "archived" ? (
        <section className="ac-wrap cn-dl-block" aria-labelledby="astraea-ended-h">
          <AstraeaEnded lang={lang} />
        </section>
      ) : dl.astraea ? (
        <ModelDownload id="dl-astraea" heading="ASTRAEA" line={d.products.astraea?.tagline} aside={<Aside icon="astraea">{mcLine}</Aside>}>
          <FileCard tag={`${d.chrome.version} ${dl.astraea.version}`} file={dl.astraea.file} cta={d.chrome.primaryCta} labels={labels} />
        </ModelDownload>
      ) : null}

      {dl.tsubomi ? (
        <ModelDownload id="dl-tsubomi" heading={`Tsubomi ${d.products.tsubomi?.jp ?? ""}`.trim()} line={d.products.tsubomi?.tagline} aside={<Aside icon="tsubomi">{mcLine}</Aside>}>
          <FileCard tag={`${d.chrome.version} ${dl.tsubomi.version}`} file={dl.tsubomi.file} cta={d.chrome.primaryCta} labels={labels} />
        </ModelDownload>
      ) : null}

      <ModelDownload
        id="dl-aureum"
        heading={dl.aureum.heading}
        line={dl.aureum.body}
        aside={
          <Aside icon="aureum">
            <p className="cn-aside-line">{dl.aureum.note}</p>
            <Link className="ac-link" href={pathOf(lang, "aureum/")}>
              Aureum <span className="ac-flip">{d.chrome.arrow}</span>
            </Link>
          </Aside>
        }
      >
        <FileCard tag={`${d.chrome.version} ${dl.aureum.version}`} file={dl.aureum.file} cta={dl.aureum.cta} labels={labels} />
      </ModelDownload>

      {dl.agent ? (
        <ModelDownload id="dl-agent" heading={f.agent.title} line={f.agent.body} aside={<Aside icon="store"><p className="cn-aside-line">{f.agent.note}</p></Aside>}>
          <FileCard tag={`${d.chrome.version} ${dl.agent.version}`} file={dl.agent.file} cta={d.chrome.primaryCta} labels={labels} />
        </ModelDownload>
      ) : null}

      <section className="ac-wrap cn-dl-block" aria-labelledby="dl-discord">
        <header className="cn-dl-head">
          <h2 id="dl-discord" className="cn-dl-title">
            {dl.discord.heading}
          </h2>
          <p className="cn-dl-line">{dl.discord.body}</p>
        </header>
        <p className="cn-dl-actions">
          {w.discord.invite ? (
            <a className="ac-btn ac-btn--primary" href={w.discord.invite} target="_blank" rel="noopener">
              {dl.discord.cta}
            </a>
          ) : null}
          <Link className="ac-link" href={pathOf(lang, "discord/")}>
            {d.chrome.discord} <span className="ac-flip">{d.chrome.arrow}</span>
          </Link>
        </p>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dl-alpha">
        <header className="cn-dl-head">
          <h2 id="dl-alpha" className="cn-dl-title">
            Alpha
          </h2>
          <p className="cn-dl-line">
            {dl.alphaNote}{" "}
            <Link className="ac-link" href={pathOf(lang, "alpha/")}>
              <span className="ac-ltr">{dl.alphaVersion}</span> <span className="ac-flip">{d.chrome.arrow}</span>
            </Link>
          </p>
        </header>
      </section>
    </section>
  );
}
