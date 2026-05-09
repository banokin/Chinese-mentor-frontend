export type PracticeLang = "zh" | "fr" | "es" | "en";

export type ChatAccent = "emerald" | "sky" | "amber" | "indigo";

export type PracticeChatConfig = {
  lang: PracticeLang;
  storageKey: string;
  title: string;
  subtitle: string;
  welcomeBanner: string;
  welcomeBannerLang: string;
  assistantMsgLang: string;
  ttsLang: string;
  voiceLangPrefixes: string[];
  accent: ChatAccent;
};

export const PRACTICE_CHAT_CONFIG_ZH: PracticeChatConfig = {
  lang: "zh",
  storageKey: "chinese-mentor-practice-chat-v1",
  title: "Чат — китайский",
  subtitle:
    "Пишите или отправьте голосовое — речь распознаётся и уходит в чат как текст (нужен микрофон и OPENAI_API_KEY / HF для ASR). RAG-агент отвечает с учётом базы знаний.",
  welcomeBanner: "你好！这里是练习中文聊天的窗口。随便发一条消息开始吧。",
  welcomeBannerLang: "zh-Hans",
  assistantMsgLang: "zh-Hans",
  ttsLang: "zh-CN",
  voiceLangPrefixes: ["zh", "cmn", "yue"],
  accent: "emerald",
};

export const PRACTICE_CHAT_CONFIG_FR: PracticeChatConfig = {
  lang: "fr",
  storageKey: "chinese-mentor-agent-chat-fr-v1",
  title: "Чат — французский",
  subtitle:
    "Практика с RAG-агентом-репетитором. Голосовые сообщения через ASR на бэкенде. Документы для базы — коллекция french_lexicon (загрузка с ?language=fr).",
  welcomeBanner:
    "Bonjour ! Ici vous pouvez pratiquer le français en dialogue. Envoyez un message pour commencer.",
  welcomeBannerLang: "fr",
  assistantMsgLang: "fr",
  ttsLang: "fr-FR",
  voiceLangPrefixes: ["fr"],
  accent: "sky",
};

export const PRACTICE_CHAT_CONFIG_ES: PracticeChatConfig = {
  lang: "es",
  storageKey: "chinese-mentor-agent-chat-es-v1",
  title: "Чат — испанский",
  subtitle:
    "Практика с RAG-агентом. Коллекция spanish_lexicon — параметр language=es при загрузке в Qdrant.",
  welcomeBanner:
    "¡Hola! Aquí puedes practicar español en conversación. Envía un mensaje para empezar.",
  welcomeBannerLang: "es",
  assistantMsgLang: "es",
  ttsLang: "es-ES",
  voiceLangPrefixes: ["es"],
  accent: "amber",
};

export const PRACTICE_CHAT_CONFIG_EN: PracticeChatConfig = {
  lang: "en",
  storageKey: "chinese-mentor-agent-chat-en-v1",
  title: "Чат — английский",
  subtitle:
    "Practice English with the RAG tutor agent. Knowledge base: english_lexicon (upload with ?language=en).",
  welcomeBanner:
    "Hi! This is a conversation practice window in English. Send a message to start.",
  welcomeBannerLang: "en",
  assistantMsgLang: "en",
  ttsLang: "en-US",
  voiceLangPrefixes: ["en-US", "en-GB", "en"],
  accent: "indigo",
};

/** Ссылки на страницы чата с агентом (главная, навбар). */
export const CHAT_AGENT_LINKS: { href: string; label: string }[] = [
  { href: "/chat", label: "中文 (китайский)" },
  { href: "/chat/fr", label: "FR (французский)" },
  { href: "/chat/es", label: "ES (испанский)" },
  { href: "/chat/en", label: "EN (английский)" },
];
