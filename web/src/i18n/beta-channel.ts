import type { Lang } from "@/lib/wiki-types";

/**
 * The Beta section of the download page (beta/glimpse_manifest.json offers something newer than stable). Thirteen
 * languages, typed as a record over Lang: a missing language is a compile error. Shown only while the beta copy offers
 * a newer Windows build or Algorab Agents build; labelled Beta everywhere, because nothing in it is released as stable.
 * Japanese is the owner's text (2026-11-16). The other languages are drafts that a native speaker has not read yet.
 */
export interface BetaChannelCopy {
  /** The heading, and the label on each beta file's tile. */
  title: string;
  /** One plain statement: these versions are not fully checked yet. */
  lede: string;
  /** How to join: the setting to turn on, in the app's own words. */
  join: string;
  /** Under the Algorab Agents tile: it arrives through the app once the beta is switched on. */
  agentLine: string;
  /** What is sent while the beta is on (the same meaning as the app's sheet). */
  sends: string;
}

export const BETA_CHANNEL: Record<Lang, BetaChannelCopy> = {
  ja: {
    title: "ベータ版",
    lede: "ほかの人より先に届く版です。まだ確認が終わっていません。",
    join: "参加するには、Algorab の「設定」で「ベータ版を受け取る」を入にします。",
    agentLine: "Algorab Agents のこの版は、ベータ版を入にすると、アプリから届きます。",
    sends: "ベータ版を使っている間、Algorab Agents が algorab.uk へ小さな報告を送ります。内容は、Algorab と Algorab Agents のバージョン、Windows・macOS・Linux のバージョン、起動や更新がうまくいったかどうか、SteamCMD の状態の行です。名前、フォルダーの場所、アドレス、パスワード、プレイヤーの発言や行動は入りません。報告を受け取るサーバーには、どのウェブサイトでも同じように送信元のインターネット上のアドレスが見えますが、保存しません。最後に送った報告の控えはコンピューターに残ります。ベータ版をやめると報告は止まり、コンピューターを見分けるための番号も消えます。",
  },
  en: {
    title: "Beta",
    lede: "Versions that reach people before everyone else. They are not fully checked yet.",
    join: "To join, open Settings in Algorab and turn on Receive beta versions.",
    agentLine: "This Algorab Agents version arrives through the app once beta versions are turned on.",
    sends: "While the beta is on, Algorab Agents sends a small report to algorab.uk. The report holds the versions of Algorab and Algorab Agents, the version of Windows, macOS or Linux, whether starts and updates worked, and the SteamCMD status lines. It holds no names, folder locations, addresses, passwords, or anything players say or do. The server that receives a report sees the Internet address of the sender, as any website does, but does not keep it. A copy of the last report stays on the computer. Turning the beta off stops the reports and deletes the number that marks the computer.",
  },
  es: {
    title: "Beta",
    lede: "Versiones que llegan a la gente antes que a los demás. Todavía no están completamente comprobadas.",
    join: "Para participar, abre Ajustes en Algorab y activa Recibir versiones beta.",
    agentLine: "Esta versión de Algorab Agents llega a través de la app cuando se activan las versiones beta.",
    sends: "Mientras la beta esté activada, Algorab Agents envía a algorab.uk un pequeño informe. El informe contiene las versiones de Algorab y de Algorab Agents, la versión de Windows, macOS o Linux, si el inicio y las actualizaciones funcionaron y las líneas de estado de SteamCMD. No contiene nombres, ubicaciones de carpetas, direcciones, contraseñas ni nada de lo que digan o hagan los jugadores. El servidor que recibe un informe ve la dirección de Internet del remitente, como cualquier sitio web, pero no la guarda. Una copia del último informe enviado queda en el ordenador. Al desactivar la beta, los informes se detienen y se borra el número que identifica el ordenador.",
  },
  fr: {
    title: "Bêta",
    lede: "Des versions qui arrivent aux utilisateurs avant les autres. Elles ne sont pas encore entièrement vérifiées.",
    join: "Pour participer, ouvrez Réglages dans Algorab et activez Recevoir les versions bêta.",
    agentLine: "Cette version d'Algorab Agents arrive par l'application une fois les versions bêta activées.",
    sends: "Pendant que la bêta est activée, Algorab Agents envoie un petit rapport à algorab.uk. Le rapport contient les versions d'Algorab et d'Algorab Agents, la version de Windows, de macOS ou de Linux, si les démarrages et les mises à jour ont réussi, et les lignes d'état de SteamCMD. Il ne contient ni noms, ni emplacements de dossiers, ni adresses, ni mots de passe, ni rien de ce que disent ou font les joueurs. Le serveur qui reçoit un rapport voit l'adresse Internet de l'expéditeur, comme tout site web, mais ne la conserve pas. Une copie du dernier rapport envoyé reste sur l'ordinateur. Désactiver la bêta arrête les rapports et supprime le numéro qui identifie l'ordinateur.",
  },
  zh: {
    title: "测试版",
    lede: "比其他人更早送达的版本。尚未完成全部检查。",
    join: "参加方法：在 Algorab 中打开“设置”，开启“接收测试版”。",
    agentLine: "开启测试版后，此版本的 Algorab Agents 会通过应用送达。",
    sends: "开启测试版期间，Algorab Agents 会向 algorab.uk 发送一份小报告。报告包含 Algorab 和 Algorab Agents 的版本、Windows、macOS 或 Linux 的版本、启动和更新是否成功，以及 SteamCMD 的状态行。报告不包含名称、文件夹位置、地址、密码，也不包含玩家的发言或行为。接收报告的服务器和任何网站一样能看到发送方的互联网地址，但不会保存。最后一份报告的副本会保留在电脑上。关闭测试版会停止报告，并删除用于区分这台电脑的编号。",
  },
  ko: {
    title: "베타",
    lede: "다른 사람보다 먼저 받는 버전입니다. 아직 모두 확인되지 않았습니다.",
    join: "참여하려면 Algorab의 '설정'을 열고 '베타 버전 받기'를 켜세요.",
    agentLine: "베타 버전을 켜면 이 Algorab Agents 버전이 앱을 통해 도착합니다.",
    sends: "베타를 켜 두는 동안 Algorab Agents는 algorab.uk로 작은 보고서를 보냅니다. 보고서에는 Algorab과 Algorab Agents의 버전, Windows·macOS·Linux의 버전, 시작과 업데이트가 잘 되었는지 여부, SteamCMD 상태 줄이 들어 있습니다. 이름, 폴더 위치, 주소, 비밀번호, 플레이어의 말이나 행동은 들어 있지 않습니다. 보고서를 받는 서버는 어느 웹사이트와 마찬가지로 보낸 쪽의 인터넷 주소를 보지만 저장하지 않습니다. 마지막으로 보낸 보고서의 사본은 컴퓨터에 남습니다. 베타를 끄면 보고서 전송이 멈추고, 컴퓨터를 구분하는 번호도 삭제됩니다.",
  },
  "pt-br": {
    title: "Beta",
    lede: "Versões que chegam às pessoas antes das demais. Ainda não foram totalmente verificadas.",
    join: "Para participar, abra Ajustes no Algorab e ative Receber versões beta.",
    agentLine: "Esta versão do Algorab Agents chega pelo aplicativo quando as versões beta estão ativadas.",
    sends: "Enquanto a beta estiver ativada, o Algorab Agents envia um pequeno relatório para algorab.uk. O relatório contém as versões do Algorab e do Algorab Agents, a versão do Windows, macOS ou Linux, se as inicializações e atualizações funcionaram e as linhas de estado do SteamCMD. Ele não contém nomes, locais de pastas, endereços, senhas nem nada que os jogadores digam ou façam. O servidor que recebe um relatório vê o endereço de Internet do remetente, como qualquer site, mas não o guarda. Uma cópia do último relatório enviado fica no computador. Desativar a beta interrompe os relatórios e apaga o número que identifica o computador.",
  },
  it: {
    title: "Beta",
    lede: "Versioni che arrivano alle persone prima delle altre. Non sono ancora state verificate del tutto.",
    join: "Per partecipare, apri Impostazioni in Algorab e attiva Ricevi versioni beta.",
    agentLine: "Questa versione di Algorab Agents arriva tramite l'app quando le versioni beta sono attivate.",
    sends: "Mentre la beta è attiva, Algorab Agents invia un piccolo rapporto ad algorab.uk. Il rapporto contiene le versioni di Algorab e di Algorab Agents, la versione di Windows, macOS o Linux, se avvio e aggiornamenti sono riusciti e le righe di stato di SteamCMD. Non contiene nomi, percorsi di cartelle, indirizzi, password né ciò che i giocatori dicono o fanno. Il server che riceve un rapporto vede l'indirizzo Internet del mittente, come ogni sito web, ma non lo conserva. Una copia dell'ultimo rapporto inviato resta sul computer. Disattivare la beta interrompe i rapporti e cancella il numero che identifica il computer.",
  },
  ar: {
    title: "بيتا",
    lede: "إصدارات تصل إلى المستخدمين قبل غيرهم. لم يكتمل التحقق منها بعد.",
    join: "للمشاركة، افتح «الإعدادات» في Algorab وفعّل «استلام الإصدارات التجريبية».",
    agentLine: "يصل هذا الإصدار من Algorab Agents عبر التطبيق بعد تفعيل الإصدارات التجريبية.",
    sends: "أثناء تفعيل النسخة التجريبية، يرسل Algorab Agents تقريرًا صغيرًا إلى algorab.uk. يتضمن التقرير إصدارات Algorab وAlgorab Agents، وإصدار Windows أو macOS أو Linux، وما إذا كانت عمليات التشغيل والتحديث قد نجحت، وأسطر حالة SteamCMD. ولا يتضمن أسماء أو مواقع مجلدات أو عناوين أو كلمات مرور أو أي شيء يقوله اللاعبون أو يفعلونه. يرى الخادم الذي يستقبل التقرير عنوان الإنترنت للمُرسِل كما يفعل أي موقع إلكتروني، لكنه لا يحفظه. تبقى نسخة من آخر تقرير أُرسل على الكمبيوتر. ويؤدي إيقاف النسخة التجريبية إلى إيقاف التقارير وحذف الرقم الذي يميّز الكمبيوتر.",
  },
  ru: {
    title: "Бета",
    lede: "Версии, которые получают раньше остальных. Их проверка ещё не завершена.",
    join: "Чтобы присоединиться, откройте «Настройки» в Algorab и включите «Получать бета-версии».",
    agentLine: "Эта версия Algorab Agents приходит через приложение, когда включены бета-версии.",
    sends: "Пока бета включена, Algorab Agents отправляет на algorab.uk небольшой отчёт. В отчёте есть версии Algorab и Algorab Agents, версия Windows, macOS или Linux, успешны ли запуск и обновления, и строки состояния SteamCMD. В нём нет имён, расположения папок, адресов, паролей и ничего из того, что говорят или делают игроки. Сервер, принимающий отчёт, видит интернет-адрес отправителя, как любой сайт, но не сохраняет его. Копия последнего отправленного отчёта остаётся на компьютере. Выключение беты останавливает отчёты и удаляет номер, по которому различается компьютер.",
  },
  id: {
    title: "Beta",
    lede: "Versi yang sampai ke pengguna lebih dulu daripada yang lain. Belum sepenuhnya diperiksa.",
    join: "Untuk ikut, buka Pengaturan di Algorab dan aktifkan Terima versi beta.",
    agentLine: "Versi Algorab Agents ini sampai lewat aplikasi setelah versi beta diaktifkan.",
    sends: "Selama beta aktif, Algorab Agents mengirim laporan kecil ke algorab.uk. Laporan berisi versi Algorab dan Algorab Agents, versi Windows, macOS, atau Linux, apakah start dan pembaruan berhasil, dan baris status SteamCMD. Laporan tidak berisi nama, lokasi folder, alamat, kata sandi, atau apa pun yang dikatakan atau dilakukan pemain. Server yang menerima laporan melihat alamat Internet pengirim seperti situs web mana pun, tetapi tidak menyimpannya. Salinan laporan terakhir yang dikirim tetap ada di komputer. Mematikan beta menghentikan laporan dan menghapus nomor yang menandai komputer.",
  },
  de: {
    title: "Beta",
    lede: "Versionen, die vor allen anderen ankommen. Sie sind noch nicht vollständig geprüft.",
    join: "Zum Mitmachen öffnest du in Algorab die Einstellungen und schaltest Beta-Versionen empfangen ein.",
    agentLine: "Diese Version von Algorab Agents kommt über die App, sobald Beta-Versionen eingeschaltet sind.",
    sends: "Solange die Beta eingeschaltet ist, sendet Algorab Agents einen kleinen Bericht an algorab.uk. Der Bericht enthält die Versionen von Algorab und Algorab Agents, die Version von Windows, macOS oder Linux, ob Starts und Aktualisierungen geklappt haben, und die SteamCMD-Statuszeilen. Er enthält keine Namen, Ordnerpfade, Adressen, Passwörter und nichts davon, was Spielende sagen oder tun. Der Server, der einen Bericht empfängt, sieht wie jede Website die Internetadresse des Absenders, speichert sie aber nicht. Eine Kopie des letzten gesendeten Berichts bleibt auf dem Computer. Wenn du die Beta ausschaltest, hören die Berichte auf, und die Nummer, die den Computer kennzeichnet, wird gelöscht.",
  },
  tr: {
    title: "Beta",
    lede: "Diğerlerinden önce insanlara ulaşan sürümler. Henüz tam olarak kontrol edilmedi.",
    join: "Katılmak için Algorab'da Ayarlar'ı açın ve Beta sürümleri al seçeneğini açın.",
    agentLine: "Beta sürümleri açıldığında bu Algorab Agents sürümü uygulama üzerinden gelir.",
    sends: "Beta açıkken Algorab Agents, algorab.uk adresine küçük bir rapor gönderir. Rapor; Algorab ve Algorab Agents sürümlerini, Windows, macOS veya Linux sürümünü, başlatma ve güncellemelerin başarılı olup olmadığını ve SteamCMD durum satırlarını içerir. Ad, klasör konumu, adres, parola ve oyuncuların söyledikleri ya da yaptıkları hiçbir şey yer almaz. Raporu alan sunucu, her web sitesi gibi gönderenin internet adresini görür ama bunu saklamaz. Son gönderilen raporun bir kopyası bilgisayarda kalır. Beta kapatılınca raporlar durur ve bilgisayarı ayırt eden numara silinir.",
  },
};
