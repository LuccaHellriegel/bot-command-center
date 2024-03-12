import { BaseConfig, BotConfig } from "../config";

export function fullSystemPrompt(base: BaseConfig, botConfig: BotConfig) {
  return (
    base.baseSystemPrompt.join("\n") +
    "\n\nSpecific guidelines:\n" +
    (botConfig.config?.botSystemPrompt ?? "")
  );
}
