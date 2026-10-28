import type { Lang } from "@/lib/wiki-types";

/**
 * Copy for the Corvus Island simulator on the home page and for the release-manifest card. Thirteen languages, typed as
 * a record over Lang so a missing language is a compile error. The product name "Corvus Island" is a brand and is never
 * translated. All sample content is invented: the only person named is the sample account "Alex Morgan".
 * English and Japanese were written with care; the other eleven were written for this release and have not yet been
 * read by a native speaker.
 */
export interface IslandText {
  /** Accessible name of the whole simulator. */
  label: string;
  /** One line under the stage. */
  hint: string;
  /** Accessible name of the state switch. */
  stateGroup: string;
  states: { media: string; ai: string; download: string };
  expand: string;
  collapse: string;
  sample: string;
  /** Spoken when the state changes. */
  announce: { media: string; ai: string; download: string };
  media: { title: string; artist: string; play: string; pause: string; next: string; previous: string };
  ai: { prompt: string; thinking: string; ready: string };
  download: { file: string; label: string; done: string };
  manifest: { title: string; version: string; build: string };
}

export const ISLAND: Record<Lang, IslandText> = {
  ja: {
    label: "Corvus Island シミュレーター",
    hint: "島をドラッグすると、しずくが引き出されます。下で状態を選べます。",
    stateGroup: "状態",
    states: { media: "メディア", ai: "AI", download: "ダウンロード" },
    expand: "Corvus Island を広げる",
    collapse: "Corvus Island をたたむ",
    sample: "サンプルデータ",
    announce: { media: "メディア：「夜のドライブ」を再生中", ai: "AI：メモを要約しています", download: "ダウンロード：サンプルパックを取得中" },
    media: { title: "夜のドライブ", artist: "Alex Morgan", play: "再生", pause: "一時停止", next: "次へ", previous: "前へ" },
    ai: { prompt: "今日のメモを要約", thinking: "考えています", ready: "完了" },
    download: { file: "サンプルパック", label: "ダウンロード中", done: "完了" },
    manifest: { title: "リリースマニフェスト", version: "バージョン", build: "ビルド" },
  },
  en: {
    label: "Corvus Island simulator",
    hint: "Drag the island to pull a droplet out. Pick a state below.",
    stateGroup: "State",
    states: { media: "Media", ai: "AI", download: "Download" },
    expand: "Expand Corvus Island",
    collapse: "Collapse Corvus Island",
    sample: "Sample data",
    announce: { media: "Media: playing Midnight Drive", ai: "AI: summarising your notes", download: "Download: fetching the sample pack" },
    media: { title: "Midnight Drive", artist: "Alex Morgan", play: "Play", pause: "Pause", next: "Next", previous: "Previous" },
    ai: { prompt: "Summarise today's notes", thinking: "Thinking", ready: "Ready" },
    download: { file: "Sample pack", label: "Downloading", done: "Done" },
    manifest: { title: "Release manifest", version: "Version", build: "Build" },
  },
  es: {
    label: "Simulador de Corvus Island",
    hint: "Arrastra la isla para sacar una gota. Elige un estado abajo.",
    stateGroup: "Estado",
    states: { media: "Multimedia", ai: "IA", download: "Descarga" },
    expand: "Expandir Corvus Island",
    collapse: "Contraer Corvus Island",
    sample: "Datos de muestra",
    announce: { media: "Multimedia: reproduciendo «Conducción nocturna»", ai: "IA: resumiendo tus notas", download: "Descarga: obteniendo el paquete de muestra" },
    media: { title: "Conducción nocturna", artist: "Alex Morgan", play: "Reproducir", pause: "Pausar", next: "Siguiente", previous: "Anterior" },
    ai: { prompt: "Resume las notas de hoy", thinking: "Pensando", ready: "Listo" },
    download: { file: "Paquete de muestra", label: "Descargando", done: "Listo" },
    manifest: { title: "Manifiesto de la versión", version: "Versión", build: "Compilación" },
  },
  fr: {
    label: "Simulateur Corvus Island",
    hint: "Faites glisser l'île pour en tirer une goutte. Choisissez un état ci-dessous.",
    stateGroup: "État",
    states: { media: "Média", ai: "IA", download: "Téléchargement" },
    expand: "Développer Corvus Island",
    collapse: "Réduire Corvus Island",
    sample: "Données d'exemple",
    announce: { media: "Média : lecture de « Route de minuit »", ai: "IA : résumé de vos notes", download: "Téléchargement : récupération du pack d'exemple" },
    media: { title: "Route de minuit", artist: "Alex Morgan", play: "Lecture", pause: "Pause", next: "Suivant", previous: "Précédent" },
    ai: { prompt: "Résume les notes du jour", thinking: "Réflexion", ready: "Prêt" },
    download: { file: "Pack d'exemple", label: "Téléchargement", done: "Terminé" },
    manifest: { title: "Manifeste de version", version: "Version", build: "Build" },
  },
  zh: {
    label: "Corvus Island 模拟器",
    hint: "拖动灵动岛，可以拉出一滴液珠。在下方选择状态。",
    stateGroup: "状态",
    states: { media: "媒体", ai: "AI", download: "下载" },
    expand: "展开 Corvus Island",
    collapse: "收起 Corvus Island",
    sample: "示例数据",
    announce: { media: "媒体：正在播放《午夜驾驶》", ai: "AI：正在总结你的笔记", download: "下载：正在获取示例包" },
    media: { title: "午夜驾驶", artist: "Alex Morgan", play: "播放", pause: "暂停", next: "下一首", previous: "上一首" },
    ai: { prompt: "总结今天的笔记", thinking: "思考中", ready: "完成" },
    download: { file: "示例包", label: "正在下载", done: "完成" },
    manifest: { title: "发布清单", version: "版本", build: "构建" },
  },
  ko: {
    label: "Corvus Island 시뮬레이터",
    hint: "아일랜드를 드래그하면 물방울이 떨어져 나옵니다. 아래에서 상태를 고르세요.",
    stateGroup: "상태",
    states: { media: "미디어", ai: "AI", download: "다운로드" },
    expand: "Corvus Island 펼치기",
    collapse: "Corvus Island 접기",
    sample: "샘플 데이터",
    announce: { media: "미디어: ‘한밤의 드라이브’ 재생 중", ai: "AI: 메모를 요약하는 중", download: "다운로드: 샘플 팩을 받는 중" },
    media: { title: "한밤의 드라이브", artist: "Alex Morgan", play: "재생", pause: "일시 정지", next: "다음", previous: "이전" },
    ai: { prompt: "오늘 메모 요약", thinking: "생각 중", ready: "완료" },
    download: { file: "샘플 팩", label: "다운로드 중", done: "완료" },
    manifest: { title: "릴리스 매니페스트", version: "버전", build: "빌드" },
  },
  "pt-br": {
    label: "Simulador do Corvus Island",
    hint: "Arraste a ilha para puxar uma gota. Escolha um estado abaixo.",
    stateGroup: "Estado",
    states: { media: "Mídia", ai: "IA", download: "Download" },
    expand: "Expandir o Corvus Island",
    collapse: "Recolher o Corvus Island",
    sample: "Dados de exemplo",
    announce: { media: "Mídia: tocando “Direção à meia-noite”", ai: "IA: resumindo suas notas", download: "Download: baixando o pacote de exemplo" },
    media: { title: "Direção à meia-noite", artist: "Alex Morgan", play: "Reproduzir", pause: "Pausar", next: "Próxima", previous: "Anterior" },
    ai: { prompt: "Resuma as notas de hoje", thinking: "Pensando", ready: "Pronto" },
    download: { file: "Pacote de exemplo", label: "Baixando", done: "Concluído" },
    manifest: { title: "Manifesto da versão", version: "Versão", build: "Build" },
  },
  it: {
    label: "Simulatore di Corvus Island",
    hint: "Trascina l'isola per estrarre una goccia. Scegli uno stato qui sotto.",
    stateGroup: "Stato",
    states: { media: "Media", ai: "IA", download: "Download" },
    expand: "Espandi Corvus Island",
    collapse: "Comprimi Corvus Island",
    sample: "Dati di esempio",
    announce: { media: "Media: in riproduzione «Guida a mezzanotte»", ai: "IA: riassunto delle tue note", download: "Download: scarico del pacchetto di esempio" },
    media: { title: "Guida a mezzanotte", artist: "Alex Morgan", play: "Riproduci", pause: "Pausa", next: "Avanti", previous: "Indietro" },
    ai: { prompt: "Riassumi le note di oggi", thinking: "Sto pensando", ready: "Pronto" },
    download: { file: "Pacchetto di esempio", label: "Download in corso", done: "Completato" },
    manifest: { title: "Manifesto della versione", version: "Versione", build: "Build" },
  },
  ar: {
    label: "محاكي Corvus Island",
    hint: "اسحب الجزيرة لتخرج منها قطرة. اختر حالة من الأسفل.",
    stateGroup: "الحالة",
    states: { media: "الوسائط", ai: "الذكاء الاصطناعي", download: "التنزيل" },
    expand: "توسيع Corvus Island",
    collapse: "طيّ Corvus Island",
    sample: "بيانات تجريبية",
    announce: { media: "الوسائط: تشغيل «قيادة منتصف الليل»", ai: "الذكاء الاصطناعي: تلخيص ملاحظاتك", download: "التنزيل: جارٍ جلب الحزمة التجريبية" },
    media: { title: "قيادة منتصف الليل", artist: "Alex Morgan", play: "تشغيل", pause: "إيقاف مؤقت", next: "التالي", previous: "السابق" },
    ai: { prompt: "لخّص ملاحظات اليوم", thinking: "يفكّر", ready: "جاهز" },
    download: { file: "حزمة تجريبية", label: "جارٍ التنزيل", done: "اكتمل" },
    manifest: { title: "بيان الإصدار", version: "الإصدار", build: "البناء" },
  },
  ru: {
    label: "Симулятор Corvus Island",
    hint: "Потяните остров, чтобы вытянуть каплю. Выберите состояние ниже.",
    stateGroup: "Состояние",
    states: { media: "Медиа", ai: "ИИ", download: "Загрузка" },
    expand: "Развернуть Corvus Island",
    collapse: "Свернуть Corvus Island",
    sample: "Пример данных",
    announce: { media: "Медиа: играет «Полуночная поездка»", ai: "ИИ: краткое изложение ваших заметок", download: "Загрузка: получаем пробный пакет" },
    media: { title: "Полуночная поездка", artist: "Alex Morgan", play: "Воспроизвести", pause: "Пауза", next: "Далее", previous: "Назад" },
    ai: { prompt: "Кратко изложи заметки за сегодня", thinking: "Думаю", ready: "Готово" },
    download: { file: "Пробный пакет", label: "Загрузка", done: "Готово" },
    manifest: { title: "Манифест релиза", version: "Версия", build: "Сборка" },
  },
  id: {
    label: "Simulator Corvus Island",
    hint: "Seret pulau untuk menarik setetes cairan. Pilih status di bawah.",
    stateGroup: "Status",
    states: { media: "Media", ai: "AI", download: "Unduhan" },
    expand: "Perluas Corvus Island",
    collapse: "Ciutkan Corvus Island",
    sample: "Data contoh",
    announce: { media: "Media: memutar “Berkendara Tengah Malam”", ai: "AI: merangkum catatan Anda", download: "Unduhan: mengambil paket contoh" },
    media: { title: "Berkendara Tengah Malam", artist: "Alex Morgan", play: "Putar", pause: "Jeda", next: "Berikutnya", previous: "Sebelumnya" },
    ai: { prompt: "Rangkum catatan hari ini", thinking: "Berpikir", ready: "Siap" },
    download: { file: "Paket contoh", label: "Mengunduh", done: "Selesai" },
    manifest: { title: "Manifes rilis", version: "Versi", build: "Build" },
  },
  de: {
    label: "Simulator für Corvus Island",
    hint: "Ziehen Sie an der Insel, um einen Tropfen herauszulösen. Wählen Sie unten einen Zustand.",
    stateGroup: "Zustand",
    states: { media: "Medien", ai: "KI", download: "Download" },
    expand: "Corvus Island aufklappen",
    collapse: "Corvus Island einklappen",
    sample: "Beispieldaten",
    announce: { media: "Medien: „Mitternachtsfahrt“ wird abgespielt", ai: "KI: Ihre Notizen werden zusammengefasst", download: "Download: Beispielpaket wird geladen" },
    media: { title: "Mitternachtsfahrt", artist: "Alex Morgan", play: "Wiedergabe", pause: "Pause", next: "Weiter", previous: "Zurück" },
    ai: { prompt: "Fasse die heutigen Notizen zusammen", thinking: "Denkt nach", ready: "Fertig" },
    download: { file: "Beispielpaket", label: "Wird geladen", done: "Fertig" },
    manifest: { title: "Release-Manifest", version: "Version", build: "Build" },
  },
  tr: {
    label: "Corvus Island simülatörü",
    hint: "Bir damla çekmek için adayı sürükleyin. Aşağıdan bir durum seçin.",
    stateGroup: "Durum",
    states: { media: "Medya", ai: "Yapay zekâ", download: "İndirme" },
    expand: "Corvus Island'ı genişlet",
    collapse: "Corvus Island'ı daralt",
    sample: "Örnek veri",
    announce: { media: "Medya: “Gece Yarısı Yolculuğu” çalıyor", ai: "Yapay zekâ: notlarınız özetleniyor", download: "İndirme: örnek paket alınıyor" },
    media: { title: "Gece Yarısı Yolculuğu", artist: "Alex Morgan", play: "Oynat", pause: "Duraklat", next: "Sonraki", previous: "Önceki" },
    ai: { prompt: "Bugünün notlarını özetle", thinking: "Düşünüyor", ready: "Hazır" },
    download: { file: "Örnek paket", label: "İndiriliyor", done: "Bitti" },
    manifest: { title: "Sürüm manifestosu", version: "Sürüm", build: "Derleme" },
  },
};
