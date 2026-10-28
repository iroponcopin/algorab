import { FRESH } from "@/i18n/fresh";
import { langData, wiki } from "@/lib/wiki";
import type { Lang } from "@/lib/wiki-types";
import { asset } from "@/lib/site";
import { CommandBrowser } from "../discord/CommandBrowser";
import { MissionControl } from "../home/MissionControl";
import { HOME_V2 } from "@/i18n/home";
import { TrustedHtml } from "../Rich";


export function DiscordPage({ lang }: { lang: Lang }) {
  const d = langData(lang);
  const w = wiki();
  const k = d.discord;
  const f = FRESH[lang];
  const st = k.status;
  const steps: [string, string][] = [
    [k.s1_h, k.s1_p],
    [k.s2_h, k.s2_p],
    [k.s3_h, k.s3_p],
    [k.s4_h, k.s4_p],
  ];
  return (
    <>
      <section className="cn-model-hero">
        <div className="ac-wrap cn-model-grid">
          <div className="cn-model-copy">
            <p className="ac-eyebrow">{k.eyebrow}</p>
            <h1 className="cn-model-name">{k.title}</h1>
            <p className="cn-model-line">{k.lede}</p>
            <div className="cn-model-actions">
              {w.discord.invite ? (
                <a className="ac-btn ac-btn--primary" href={w.discord.invite} target="_blank" rel="noopener noreferrer" data-magnetic="">
                  {k.invite}
                </a>
              ) : null}
            </div>
            <p className="cn-model-lead">{k.invite_note}</p>
          </div>
          <div className="cn-model-icon cn-glass cn-glass--lite" data-glass="" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("icons/store.png")} alt="" width={320} height={320} />
          </div>
        </div>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-status">
        <h2 id="dc-status" className="cn-dl-title">
          {st.statusTitle}
        </h2>
        <dl className="cn-tiles cn-stats">
          <div className="cn-stat cn-glass cn-glass--lite" data-glass="">
            <dt>{st.statusInvite}</dt>
            <dd>{st.published}</dd>
          </div>
          <div className="cn-stat cn-glass cn-glass--lite" data-glass="">
            <dt>{st.statusPermissions}</dt>
            <dd className="ac-ltr">{w.discord.permissions}</dd>
          </div>
          <div className="cn-stat cn-glass cn-glass--lite" data-glass="">
            <dt>{st.statusLatest}</dt>
            <dd className="ac-ltr" lang="en">
              {w.discord.latest.title} · {w.discord.latest.date}
            </dd>
          </div>
          <div className="cn-stat cn-glass cn-glass--lite" data-glass="">
            <dt>{st.statusFeed}</dt>
            <dd className="ac-ltr">
              {w.discord.feed.date} · {w.discord.feed.count}
            </dd>
          </div>
        </dl>
        <p className="cn-dl-line">{st.statusNote}</p>
        <MissionControl
          labels={{
            feeds: f.nexus.feeds,
            ping: f.nexus.ping,
            pinging: f.nexus.pinging,
            latency: f.nexus.latency,
            measured: f.nexus.measured,
            unreachable: f.nexus.unreachable,
            inspect: HOME_V2[lang].telemetry.inspect,
            payload: HOME_V2[lang].telemetry.payload,
            bytes: HOME_V2[lang].telemetry.bytes,
            modified: HOME_V2[lang].telemetry.modified,
            truncated: HOME_V2[lang].telemetry.truncated,
            drawer: HOME_V2[lang].telemetry.drawer,
          }}
        />
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-setup">
        <h2 id="dc-setup" className="cn-dl-title">
          {k.setup_title}
        </h2>
        <ol className="cn-tiles cn-steps">
          {steps.map(([h, p], i) => (
            <li key={h} className="cn-stat cn-glass cn-glass--lite" data-glass="">
              <span className="cn-step-n" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{h}</h3>
              <TrustedHtml html={p} className="cn-stat-p" as="p" />
              {i === 3 ? (
                <span className="ac-kinds ac-ltr">
                  {w.discord.routeKinds.map((kind) => (
                    <code key={kind}>{kind}</code>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-posts">
        <h2 id="dc-posts" className="cn-dl-title">
          {k.posts_title}
        </h2>
        <p className="cn-dl-line">{k.posts_p}</p>
        <ul className="cn-tiles cn-posts">
          <li className="cn-stat cn-glass cn-glass--lite" data-glass="">{k.post_update}</li>
          <li className="cn-stat cn-glass cn-glass--lite" data-glass="">{k.post_upcoming}</li>
          <li className="cn-stat cn-glass cn-glass--lite" data-glass="">{k.post_intake}</li>
        </ul>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-cmds">
        <h2 id="dc-cmds" className="cn-dl-title">
          {k.cmds_title}
        </h2>
        <CommandBrowser
          groups={k.groups}
          labels={{
            thCmd: k.th_cmd,
            thWhat: k.th_what,
            thWho: k.th_who,
            whoAll: k.who_all,
            whoAdmin: k.who_admin,
            copy: d.chrome.copy,
            copied: d.chrome.copied,
            filter: f.nexus.filter,
          }}
        />
        <p className="cn-dl-line">{k.rate_note}</p>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-lang">
        <h2 id="dc-lang" className="cn-dl-title">
          {k.lang_title}
        </h2>
        <p>{k.lang_p}</p>
        <ul className="cn-tiles cn-langs">
          {w.discord.languages.map((code) => (
            <li key={code} className="cn-stat cn-glass cn-glass--lite">
              <span lang={code}>{w.discord.languageNames[code] ?? code}</span>
              <code>{code}</code>
            </li>
          ))}
        </ul>
        <p className="cn-dl-line">{k.lang_note}</p>
      </section>

      <section className="ac-wrap cn-dl-block" aria-labelledby="dc-priv">
        <h2 id="dc-priv" className="cn-dl-title">
          {k.privacy_title}
        </h2>
        <p>{k.privacy_p}</p>
      </section>
    </>
  );
}
