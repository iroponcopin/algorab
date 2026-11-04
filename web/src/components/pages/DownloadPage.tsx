import { BuildTag } from "@/components/next/BuildTag";
import { FRESH } from "@/i18n/fresh";
import { NEXT_RELEASE } from "@/i18n/next-release";
import { NATIVE_APPS } from "@/i18n/native-apps";
import Link from "next/link";
import { asset, pathOf } from "@/lib/site";
import { langData, wiki } from "@/lib/wiki";
import type { Lang, LangData } from "@/lib/wiki-types";
import { FileCard, type FileCardLabels } from "../FileCard";


export function fileLabels(d: LangData): FileCardLabels {
  return { fileSize: d.chrome.fileSize, sha256: d.chrome.sha256, copy: d.chrome.copy, copied: d.chrome.copied };
}

/** The three Algorab 6 files (macOS, Windows, Linux), shared with the Store page. */
export function LauncherFiles({ d, lang }: { d: LangData; lang: Lang }) {
  const n = NEXT_RELEASE[lang];
  const labels = fileLabels(d);
  return (
    <div className="cn-tiles">
      {d.launcherFiles.corvus6.map((file) => (
        <FileCard
          key={file.platform}
          tag={`${file.label} · .${file.ext}`}
          file={file}
          note={file.platform === "macos" ? `${n.macSystem} · ${n.macStack}` : `${file.platform === "windows" ? n.winSystem : n.linuxSystem} · ${n.qtStack}`}
          cta={`${n.download} (${file.label})`}
          labels={labels}
        />
      ))}
    </div>
  );
}

/** The standalone Algorab apps (Audio, I/O): one block each, its files as tiles. */
function NativeApps({ d, lang }: { d: LangData; lang: Lang }) {
  const apps = d.launcherFiles.apps ?? [];
  if (apps.length === 0) return null;
  const c = NATIVE_APPS[lang];
  const labels = fileLabels(d);
  return (
    <>
      <header className="ac-wrap cn-dl-head cn-dl-block">
        <h2 id="dl-apps" className="cn-dl-title">
          {c.title}
        </h2>
        <p className="cn-dl-line">{c.lede}</p>
      </header>
      {apps.map((app) => (
        <section key={app.id} className="ac-wrap cn-dl-block" aria-labelledby={`dl-${app.id}`}>
          <header className="cn-dl-head">
            <h3 id={`dl-${app.id}`} className="cn-dl-title">
              {app.name} <span className="ac-ltr">{app.version}</span>
            </h3>
            {c.lines[app.id] ? <p className="cn-dl-line">{c.lines[app.id]}</p> : null}
          </header>
          <div className="cn-tiles">
            {app.files.map((file) => (
              <FileCard
                key={file.name}
                tag={`${file.label} · .${file.ext}`}
                file={file}
                note={file.note || undefined}
                cta={`${c.download} (${file.label})`}
                labels={labels}
              />
            ))}
          </div>
        </section>
      ))}
    </>
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
        <LauncherFiles d={d} lang={lang} />
        <p className="cn-dl-more">
          <Link className="ac-link" href={pathOf(lang, "changelog/")}>
            {dl.changelogLink}
          </Link>
        </p>
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

      <NativeApps d={d} lang={lang} />

      <header className="ac-wrap cn-dl-head cn-dl-block">
        <h2 id="dl-now" className="cn-dl-title">
          {n.currentHeading}
        </h2>
        <p className="cn-dl-line">{n.currentLede}</p>
        <p className="cn-dl-line">{n.javaEnds}</p>
      </header>

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
