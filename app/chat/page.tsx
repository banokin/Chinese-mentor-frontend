import { LanguageAgentChat } from "@/components/LanguageAgentChat";
import { PRACTICE_CHAT_CONFIG_ZH } from "@/lib/practice-chat";

export default function ChatPage() {
  return <LanguageAgentChat config={PRACTICE_CHAT_CONFIG_ZH} />;
}
