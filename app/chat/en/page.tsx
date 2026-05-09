import { LanguageAgentChat } from "@/components/LanguageAgentChat";
import { PRACTICE_CHAT_CONFIG_EN } from "@/lib/practice-chat";

export default function ChatEnPage() {
  return <LanguageAgentChat config={PRACTICE_CHAT_CONFIG_EN} />;
}
