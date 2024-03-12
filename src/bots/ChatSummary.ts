import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { z } from "zod";
import { Post } from "@mattermost/types/posts";
import { Client4 } from "@mattermost/client";
import { PostCapture } from "../storage/PostCapture";
import { convertPostsToChatCompletions } from "../utils/convertPostsToChatCompletions";
import { isValidUrl } from "../utils/isValidUrl";

//TODO: you can currently only single summarize if it has not been fully summarized - and single summarizations are excluded from multi summaries

export function ChatSummary(
  base: BaseConfig,
  botConfig: BotConfig,
  system: System
) {
  const systemPrompt = base.baseSystemPrompt.join("\n");
  const client = new Client4();
  client.setUrl(base.serverUrl);
  client.setToken(botConfig.accessToken);

  const processing = async (posts: Post[]) => {
    //don't use your own posts
    posts = posts
      .filter((p) => p.user_id !== botConfig.userId)
      .filter((p) => p.message && p.message.trim() !== "")
      .filter((p) => !isValidUrl(p.message));
    if (posts.length === 0) {
      return;
    }
    const splitPosts = splitPostsByReaction(posts);
    for (const relevantPosts of splitPosts) {
      try {
        //TODO: if over context length, remove
        const chatCompletion = await system.openai.chat.completions.create({
          messages: [
            ...convertPostsToChatCompletions(relevantPosts, systemPrompt),
            { role: "user", content: botConfig.config?.botSystemPrompt ?? "" },
          ] as any,
          model: botConfig.config?.model ?? "gpt-3.5-turbo",
        });
        await client.createPost({
          channel_id: posts[0].channel_id,
          message: chatCompletion.choices
            .map((c) => c.message.content)
            .join("\n"),
        } as Post); //Types are wrong here - API docs say this is enough
      } catch (error) {}
    }

    return splitPosts.flat().map((p) => p.id);
  };

  const postCapture = new PostCapture(
    base,
    botConfig,
    processing,
    true,
    false,
    true
  );

  const botChannelIDs: string[] = [];
  system.membManager.register(botConfig, async (channelIDs) => {
    botChannelIDs.push(...channelIDs);
  });

  const poller = async () => {
    //TODO batch even more
    for (const id of botChannelIDs) {
      await postCapture.capture(id);
    }
  };

  setInterval(poller, 5000);
}

const splitPostsByReaction = (posts: Post[]): Post[][] => {
  let foundOne = false;
  const splitArrays: Post[][] = [];
  let currentArray: Post[] = [];

  for (const post of posts) {
    //single post summarizations
    if (post.metadata?.reactions?.some((r) => r.emoji_name === "grinning")) {
      foundOne = true;
      splitArrays.push([post]);
    }
    currentArray.push(post);

    if (
      post.metadata?.reactions?.some((r) => r.emoji_name === "white_check_mark")
    ) {
      foundOne = true;
      splitArrays.push(currentArray);
      currentArray = [];
    }
  }

  if (
    currentArray.length > 0 &&
    currentArray[currentArray.length - 1].metadata?.reactions?.some(
      (r) => r.emoji_name === "white_check_mark"
    )
  ) {
    splitArrays.push(currentArray); // Add the remaining posts as the last group
  }
  console.log(splitArrays);
  if (!foundOne) return [];

  return splitArrays;
};
