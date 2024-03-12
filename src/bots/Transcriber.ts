import { System } from "../system";
import { BaseConfig, BotConfig } from "../config";
import { Client4 } from "@mattermost/client";
import { Post } from "@mattermost/types/posts";
import { isUserPost } from "../utils/isUserPost";
import { toFile } from "openai";
import { getFile } from "../utils/getFile";

export function Transcriber(
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
          if (!(name.endsWith(".mp3") || name.endsWith(".wav"))) {
            continue;
          }
          const response = await getFile(base, botConfig, fileID);

          console.log("Starting transcription");
          //TODO: filter out other file types / error handling
          const transcript = await system.openai.audio.transcriptions.create({
            file: await writeResponseToTempFileAndReturnReadStream(
              response,
              name
            ),
            model: "whisper-1",
          });
          console.log("Got transcript: " + transcript);
          await client.createPost({
            channel_id: posts[0].channel_id,
            message: transcript.text,
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

import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { createReadStream } from "fs";
import { FsReadStream } from "openai/_shims";

export const writeResponseToTempFileAndReturnReadStream = async (
  response: globalThis.Response,
  givenName: string
): Promise<FsReadStream> => {
  const randomPrefix = Math.random().toString(36).substring(2, 15);
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${randomPrefix}_${givenName}`);

  // Fetching the buffer from the response directly
  const buffer = Buffer.from(await response.arrayBuffer());

  // Write the buffer to a file
  await fs.writeFile(tempFilePath, buffer);

  // Return the ReadStream
  return createReadStream(tempFilePath);
};
