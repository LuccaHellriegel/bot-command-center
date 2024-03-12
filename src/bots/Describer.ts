import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { Client4 } from "@mattermost/client";
import { Post } from "@mattermost/types/posts";
import { isUserPost } from "../utils/isUserPost";
import { toFile } from "openai";
import { getFile } from "../utils/getFile";

export function Describer(
  base: BaseConfig,
  botConfig: BotConfig,
  system: System
) {
  const client = new Client4();
  client.setUrl(base.serverUrl);
  client.setToken(botConfig.accessToken);

  const processing = async (posts: Post[]) => {
    posts = posts
      .filter(isUserPost)
      .filter((p) => p.metadata.files && p.metadata.files.length > 0);
    for (const post of posts) {
      try {
        for (let index = 0; index < post.metadata.files.length; index++) {
          const fileID = post.metadata.files[index].id;
          const name = post.metadata.files[index].name;
          if (
            !(
              name.endsWith(".png") ||
              name.endsWith(".jpg") ||
              name.endsWith(".jpeg")
            )
          ) {
            continue;
          }
          const response = await getFile(base, botConfig, fileID);

          console.log("Starting description");
          //TODO: filter out other file types / error handling
          const description = await system.openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "What’s in this image?" },
                  {
                    type: "image_url",
                    image_url: {
                      url:
                        "data:image/" +
                        name.split(".").pop() +
                        ";base64," +
                        Buffer.from(await response.arrayBuffer()).toString(
                          "base64"
                        ),
                    },
                  },
                ],
              },
            ],
          });
          await client.createPost({
            channel_id: posts[0].channel_id,
            message: description.choices
              .map((c) => c.message.content)
              .join("\n"),
          } as Post); //Types are wrong here - API docs say this is enough
        }
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
