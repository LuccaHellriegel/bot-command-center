import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { Post } from "@mattermost/types/posts";
import { LogSeq } from "../storage/LogSeq";
import { PostCapture } from "../storage/PostCapture";

export function ThumbsUpCapture(
  base: BaseConfig,
  botConfig: BotConfig,
  system: System
) {
  const processing = async (posts: Post[]) => {
    posts = posts.filter((post) =>
      post.metadata?.reactions?.some((r) => r.emoji_name === "+1")
    );
    console.log(posts);
    if (posts.length == 0) return [];
    await LogSeq(
      "Chat Inbox",
      posts.map((p) => {
        return p.message
          .split("\n")
          .map((s) => (s.startsWith("- ") ? "* " + s.slice(2) : s))
          .join("\n");
      })
    );
    return posts.map((p) => p.id);
  };
  //we dont want to capture by date, because we want to be able to capture later too
  const postCapture = new PostCapture(base, botConfig, processing, true, false);

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
