import { LanguageAgentChat } from "@/components/LanguageAgentChat";
import { PRACTICE_CHAT_CONFIG_FR } from "@/lib/practice-chat";

export default function ChatFrPage() {
  return <LanguageAgentChat config={PRACTICE_CHAT_CONFIG_FR} />;
}
