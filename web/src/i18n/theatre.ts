import type { Lang } from "@/lib/wiki-types";

/**
 * The home theatre's own copy (the template's scroll-scrubbed hero, with Algorab content): the hero block, the chapter
 * line above each model, the model link, and the closing Store block. Thirteen languages, no English fallback.
 */
export interface Theatre {
  /** The hero title, two lines (the template's "YOUR CINEMA. / BUILT AT HOME."). */
  title: [string, string];
  lede: string;
  /** The hero CTA: the Store download. */
  cta: string;
  /** "Chapter" before the chapter number. */
  chapter: string;
  /** The link under each model. */
  open: string;
  /** The closing block: title, lede and its CTA reuse `cta`. */
  endTitle: [string, string];
  endLede: string;
  /** The hero's accessible name. */
  label: string;
}

export const THEATRE: Record<Lang, Theatre> = {
  ja: {
    title: ["すべてのリリースが、", "ここに戻る。"],
    lede: "Halia、OUKA、Cherry、Tsubomi。Algorab Store ひとつで、すべてのモデルを入れて、更新して、遊べます。",
    cta: "Algorab Store をダウンロード",
    chapter: "章",
    open: "詳しく見る",
    endTitle: ["ひとつのストア。", "すべてのモデル。"],
    endLede: "Algorab Store が Minecraft とモデルの導入から更新までを引き受けます。macOS と Windows に対応。",
    label: "Algorab の紹介",
  },
  en: {
    title: ["Every release.", "Returns here."],
    lede: "Halia, OUKA, Cherry, Tsubomi. One Algorab Store installs, updates and launches every model.",
    cta: "Download Algorab Store",
    chapter: "Chapter",
    open: "Explore",
    endTitle: ["One store.", "Every model."],
    endLede: "Algorab Store handles Minecraft and every model, from the first install to each update. For macOS and Windows.",
    label: "Algorab introduction",
  },
  es: {
    title: ["Cada versión.", "Vuelve aquí."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Una sola Algorab Store instala, actualiza y abre cada modelo.",
    cta: "Descargar Algorab Store",
    chapter: "Capítulo",
    open: "Explorar",
    endTitle: ["Una tienda.", "Todos los modelos."],
    endLede: "Algorab Store se ocupa de Minecraft y de cada modelo, desde la primera instalación hasta cada actualización. Para macOS y Windows.",
    label: "Presentación de Algorab",
  },
  fr: {
    title: ["Chaque version.", "Revient ici."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Un seul Algorab Store installe, met à jour et lance chaque modèle.",
    cta: "Télécharger Algorab Store",
    chapter: "Chapitre",
    open: "Découvrir",
    endTitle: ["Une boutique.", "Tous les modèles."],
    endLede: "Algorab Store prend en charge Minecraft et chaque modèle, de la première installation à chaque mise à jour. Pour macOS et Windows.",
    label: "Présentation d'Algorab",
  },
  zh: {
    title: ["每一次发布，", "都回到这里。"],
    lede: "Halia、OUKA、Cherry、Tsubomi。一个 Algorab Store 即可安装、更新并启动所有模型。",
    cta: "下载 Algorab Store",
    chapter: "章节",
    open: "了解更多",
    endTitle: ["一个商店。", "所有模型。"],
    endLede: "Algorab Store 负责 Minecraft 与每个模型，从首次安装到每次更新。支持 macOS 和 Windows。",
    label: "Algorab 简介",
  },
  ko: {
    title: ["모든 릴리스가", "이곳으로 돌아옵니다."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Algorab Store 하나로 모든 모델을 설치하고, 업데이트하고, 실행합니다.",
    cta: "Algorab Store 다운로드",
    chapter: "챕터",
    open: "자세히 보기",
    endTitle: ["하나의 스토어.", "모든 모델."],
    endLede: "Algorab Store가 Minecraft와 모든 모델을 첫 설치부터 매 업데이트까지 맡습니다. macOS와 Windows 지원.",
    label: "Algorab 소개",
  },
  "pt-br": {
    title: ["Cada versão.", "Volta para cá."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Uma só Algorab Store instala, atualiza e abre cada modelo.",
    cta: "Baixar a Algorab Store",
    chapter: "Capítulo",
    open: "Explorar",
    endTitle: ["Uma loja.", "Todos os modelos."],
    endLede: "A Algorab Store cuida do Minecraft e de cada modelo, da primeira instalação a cada atualização. Para macOS e Windows.",
    label: "Apresentação da Algorab",
  },
  it: {
    title: ["Ogni versione.", "Torna qui."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Un solo Algorab Store installa, aggiorna e avvia ogni modello.",
    cta: "Scarica Algorab Store",
    chapter: "Capitolo",
    open: "Scopri",
    endTitle: ["Un solo store.", "Tutti i modelli."],
    endLede: "Algorab Store gestisce Minecraft e ogni modello, dalla prima installazione a ogni aggiornamento. Per macOS e Windows.",
    label: "Presentazione di Algorab",
  },
  ar: {
    title: ["كل إصدارة", "تعود إلى هنا."],
    lede: "Halia وOUKA وCherry وTsubomi. متجر Algorab Store واحد يثبّت كل نموذج ويحدّثه ويشغّله.",
    cta: "تنزيل Algorab Store",
    chapter: "الفصل",
    open: "استكشف",
    endTitle: ["متجر واحد.", "كل النماذج."],
    endLede: "يتولى Algorab Store أمر Minecraft وكل نموذج، من التثبيت الأول حتى كل تحديث. لنظامي macOS وWindows.",
    label: "تعريف بـ Algorab",
  },
  ru: {
    title: ["Каждый релиз", "возвращается сюда."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Один Algorab Store устанавливает, обновляет и запускает каждую модель.",
    cta: "Скачать Algorab Store",
    chapter: "Глава",
    open: "Подробнее",
    endTitle: ["Один магазин.", "Все модели."],
    endLede: "Algorab Store берёт на себя Minecraft и каждую модель — от первой установки до каждого обновления. Для macOS и Windows.",
    label: "Знакомство с Algorab",
  },
  id: {
    title: ["Setiap rilis.", "Kembali ke sini."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Satu Algorab Store memasang, memperbarui, dan menjalankan setiap model.",
    cta: "Unduh Algorab Store",
    chapter: "Bab",
    open: "Jelajahi",
    endTitle: ["Satu toko.", "Semua model."],
    endLede: "Algorab Store mengurus Minecraft dan setiap model, dari pemasangan pertama hingga setiap pembaruan. Untuk macOS dan Windows.",
    label: "Perkenalan Algorab",
  },
  de: {
    title: ["Jede Version.", "Kehrt hierher zurück."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Ein einziger Algorab Store installiert, aktualisiert und startet jedes Modell.",
    cta: "Algorab Store herunterladen",
    chapter: "Kapitel",
    open: "Entdecken",
    endTitle: ["Ein Store.", "Jedes Modell."],
    endLede: "Algorab Store übernimmt Minecraft und jedes Modell, von der ersten Installation bis zu jedem Update. Für macOS und Windows.",
    label: "Algorab vorgestellt",
  },
  tr: {
    title: ["Her sürüm", "buraya döner."],
    lede: "Halia, OUKA, Cherry, Tsubomi. Tek bir Algorab Store her modeli kurar, günceller ve başlatır.",
    cta: "Algorab Store'u indir",
    chapter: "Bölüm",
    open: "Keşfet",
    endTitle: ["Tek mağaza.", "Tüm modeller."],
    endLede: "Algorab Store, Minecraft'ı ve her modeli ilk kurulumdan her güncellemeye kadar yönetir. macOS ve Windows için.",
    label: "Algorab tanıtımı",
  },
};
