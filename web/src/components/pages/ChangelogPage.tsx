import { BuildTag } from "@/components/next/BuildTag";
import { NEXT_RELEASE } from "@/i18n/next-release";
import type { Lang } from "@/lib/wiki-types";

/**
 * The Corvus NEXT changelog. No Next build is released, so the page says so and lists no entries; the first release's
 * changes go here when it ships. The shared release feed is not rendered on this page: it carries text this page must
 * not show (see the report that added this page).
 */
export function ChangelogPage({ lang }: { lang: Lang }) {
  const n = NEXT_RELEASE[lang];
  return (
    <section id="ac-changelog">
      <div className="ac-wrap cn-dl-hero">
        <BuildTag />
        <h1 className="cn-dl-h1">{n.changelogTitle}</h1>
        <p className="ac-lead">{n.changelogLede}</p>
        <p className="cn-status">{n.statusLabel}</p>
      </div>
      <div className="ac-wrap cn-dl-block">
        <div className="cn-tile cn-glass cn-glass--lite" data-glass="">
          <span className="cn-tile-hero">{n.emptyTitle}</span>
          <p className="cn-tile-note">{n.emptyBody}</p>
        </div>
      </div>
    </section>
  );
}
