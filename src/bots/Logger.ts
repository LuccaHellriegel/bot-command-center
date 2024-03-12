import { Post } from "@mattermost/types/posts";
import { BaseConfig, BotConfig } from "../config";
import { System } from "../system";

export function Logger(_: BaseConfig, botConfig: BotConfig, system: System) {
  const processing = async (posts: Post[]) => {
    console.log(
      posts
        .map(
          (p) =>
            "channelID: " +
            p.channel_id +
            ", postId: " +
            p.id +
            ", message: " +
            p.message
        )
        .join("\n")
    );
  };

  system.membManager.register(botConfig, async (channelIDs) => {
    channelIDs.forEach((channelID) => {
      system.postManager.register(channelID, botConfig, processing);
    });
  });
}
