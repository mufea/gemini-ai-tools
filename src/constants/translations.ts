export type Language = 'en' | 'id' | 'zh' | 'hi' | 'es' | 'fr';

export interface Translations {
  tools: {
    text: { label: string; info: string };
    image: { label: string; info: string };
    video: { label: string; info: string };
    music: { label: string; info: string };
    speech: { label: string; info: string };
    document: { label: string; info: string };
    vision: { label: string; info: string };
    edit: { label: string; info: string };
  };
  ui: {
    inputPlaceholder: string;
    generate: string;
    generating: string;
    settings: string;
    history: string;
    subscription: string;
    login: string;
    logout: string;
    projects: string;
    gallery: string;
    promptLibrary: string;
    upgrade: string;
    dailyLimit: string;
    reachedLimit: string;
    modelSettings: string;
    apiKeys: string;
    apiKeyHelp: string;
    apiKeyLink: string;
    apiStatusSystem: string;
    apiStatusPersonal: string;
    save: string;
    cancel: string;
    billing: string;
    delivery: string;
    transactionHistory: string;
    noResults: string;
    error: string;
    languages: string;
    emptyTitle: string;
    emptySubtitle: string;
    historyTitle: string;
    projectsTitle: string;
    promptLibraryTitle: string;
  };
  plans: {
    free: string;
    text_only: string;
    basic: string;
    medium: string;
    advance: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    tools: {
      text: { label: 'Text', info: 'Generate text & code. All plans.' },
      image: { label: 'Image', info: 'Create visuals. All plans.' },
      video: { label: 'Video', info: 'Generate videos. Medium+ plan.' },
      music: { label: 'Music', info: 'Compose music. Advance plan.' },
      speech: { label: 'Speech', info: 'Text-to-Speech. Advance plan.' },
      document: { label: 'Docs', info: 'Analyze PDF & Documents. All plans.' },
      vision: { label: 'Vision', info: 'Analyze images & photos. All plans.' },
      edit: { label: 'Edit', info: 'Image-to-Image & Inpainting. Elite plan.' },
    },
    ui: {
      inputPlaceholder: "Describe what you want to create...",
      generate: "Generate",
      generating: "Generating...",
      settings: "Settings",
      history: "History",
      subscription: "Subscription",
      login: "Login",
      logout: "Logout",
      projects: "Projects",
      gallery: "Gallery",
      promptLibrary: "Prompt Library",
      upgrade: "Upgrade",
      dailyLimit: "Daily Limit",
      reachedLimit: "You have reached your daily limit.",
      modelSettings: "Model Settings",
      apiKeys: "API Keys",
      apiKeyHelp: "Get your free Gemini API key from Google AI Studio",
      apiKeyLink: "Get Key",
      apiStatusSystem: "Using System Default",
      apiStatusPersonal: "Using Your Personal Key",
      save: "Save",
      cancel: "Cancel",
      billing: "Billing Information",
      delivery: "Delivery Information",
      transactionHistory: "Transaction History",
      noResults: "No results yet. Start creating!",
      error: "An error occurred.",
      languages: "Languages",
      emptyTitle: "Ready to build?",
      emptySubtitle: "Enter a description below and choose a tool to start generating with Gemini.",
      historyTitle: "Generation History",
      projectsTitle: "My Projects",
      promptLibraryTitle: "Prompt Library",
    },
    plans: {
      free: 'Free',
      text_only: 'Text Only',
      basic: 'Basic',
      medium: 'Medium',
      advance: 'Advance',
    }
  },
  id: {
    tools: {
      text: { label: 'Teks', info: 'Hasilkan teks & kode. Semua paket.' },
      image: { label: 'Gambar', info: 'Buat visual. Semua paket.' },
      video: { label: 'Video', info: 'Hasilkan video. Paket Medium+.' },
      music: { label: 'Musik', info: 'Buat musik. Paket Advance.' },
      speech: { label: 'Suara', info: 'Teks-ke-Suara. Paket Advance.' },
      document: { label: 'Dokumen', info: 'Analisis PDF & Dokumen. Semua paket.' },
      vision: { label: 'Visi', info: 'Analisis gambar & foto. Semua paket.' },
      edit: { label: 'Edit', info: 'Gambar-ke-Gambar & Inpainting. Paket Elite.' },
    },
    ui: {
      inputPlaceholder: "Jelaskan apa yang ingin Anda buat...",
      generate: "Hasilkan",
      generating: "Menghasilkan...",
      settings: "Pengaturan",
      history: "Riwayat",
      subscription: "Langganan",
      login: "Masuk",
      logout: "Keluar",
      projects: "Proyek",
      gallery: "Galeri",
      promptLibrary: "Pustaka Prompt",
      upgrade: "Tingkatkan",
      dailyLimit: "Batas Harian",
      reachedLimit: "Anda telah mencapai batas harian Anda.",
      modelSettings: "Pengaturan Model",
      apiKeys: "Kunci API",
      apiKeyHelp: "Dapatkan kunci API Gemini gratis dari Google AI Studio",
      apiKeyLink: "Dapatkan Kunci",
      apiStatusSystem: "Menggunakan Standar Sistem",
      apiStatusPersonal: "Menggunakan Kunci Pribadi Anda",
      save: "Simpan",
      cancel: "Batal",
      billing: "Informasi Penagihan",
      delivery: "Informasi Pengiriman",
      transactionHistory: "Riwayat Transaksi",
      noResults: "Belum ada hasil. Mulai buat sekarang!",
      error: "Terjadi kesalahan.",
      languages: "Bahasa",
      emptyTitle: "Siap beraksi?",
      emptySubtitle: "Masukkan deskripsi di bawah ini dan pilih alat untuk mulai menghasilkan dengan Gemini.",
      historyTitle: "Riwayat Generasi",
      projectsTitle: "Proyek Saya",
      promptLibraryTitle: "Pustaka Prompt",
    },
    plans: {
      free: 'Gratis',
      text_only: 'Hanya Teks',
      basic: 'Dasar',
      medium: 'Menengah',
      advance: 'Lanjutan',
    }
  },
  zh: {
    tools: {
      text: { label: '文本', info: '生成文本和代码。所有计划。' },
      image: { label: '图像', info: '创建视觉效果。所有计划。' },
      video: { label: '视频', info: '生成视频。中级+计划。' },
      music: { label: '音乐', info: '创作音乐。高级计划。' },
      speech: { label: '语音', info: '文本转语音。高级计划。' },
      document: { label: '文档', info: '分析 PDF 和文档。所有计划。' },
      vision: { label: '视觉', info: '分析图像和照片。所有计划。' },
      edit: { label: '编辑', info: '图像转图像和局部重绘。精英计划。' },
    },
    ui: {
      inputPlaceholder: "描述你想创建的内容...",
      generate: "生成",
      generating: "生成中...",
      settings: "设置",
      history: "历史",
      subscription: "订阅",
      login: "登录",
      logout: "退出",
      projects: "项目",
      gallery: "画廊",
      promptLibrary: "提示词库",
      upgrade: "升级",
      dailyLimit: "每日限制",
      reachedLimit: "您已达到每日限制。",
      modelSettings: "模型设置",
      apiKeys: "API 密钥",
      apiKeyHelp: "从 Google AI Studio 获取免费的 Gemini API 密钥",
      apiKeyLink: "获取密钥",
      apiStatusSystem: "使用系统默认",
      apiStatusPersonal: "使用您的个人密钥",
      save: "保存",
      cancel: "取消",
      billing: "账单信息",
      delivery: "配送信息",
      transactionHistory: "交易历史",
      noResults: "尚无结果。开始创建吧！",
      error: "发生错误。",
      languages: "语言",
      emptyTitle: "准备好构建了吗？",
      emptySubtitle: "在下方输入描述并选择工具以开始使用 Gemini 生成。",
      historyTitle: "生成历史",
      projectsTitle: "我的项目",
      promptLibraryTitle: "提示库",
    },
    plans: {
      free: '免费',
      text_only: '仅限文本',
      basic: '基础版',
      medium: '中级版',
      advance: '高级版',
    }
  },
  hi: {
    tools: {
      text: { label: 'टेक्स्ट', info: 'टेक्स्ट और कोड जेनरेट करें। सभी प्लान।' },
      image: { label: 'छवि', info: 'विजुअल बनाएं। सभी प्लान।' },
      video: { label: 'वीडियो', info: 'वीडियो जेनरेट करें। मीडियम+ प्लान।' },
      music: { label: 'संगीत', info: 'संगीत लिखें। एडवांस प्लान।' },
      speech: { label: 'आवाज', info: 'टेक्स्ट-टू-स्पीच। एडवांस प्लान।' },
      document: { label: 'दस्तावेज', info: 'PDF और दस्तावेजों का विश्लेषण करें। सभी प्लान।' },
      vision: { label: 'दृष्टि', info: 'छवियों और तस्वीरों का विश्लेषण करें। सभी प्लान।' },
      edit: { label: 'एडिट', info: 'इमेज-टू-इमेज और इनपेंटिंग। एलीट प्लान।' },
    },
    ui: {
      inputPlaceholder: "बताएं कि आप क्या बनाना चाहते हैं...",
      generate: "जेनरेट करें",
      generating: "जेनरेट हो रहा है...",
      settings: "सेटिंग्स",
      history: "इतिहास",
      subscription: "सब्सक्रिप्शन",
      login: "लॉगिन",
      logout: "लॉगआउट",
      projects: "प्रोजेक्ट्स",
      gallery: "गैलरी",
      promptLibrary: "प्रॉम्प्ट लाइब्रेरी",
      upgrade: "अपग्रेड",
      dailyLimit: "दैनिक सीमा",
      reachedLimit: "आप अपनी दैनिक सीमा तक पहुँच गए हैं।",
      modelSettings: "मॉडल सेटिंग्स",
      apiKeys: "API कुंजियाँ",
      apiKeyHelp: "Google AI Studio से अपनी निःशुल्क Gemini API कुंजी प्राप्त करें",
      apiKeyLink: "कुंजी प्राप्त करें",
      apiStatusSystem: "सिस्टम डिफॉल्ट का उपयोग करना",
      apiStatusPersonal: "आपकी व्यक्तिगत कुंजी का उपयोग करना",
      save: "सहेजें",
      cancel: "रद्द करें",
      billing: "बिलिंग जानकारी",
      delivery: "डिलीvery जानकारी",
      transactionHistory: "लेन-देन का इतिहास",
      noResults: "अभी तक कोई परिणाम नहीं। बनाना शुरू करें!",
      error: "एक त्रुटि हुई।",
      languages: "भाषाएं",
      emptyTitle: "बनाने के लिए तैयार हैं?",
      emptySubtitle: "नीचे एक विवरण दर्ज करें और मिथुन के साथ उत्पादन शुरू करने के लिए एक उपकरण चुनें।",
      historyTitle: "जेनरेशन इतिहास",
      projectsTitle: "मेरे प्रोजेक्ट्स",
      promptLibraryTitle: "प्रॉम्ट लाइब्रेरी",
    },
    plans: {
      free: 'नि:शुल्क',
      text_only: 'केवल टेक्स्ट',
      basic: 'बेसिक',
      medium: 'मीडियम',
      advance: 'एडवांस',
    }
  },
  es: {
    tools: {
      text: { label: 'Texto', info: 'Generar texto y código. Todos los planes.' },
      image: { label: 'Imagen', info: 'Crear visuales. Todos los planes.' },
      video: { label: 'Video', info: 'Generar videos. Plan Medio+.' },
      music: { label: 'Música', info: 'Componer música. Plan Avanzado.' },
      speech: { label: 'Voz', info: 'Texto a voz. Plan Avanzado.' },
      document: { label: 'Docs', info: 'Analizar PDF y documentos. Todos los planes.' },
      vision: { label: 'Visión', info: 'Analizar imágenes y fotos. Todos los planes.' },
      edit: { label: 'Editar', info: 'Imagen a imagen e inpainting. Plan Élite.' },
    },
    ui: {
      inputPlaceholder: "Describe lo que quieres crear...",
      generate: "Generar",
      generating: "Generando...",
      settings: "Ajustes",
      history: "Historial",
      subscription: "Suscripción",
      login: "Iniciar sesión",
      logout: "Cerrar sesión",
      projects: "Proyectos",
      gallery: "Galería",
      promptLibrary: "Biblioteca de Prompts",
      upgrade: "Mejorar",
      dailyLimit: "Límite Diario",
      reachedLimit: "Has alcanzado tu límite diario.",
      modelSettings: "Ajustes de Modelo",
      apiKeys: "Claves API",
      apiKeyHelp: "Obtén tu clave API Gemini gratuita de Google AI Studio",
      apiKeyLink: "Obtener clave",
      apiStatusSystem: "Usando el sistema por defecto",
      apiStatusPersonal: "Usando tu clave personal",
      save: "Guardar",
      cancel: "Cancelar",
      billing: "Información de Facturación",
      delivery: "Información de Entrega",
      transactionHistory: "Historial de Transacciones",
      noResults: "Aún no hay resultados. ¡Empieza a crear!",
      error: "Ocurrió un error.",
      languages: "Idiomas",
      emptyTitle: "¿Listo para construir?",
      emptySubtitle: "Ingrese una descripción a continuación y elija una herramienta para comenzar a generar con Gemini.",
      historyTitle: "Historial de Generación",
      projectsTitle: "Mis Proyectos",
      promptLibraryTitle: "Biblioteca de Prompts",
    },
    plans: {
      free: 'Gratis',
      text_only: 'Solo Texto',
      basic: 'Básico',
      medium: 'Medio',
      advance: 'Avanzado',
    }
  },
  fr: {
    tools: {
      text: { label: 'Texte', info: 'Générer du texte et du code. Tous les forfaits.' },
      image: { label: 'Image', info: 'Créer des visuels. Tous les forfaits.' },
      video: { label: 'Vidéo', info: 'Générer des vidéos. Forfait Médium+.' },
      music: { label: 'Musique', info: 'Composer de la musique. Forfait Avancé.' },
      speech: { label: 'Parole', info: 'Synthèse vocale. Forfait Avancé.' },
      document: { label: 'Docs', info: 'Analyser PDF et documents. Tous les forfaits.' },
      vision: { label: 'Vision', info: 'Analyser des images et photos. Tous les forfaits.' },
      edit: { label: 'Modifier', info: 'Image-à-image et inpainting. Forfait Élite.' },
    },
    ui: {
      inputPlaceholder: "Décrivez ce que vous voulez créer...",
      generate: "Générer",
      generating: "Génération...",
      settings: "Paramètres",
      history: "Historique",
      subscription: "Abonnement",
      login: "Connexion",
      logout: "Déconnexion",
      projects: "Projets",
      gallery: "Galerie",
      promptLibrary: "Bibliothèque de Prompts",
      upgrade: "Mettre à niveau",
      dailyLimit: "Limite Quotidienne",
      reachedLimit: "Vous avez atteint votre limite quotidienne.",
      modelSettings: "Paramètres du Modèle",
      apiKeys: "Clés API",
      apiKeyHelp: "Obtenez votre clé API Gemini gratuite sur Google AI Studio",
      apiKeyLink: "Obtenir la clé",
      apiStatusSystem: "Utilisation du système par défaut",
      apiStatusPersonal: "Utilisation de votre clé personnelle",
      save: "Enregistrer",
      cancel: "Annuler",
      billing: "Informations de Facturation",
      delivery: "Informations de Livraison",
      transactionHistory: "Historique des Transactions",
      noResults: "Aucun résultat pour le moment. Commencez à créer !",
      error: "Une erreur est survenue.",
      languages: "Langues",
      emptyTitle: "Prêt à construire ?",
      emptySubtitle: "Entrez une description ci-dessous et choisissez un outil pour commencer à générer avec Gemini.",
      historyTitle: "Historique des Générations",
      projectsTitle: "Mes Projets",
      promptLibraryTitle: "Bibliothèque de Prompts",
    },
    plans: {
      free: 'Gratuit',
      text_only: 'Texte Uniquement',
      basic: 'Basique',
      medium: 'Médium',
      advance: 'Avancé',
    }
  }
};
