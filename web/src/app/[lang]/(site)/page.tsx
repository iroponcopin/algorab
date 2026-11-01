import type { Metadata } from "next";
import { NextHome, type HomeCard, type HomeContent } from "@/components/home/NextHome";
import { FRESH } from "@/i18n/fresh";
import { NEXT_RELEASE } from "@/i18n/next-release";
import { THEATRE } from "@/i18n/theatre";
import { BRAND_ICON } from "@/lib/brands";
import { pageMeta } from "@/lib/meta";
import { inModelOrder } from "@/lib/models";
import { asset, BASE_URL, isLang, pathOf } from "@/lib/site";
import { langData, lineupFor } from "@/lib/wiki";
import type { Lang } from "@/lib/wiki-types";

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  return pageMeta(lang as Lang, "", null, lineupFor(lang as Lang));
}

/** The four models the home presents, in the owner's order. */
const HOME_MODELS = ["halia", "ouka", "cherry", "tsubomi"] as const;

/**
 * The home of Corvus NEXT: the hero, the models, the rest of the site and the release manifest.
 * Every string is the data pipeline's or an i18n file's; nothing here is hard-coded content.
 */
export default async function Page({ params }: Params) {
  const { lang } = await params;
  if (!isLang(lang)) return null;
  const d = langData(lang);
  const f = FRESH[lang];
  const th = THEATRE[lang];
  const n = NEXT_RELEASE[lang];
  const c = d.chrome;
  const p = d.products;
  const t = d.launcher.text;
  const href = (section: string): string => pathOf(lang, section);
  const status = (id: string): string =>
    p[id]?.availability === "soon" ? t.comingSoon : p[id]?.availability === "archived" ? t.archived : t.available;
  const line: Record<(typeof HOME_MODELS)[number], string> = {
    halia: p.halia?.headline ?? "",
    ouka: d.brands.ouka.line,
    cherry: d.brands.cherry.line,
    tsubomi: p.tsubomi?.headline ?? "",
  };
  const models: HomeCard[] = inModelOrder([...HOME_MODELS]).map((id) => ({
    key: id,
    href: href(`${id}/`),
    eyebrow: `${p[id]?.version ? `V${p[id]?.version} · ` : ""}${status(id)}`,
    title: p[id]?.name ?? id,
    body: line[id],
    icon: asset(BRAND_ICON[id] ?? `icons/${id}.png`),
  }));
  const explore: HomeCard[] = [
    { key: "launcher", href: href("launcher/"), eyebrow: `${c.launcherVersion} ${d.launcherFiles.version}`, title: d.launcher.title, body: d.launcher.description, icon: asset("icons/store.png") },
    { key: "recipes", href: href("recipes/"), eyebrow: c.recipes, title: d.recipes.navTitle, body: d.recipes.description, icon: null },
    { key: "changelog", href: href("changelog/"), eyebrow: c.changelog, title: d.changelog.title, body: d.changelog.description, icon: null },
    { key: "announcement", href: href("announcement/"), eyebrow: f.announcement.title, title: f.announcement.title, body: f.announcement.description, icon: null },
    { key: "skin", href: href("skin/"), eyebrow: c.skin, title: d.skin.title, body: d.home.skinTile, icon: null },
    { key: "discord", href: href("discord/"), eyebrow: c.discord, title: d.discord.title, body: d.discord.description, icon: null },
  ];
  const content: HomeContent = {
    heroLabel: th.label,
    title: th.title,
    lede: th.lede,
    cta: n.homeCta,
    ctaHref: href("download/"),
    javaNote: n.javaEnds,
    showcase: {
      title: n.showTitle,
      body: n.showBody,
      caption: n.showCaption,
      alt: n.showCaption,
      video: { small: asset("art/next/languages-small.mp4"), large: asset("art/next/languages-large.mp4") },
      stills: (["en", "ja", "ar"] as const).map((l) => ({
        lang: l,
        small: asset(`art/next/languages-${l}-small.webp`),
        large: asset(`art/next/languages-${l}-large.webp`),
      })),
    },
    platforms: {
      title: n.platformsTitle,
      systemLabel: n.system,
      stackLabel: n.builtWith,
      items: [
        { name: "macOS", system: n.macSystem, stack: n.macStack },
        { name: "Windows", system: n.toBeSet, stack: n.qtStack },
        { name: "Linux", system: n.toBeSet, stack: n.qtStack },
      ],
    },
    models: { id: "models", title: d.home.brandsTitle, open: th.open, cards: models },
    explore: { id: "explore", title: d.home.explore, open: th.open, cards: explore },
    manifest: {
      title: n.manifestTitle,
      versionLabel: n.manifestLabel,
      version: n.manifestValue,
      href: href("download/"),
      cta: n.homeCta,
    },
  };
  const organization = { "@type": "Organization", name: "Corvus Dev", url: `${BASE_URL}/` };
  const structured = {
    "@context": "https://schema.org",
    "@graph": [organization, { "@type": "WebSite", name: "Corvus", url: `${BASE_URL}/`, inLanguage: lang, publisher: organization }],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <NextHome c={content} />
    </>
  );
}
