import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { Client4 } from "@mattermost/client";
import { TextContent } from "../loaders/TextContent";
import { Post } from "@mattermost/types/posts";
import { fullSystemPrompt } from "../utils/systemPrompt";
import { isUserPost } from "../utils/isUserPost";
import { isValidUrl } from "../utils/isValidUrl";

export function LLMWebpageSummarizer(
  base: BaseConfig,
  botConfig: BotConfig,
  system: System
) {
  const sysPrompt = fullSystemPrompt(base, botConfig);
  const client = new Client4();
  client.setUrl(base.serverUrl);
  client.setToken(botConfig.accessToken);

  const processing = async (posts: Post[]) => {
    posts = posts
      .filter(isUserPost)
      .filter((p) => p.message && p.message.trim() !== "")
      .filter((p) => isValidUrl(p.message));
    for (const post of posts) {
      try {
        const text = await TextContent(post.message.trim());
        if (!text) {
          throw "returned text was empty";
        }
        const chatCompletion = await system.openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: sysPrompt,
            },
            { role: "user", content: text },
          ],
          model: botConfig.config?.model ?? "gpt-3.5-turbo",
        });
        await client.createPost({
          channel_id: posts[0].channel_id,
          message: chatCompletion.choices
            .map((c) => c.message.content)
            .join("\n"),
        } as Post); //Types are wrong here - API docs say this is enough
      } catch (error) {
        console.error("Error during feeding LLM: " + post.message, error);
      }
    }
  };

  system.membManager.register(botConfig, async (channelIDs) => {
    channelIDs.forEach((channelID) => {
      system.postManager.register(channelID, botConfig, processing);
    });
  });
}
