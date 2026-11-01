import { BuildTag } from "@/components/next/BuildTag";
import { FRESH } from "@/i18n/fresh";
import { NEXT_RELEASE, type NextRelease } from "@/i18n/next-release";
import Link from "next/link";
import { asset, pathOf } from "@/lib/site";
import { langData, wiki } from "@/lib/wiki";
import type { Lang, LangData } from "@/lib/wiki-types";
import { FileCard, type FileCardLabels } from "../FileCard";


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

/**
 * A Corvus NEXT platform that has no build yet: its facts, and a control that is visibly not a download. It is not a
 * link, so no address and no checksum can be shown for a file that does not exist.
 */
function NextPlatform({ name, system, stack, n }: { name: string; system: string; stack: string; n: NextRelease }) {
  return (
    <article className="cn-tile cn-glass cn-glass--lite" data-glass="">
      <span className="cn-tile-hero">{name}</span>
      <dl className="cn-facts">
        <div>
          <dt>{n.system}</dt>
          <dd>{system}</dd>
        </div>
        <div>
          <dt>{n.builtWith}</dt>
          <dd>{stack}</dd>
        </div>
      </dl>
      <span className="ac-btn cn-tile-dl cn-tile-dl--off" aria-disabled="true">
        {n.notReady}
      </span>
      <p className="cn-tile-note">{n.notReadyNote}</p>
    </article>
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
  const n = NEXT_RELEASE[lang];
  return (
    <section className="cn-dl">
      <div className="ac-wrap cn-dl-hero">
        <BuildTag />
        <h1 className="cn-dl-h1">{n.title}</h1>
        <p className="ac-lead">{n.lede}</p>
        <p className="cn-status">{n.statusLabel}</p>
      </div>

      <section className="ac-wrap cn-dl-block" aria-label={n.title}>
        <div className="cn-tiles">
          <NextPlatform name="macOS" system={n.macSystem} stack={n.macStack} n={n} />
          <NextPlatform name="Windows" system={n.toBeSet} stack={n.qtStack} n={n} />
          <NextPlatform name="Linux" system={n.toBeSet} stack={n.qtStack} n={n} />
        </div>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dl-open">
        <header className="cn-dl-head">
          <h2 id="dl-open" className="cn-dl-title">
            {n.openTitle}
          </h2>
          <p className="cn-dl-line">{n.openLede}</p>
        </header>
        <div className="cn-tiles cn-tiles--two">
          <article className="cn-tile cn-glass cn-glass--lite" data-glass="">
            <span className="cn-tile-hero">macOS</span>
            <ol className="cn-steps">
              {n.macSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article className="cn-tile cn-glass cn-glass--lite" data-glass="">
            <span className="cn-tile-hero">Windows</span>
            <ol className="cn-steps">
              {n.winSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="cn-tile-note">{n.linuxLine}</p>
          </article>
        </div>
      </section>

      <header className="ac-wrap cn-dl-head cn-dl-block">
        <h2 id="dl-now" className="cn-dl-title">
          {n.currentHeading}
        </h2>
        <p className="cn-dl-line">{n.currentLede}</p>
        <p className="cn-dl-line">{n.javaEnds}</p>
      </header>

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

    </section>
  );
}
