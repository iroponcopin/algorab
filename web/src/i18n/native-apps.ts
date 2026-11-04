import type { Lang } from "@/lib/wiki-types";

/**
 * The download page's section for the standalone Algorab apps (Algorab Audio, Algorab I/O). Thirteen languages, typed as
 * a record over Lang: a missing language is a compile error. The apps are not signed, so the lede points at the opening
 * steps already on the page. Languages other than English and Japanese have not been read by a native speaker.
 */
export interface NativeAppsCopy {
  title: string;
  lede: string;
  /** One line per app, keyed by its manifest block. */
  lines: Record<string, string>;
  download: string;
}

export const NATIVE_APPS: Record<Lang, NativeAppsCopy> = {
  en: {
    title: "Algorab apps",
    lede: "Separate apps from the Algorab Developer Program. They are not signed yet, so open them the same way as Algorab 6 above.",
    lines: {
      algorab_audio: "Make music: synths, drums, piano roll, mixer, mastering and export.",
      algorab_io: "Route sound between apps, microphones and speakers by drawing a cable.",
    },
    download: "Download",
  },
  ja: {
    title: "Algorab のアプリ",
    lede: "Algorab Developer Program の単体アプリです。まだ署名がないので、上の Algorab 6 と同じ手順で開いてください。",
    lines: {
      algorab_audio: "曲を作るアプリです。シンセ、ドラム、ピアノロール、ミキサー、マスタリング、書き出しができます。",
      algorab_io: "アプリ、マイク、スピーカーの間の音を、線を引くだけでつなぎ替えられるアプリです。",
    },
    download: "ダウンロード",
  },
  es: {
    title: "Apps de Algorab",
    lede: "Apps independientes del Algorab Developer Program. Aún no están firmadas, así que ábrelas igual que Algorab 6, más arriba.",
    lines: {
      algorab_audio: "Crea música: sintetizadores, batería, piano roll, mezclador, masterización y exportación.",
      algorab_io: "Lleva el sonido entre apps, micrófonos y altavoces trazando un cable.",
    },
    download: "Descargar",
  },
  fr: {
    title: "Applications Algorab",
    lede: "Des applications à part, de l’Algorab Developer Program. Elles ne sont pas encore signées : ouvrez-les comme Algorab 6, plus haut.",
    lines: {
      algorab_audio: "Faites de la musique : synthés, batterie, piano roll, table de mixage, mastering et export.",
      algorab_io: "Faites passer le son entre applications, micros et enceintes en tirant un câble.",
    },
    download: "Télécharger",
  },
  zh: {
    title: "Algorab 应用",
    lede: "来自 Algorab Developer Program 的独立应用。目前尚未签名，请按上方 Algorab 6 的方法打开。",
    lines: {
      algorab_audio: "制作音乐：合成器、鼓、钢琴卷帘、混音器、母带处理和导出。",
      algorab_io: "画一条线，就能在应用、麦克风和扬声器之间传送声音。",
    },
    download: "下载",
  },
  ko: {
    title: "Algorab 앱",
    lede: "Algorab Developer Program의 단독 앱입니다. 아직 서명되지 않았으니 위의 Algorab 6과 같은 방법으로 여세요.",
    lines: {
      algorab_audio: "음악을 만드세요: 신스, 드럼, 피아노 롤, 믹서, 마스터링, 내보내기.",
      algorab_io: "선을 그어 앱, 마이크, 스피커 사이로 소리를 보냅니다.",
    },
    download: "다운로드",
  },
  "pt-br": {
    title: "Apps da Algorab",
    lede: "Apps independentes do Algorab Developer Program. Ainda não são assinados, então abra-os do mesmo jeito que o Algorab 6, acima.",
    lines: {
      algorab_audio: "Faça música: sintetizadores, bateria, piano roll, mixer, masterização e exportação.",
      algorab_io: "Leve o som entre apps, microfones e alto-falantes desenhando um cabo.",
    },
    download: "Baixar",
  },
  it: {
    title: "App di Algorab",
    lede: "App a sé dell’Algorab Developer Program. Non sono ancora firmate: aprile come Algorab 6, qui sopra.",
    lines: {
      algorab_audio: "Fai musica: synth, batteria, piano roll, mixer, mastering ed esportazione.",
      algorab_io: "Porta il suono tra app, microfoni e altoparlanti tracciando un cavo.",
    },
    download: "Scarica",
  },
  ar: {
    title: "تطبيقات Algorab",
    lede: "تطبيقات مستقلة من Algorab Developer Program. لم تُوقَّع بعد، لذا افتحها بالطريقة نفسها التي تفتح بها Algorab 6 في الأعلى.",
    lines: {
      algorab_audio: "اصنع الموسيقى: مُركِّبات، طبول، لفافة بيانو، مازج، إتقان صوتي وتصدير.",
      algorab_io: "انقل الصوت بين التطبيقات والميكروفونات ومكبرات الصوت برسم كابل.",
    },
    download: "تنزيل",
  },
  ru: {
    title: "Приложения Algorab",
    lede: "Отдельные приложения от Algorab Developer Program. Они пока не подписаны, поэтому открывайте их так же, как Algorab 6 выше.",
    lines: {
      algorab_audio: "Создавайте музыку: синтезаторы, ударные, пианоролл, микшер, мастеринг и экспорт.",
      algorab_io: "Направляйте звук между приложениями, микрофонами и колонками, просто протянув кабель.",
    },
    download: "Скачать",
  },
  id: {
    title: "Aplikasi Algorab",
    lede: "Aplikasi terpisah dari Algorab Developer Program. Belum ditandatangani, jadi buka dengan cara yang sama seperti Algorab 6 di atas.",
    lines: {
      algorab_audio: "Buat musik: synth, drum, piano roll, mixer, mastering, dan ekspor.",
      algorab_io: "Alirkan suara antara aplikasi, mikrofon, dan speaker dengan menarik kabel.",
    },
    download: "Unduh",
  },
  de: {
    title: "Algorab-Apps",
    lede: "Eigenständige Apps des Algorab Developer Program. Sie sind noch nicht signiert, also öffnen Sie sie wie Algorab 6 weiter oben.",
    lines: {
      algorab_audio: "Musik machen: Synths, Drums, Piano Roll, Mischpult, Mastering und Export.",
      algorab_io: "Leiten Sie Ton zwischen Apps, Mikrofonen und Lautsprechern, indem Sie ein Kabel ziehen.",
    },
    download: "Herunterladen",
  },
  tr: {
    title: "Algorab uygulamaları",
    lede: "Algorab Developer Program’ın ayrı uygulamaları. Henüz imzalı değiller; yukarıdaki Algorab 6 gibi açın.",
    lines: {
      algorab_audio: "Müzik yapın: synth, davul, piyano rulosu, mikser, mastering ve dışa aktarma.",
      algorab_io: "Bir kablo çizerek sesi uygulamalar, mikrofonlar ve hoparlörler arasında yönlendirin.",
    },
    download: "İndir",
  },
};
