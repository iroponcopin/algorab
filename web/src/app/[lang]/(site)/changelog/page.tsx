import type { Metadata } from "next";
import { ChangelogPage } from "@/components/pages/ChangelogPage";
import { pageMeta } from "@/lib/meta";
import { type LangParams, langOf } from "@/lib/route";
import { NEXT_RELEASE } from "@/i18n/next-release";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const lang = await langOf(params);
  const n = NEXT_RELEASE[lang];
  return pageMeta(lang, "changelog/", n.changelogTitle, n.changelogLede);
}

export default async function Page({ params }: LangParams) {
  return <ChangelogPage lang={await langOf(params)} />;
}
