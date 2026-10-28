import type { Metadata } from "next";
import { NextHome, type HomeCard, type HomeContent } from "@/components/home/NextHome";
import { FRESH } from "@/i18n/fresh";
import { ISLAND } from "@/i18n/island";
import { THEATRE } from "@/i18n/theatre";
import { BRAND_ICON } from "@/lib/brands";
import { pageMeta } from "@/lib/meta";
import { inModelOrder } from "@/lib/models";
import { asset, isLang, pathOf } from "@/lib/site";
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
 * The home of Corvus NEXT: the Corvus Island simulator, the models, the rest of the site and the release manifest.
 * Every string is the data pipeline's or an i18n file's; nothing here is hard-coded content.
 */
export default async function Page({ params }: Params) {
  const { lang } = await params;
  if (!isLang(lang)) return null;
  const d = langData(lang);
  const f = FRESH[lang];
  const th = THEATRE[lang];
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
  const island = ISLAND[lang];
  const content: HomeContent = {
    heroLabel: th.label,
    title: th.title,
    lede: th.lede,
    cta: th.cta,
    ctaHref: href("download/"),
    island,
    models: { id: "models", title: d.home.brandsTitle, open: th.open, cards: models },
    explore: { id: "explore", title: d.home.explore, open: th.open, cards: explore },
    manifest: {
      title: island.manifest.title,
      versionLabel: `${island.manifest.version} · ${d.launcher.title}`,
      version: d.launcherFiles.version,
      buildLabel: island.manifest.build,
      href: href("download/"),
      cta: th.cta,
    },
  };
  return <NextHome c={content} />;
}
