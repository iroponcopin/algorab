import Link from "next/link";
import { BuildTag } from "@/components/next/BuildTag";
import { IslandSim } from "@/components/next/IslandSim";
import type { IslandText } from "@/i18n/island";

export interface HomeCard {
  key: string;
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: string | null;
}

export interface HomeContent {
  heroLabel: string;
  title: [string, string];
  lede: string;
  cta: string;
  ctaHref: string;
  island: IslandText;
  models: { id: string; title: string; open: string; cards: HomeCard[] };
  explore: { id: string; title: string; open: string; cards: HomeCard[] };
  manifest: { title: string; versionLabel: string; version: string; buildLabel: string; href: string; cta: string };
}

function Card({ card, open, span }: { card: HomeCard; open: string; span: string }) {
  return (
    <Link href={card.href} className={`cn-card cn-glass cn-glass--lite ${span}`} data-glass="" data-spring="" data-brand={card.key}>
      <span className="cn-card-eyebrow">
        {card.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.icon} alt="" width={28} height={28} className="cn-card-icon" />
        ) : null}
        <span>{card.eyebrow}</span>
      </span>
      <span className="cn-card-title">{card.title}</span>
      <span className="cn-card-body">{card.body}</span>
      <span className="cn-card-open">
        {open} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

/**
 * The home page of Corvus NEXT: the Corvus Island V10174 simulator as the hero, then a spatial bento of the models and of
 * the rest of the site, then the release manifest. All content comes from the data pipeline and the i18n files.
 */
export function NextHome({ c }: { c: HomeContent }) {
  const modelSpans = ["cn-span-7", "cn-span-5", "cn-span-5", "cn-span-7"];
  const exploreSpans = ["cn-span-8", "cn-span-4", "cn-span-4", "cn-span-4", "cn-span-4", "cn-span-4"];
  return (
    <div className="cn-home">
      <section className="cn-hero" aria-label={c.heroLabel}>
        <BuildTag className="cn-hero-tag" />
        <h1 className="cn-hero-title">
          <span>{c.title[0]}</span> <span>{c.title[1]}</span>
        </h1>
        <p className="cn-hero-lede">{c.lede}</p>
        <Link href={c.ctaHref} className="ac-btn ac-btn--primary cn-hero-cta" data-magnetic="">
          {c.cta}
          <span aria-hidden="true">→</span>
        </Link>
        <IslandSim text={c.island} />
      </section>

      <section className="cn-band" id={c.models.id} aria-labelledby="cn-models-h">
        <h2 id="cn-models-h" className="cn-band-title">
          {c.models.title}
        </h2>
        <div className="cn-bento">
          {c.models.cards.map((card, i) => (
            <Card key={card.key} card={card} open={c.models.open} span={modelSpans[i % modelSpans.length] ?? "cn-span-6"} />
          ))}
        </div>
      </section>

      <section className="cn-band" id={c.explore.id} aria-labelledby="cn-explore-h">
        <h2 id="cn-explore-h" className="cn-band-title">
          {c.explore.title}
        </h2>
        <div className="cn-bento">
          {c.explore.cards.map((card, i) => (
            <Card key={card.key} card={card} open={c.explore.open} span={exploreSpans[i % exploreSpans.length] ?? "cn-span-4"} />
          ))}
        </div>
      </section>

      <section className="cn-band" aria-label={c.manifest.title}>
        <Link href={c.manifest.href} className="cn-manifest cn-glass cn-glass--lite" data-glass="" data-spring="">
          <span className="cn-manifest-cell">
            <span className="cn-card-eyebrow">{c.manifest.title}</span>
            <span className="cn-manifest-value">{c.manifest.version}</span>
            <span className="cn-card-body">{c.manifest.versionLabel}</span>
          </span>
          <span className="cn-manifest-cell cn-manifest-cell--end">
            <BuildTag />
            <span className="cn-card-open">
              {c.manifest.cta} <span aria-hidden="true">→</span>
            </span>
          </span>
        </Link>
      </section>
    </div>
  );
}
