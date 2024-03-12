import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { Post } from "@mattermost/types/posts";
import { Client4 } from "@mattermost/client";
import { PostCapture } from "../storage/PostCapture";
import { convertPostsToChatCompletions } from "../utils/convertPostsToChatCompletions";
import { isUserPost } from "../utils/isUserPost";
import { fullSystemPrompt } from "../utils/systemPrompt";
import { isValidUrl } from "../utils/isValidUrl";

//TODO: base on PostManager?
export function LLMChat(
  base: BaseConfig,
  botConfig: BotConfig,
  system: System
) {
  const client = new Client4();
  client.setUrl(base.serverUrl);
  client.setToken(botConfig.accessToken);
  const sysPrompt = fullSystemPrompt(base, botConfig);
  const processing = async (posts: Post[]) => {
    //only react to user and LLMChat posts
    posts = posts
      .filter((p) => isUserPost(p) || p.user_id === botConfig.userId)
      .filter((p) => p.message && p.message.trim() !== "")
      .filter((p) => !isValidUrl(p.message));
    if (posts.length === 0) {
      return;
    }

    //only react if the last post was from a user
    if (!isUserPost(posts[posts.length - 1])) {
      return;
    }
    try {
      //TODO: if over context length, remove
      const chatCompletion = await system.openai.chat.completions.create({
        messages: convertPostsToChatCompletions(posts, sysPrompt) as any,
        model: botConfig.config?.model ?? "gpt-3.5-turbo",
      });
      await client.createPost({
        channel_id: posts[0].channel_id,
        message: chatCompletion.choices
          .map((c) => c.message.content)
          .join("\n"),
      } as Post); //Types are wrong here - API docs say this is enough
    } catch (error) {}
  };
  const postCapture = new PostCapture(
    base,
    botConfig,
    processing,
    false,
    false,
    true
  );

  const botChannelIDs: string[] = [];
  system.membManager.register(botConfig, async (channelIDs) => {
    botChannelIDs.push(...channelIDs);
  });

  const poller = async () => {
    for (const id of botChannelIDs) {
      await postCapture.capture(id);
    }
  };

  setInterval(poller, 5000);
}
