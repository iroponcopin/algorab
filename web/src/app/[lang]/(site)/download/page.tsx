import type { Metadata } from "next";
import { DownloadPage } from "@/components/pages/DownloadPage";
import { pageMeta } from "@/lib/meta";
import { type LangParams, langOf } from "@/lib/route";
import { NEXT_RELEASE } from "@/i18n/next-release";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const lang = await langOf(params);
  const n = NEXT_RELEASE[lang];
  return pageMeta(lang, "download/", n.title, n.lede);
}

export default async function Page({ params }: LangParams) {
  return <DownloadPage lang={await langOf(params)} />;
}
