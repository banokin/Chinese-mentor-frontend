import { LanguageAgentChat } from "@/components/LanguageAgentChat";
import { PRACTICE_CHAT_CONFIG_ES } from "@/lib/practice-chat";

export default function ChatEsPage() {
  return <LanguageAgentChat config={PRACTICE_CHAT_CONFIG_ES} />;
}
