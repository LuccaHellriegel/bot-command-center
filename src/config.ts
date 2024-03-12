import { readFileSync } from "fs";
import { z } from "zod";
import { Client4 } from "@mattermost/client";

//TODO: instantiate bots by getting them from mattermost + accessToken?

type BotType =
  | "ThumbsUpCapture"
  | "LLMWebpageSummarizer"
  | "Logger"
  | "LLMChat"
  | "ChatSummary"
  | "Transcriber"
  | "Describer";

export interface CommandCenterConfig {
  base: {
    serverUrl: string;
    teamId: string;
    baseSystemPrompt: string[];
  };
  bots: {
    name: string;
    type: BotType;
    accessToken: string;
    userId: string;
    config?: Record<string, string>;
  }[];
}

export type BaseConfig = CommandCenterConfig["base"];
export type BotConfig = CommandCenterConfig["bots"][0];

const BotType = z.enum([
  "ThumbsUpCapture",
  "LLMWebpageSummarizer",
  "Logger",
  "LLMChat",
  "ChatSummary",
  "Transcriber",
  "Describer",
]);

const CommandCenterConfigSchema = z.object({
  base: z.object({
    serverUrl: z.string().url(),
    teamId: z.string(),
    baseSystemPrompt: z.array(z.string()),
  }),
  bots: z.array(
    z.object({
      name: z.string(),
      type: BotType,
      accessToken: z.string(),
      userId: z.string(),
      config: z.record(z.string()).optional(),
    })
  ),
});

export async function ReadConfig(path?: string): Promise<CommandCenterConfig> {
  if (!path) {
    path = "bots.json";
  }
  let config: CommandCenterConfig = JSON.parse(
    readFileSync(path, "utf-8").toString()
  );
  config = CommandCenterConfigSchema.parse(config);

  const client = new Client4();
  client.setUrl(config.base.serverUrl);
  client.setToken(config.bots[0].accessToken);

  for (const bot of config.bots) {
    const users = await client.searchUsers(bot.name, null);
    for (const user of users) {
      if (user.is_bot && user.username === bot.name) {
        bot.userId = user.id;
        break;
      }
    }
  }

  return config;
}
