import { FRESH } from "@/i18n/fresh";
import { NEXT_RELEASE } from "@/i18n/next-release";
import { langData } from "@/lib/wiki";
import type { Lang } from "@/lib/wiki-types";
import { Changelog } from "../changelog/Changelog";

/**
 * The Algorab changelog: every release of every brand that has one, newest first, with the three headings every
 * release lists (New Features, Bug Fixes, Refinements). The data is extracted at build time by web/scripts/extract_wiki.py,
 * which removes forbidden text (scripts/changelog_filter.py); the filter by product (`?model=<brand id>`) is client-side,
 * so every release is already in the exported HTML.
 */
export function ChangelogPage({ lang }: { lang: Lang }) {
  const c = langData(lang).changelog;
  const n = NEXT_RELEASE[lang];
  return (
    <section id="ac-changelog">
      <div className="ac-wrap cn-dl-hero">
        <h1 className="cn-dl-h1">{n.changelogTitle}</h1>
        <p className="ac-lead">{n.changelogLede}</p>
      </div>
      <div className="ac-wrap">
        <Changelog brands={c.brands} labels={c.labels} noteBrands={c.noteBrands} ui={FRESH[lang].changelogUi} />
      </div>
    </section>
  );
}
