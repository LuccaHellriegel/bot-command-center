import { ReadConfig } from "./config";
import { Logger } from "./bots/Logger";
import { CreateSystem, StartSystem } from "./system";
import { configDotenv } from "dotenv";
import { LLMWebpageSummarizer } from "./bots/LLMWebpageSummarizer";
import { ThumbsUpCapture } from "./bots/ThumbsUpCapture";
import { LLMChat } from "./bots/LLMChat";
import { ChatSummary } from "./bots/ChatSummary";
import { Transcriber } from "./bots/Transcriber";
import { Describer } from "./bots/Describer";

configDotenv();

// Goals:
// * build a backend to delegate an army of bots (both AI and normal) via a Mattermost-chat interface
// * make it flexible enough for me to quickly add LLM-bots with different prompts, inputs and outputs

async function main() {
  // JSON-based instantiation of bots
  const config = await ReadConfig();
  // MembershipManager
  // * funnels new channelIDs to bots
  // PostManger
  // * funnels all posts in the given channels to the bot
  // * uses local JSON file for avoiding double processing on restart (API credits are expensive!)
  const system = CreateSystem(config);

  for (const botConfig of config.bots) {
    switch (botConfig.type) {
      case "Logger":
        // logs everything in the channels it was added to
        Logger(config.base, botConfig, system);
        break;
      case "LLMWebpageSummarizer":
        // scrapes every URL that is posted in the channel
        // feeds the text content to an LLM, model and prompt are configurable in JSON config
        LLMWebpageSummarizer(config.base, botConfig, system);
        break;
      case "ThumbsUpCapture":
        // sends everything that has a thumbs up to LogSeq via Rest
        // uses local JSON file to avoid double processing / limit the checked msgs to today
        ThumbsUpCapture(config.base, botConfig, system);
        break;
      case "LLMChat":
        LLMChat(config.base, botConfig, system);
        break;
      case "ChatSummary":
        ChatSummary(config.base, botConfig, system);
        break;
      case "Transcriber":
        Transcriber(config.base, botConfig, system);
        break;
      case "Describer":
        Describer(config.base, botConfig, system);
        break;
      default:
        console.log(botConfig.type);
    }
  }

  StartSystem(system);
}

main();
