import { Client4 } from "@mattermost/client";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { z } from "zod";
import { BaseConfig, BotConfig } from "../config";
import { cleanSkip, shouldSkip } from "../utils/skip";

export type Post = Awaited<ReturnType<Client4["getPost"]>>;
type PostCallback = (posts: Post[]) => Promise<void>;

const client = new Client4();

//TODO: dynamically add new channel ids as the bots get added to new channels (need WS for that shit)
//<ChannelId,<Bot-Name, create_at>>
type PostOffsets = Record<string, Record<string, number>>;

const PostOffsetsSchema = z.record(z.record(z.number()));

export class PostManager {
  private offsets: PostOffsets;
  //<Bot-Name,token>
  private tokens: Record<string, string> = {};
  private callbacks: Record<string, Record<string, PostCallback>> = {};
  private stateFile: string;

  constructor(base: BaseConfig, stateFile?: string) {
    if (!stateFile) {
      stateFile = "postOffsets.json";
    }
    this.stateFile = stateFile;

    if (existsSync(stateFile)) {
      const loadedOffsets = JSON.parse(
        readFileSync(stateFile, "utf-8").toString()
      );
      this.offsets = PostOffsetsSchema.parse(loadedOffsets);
    } else {
      this.offsets = {};
    }

    client.setUrl(base.serverUrl);
  }

  register(channelId: string, botConfig: BotConfig, callback: PostCallback) {
    const botName = botConfig.name;
    const token = botConfig.accessToken;

    if (!this.offsets[channelId]) {
      this.offsets[channelId] = {};
    }
    if (!this.callbacks[channelId]) {
      this.callbacks[channelId] = {};
    }

    if (this.callbacks[channelId][botName]) {
      console.error(
        "tried to register bot a second time: " +
          botName +
          " for channel " +
          channelId
      );
    } else {
      if (this.offsets[channelId][botName] == undefined) {
        this.offsets[channelId][botName] = 0;
      }
      this.callbacks[channelId][botName] = callback;
      this.tokens[botName] = token;
    }
  }

  storeOffsets() {
    writeFileSync(this.stateFile, JSON.stringify(this.offsets));
  }

  //TODO: replace with WS once the nginx fuckery works
  startPolling() {
    const poller = async () => {
      if (inProcess) return;
      inProcess = true;

      for (const [channelId, bots] of Object.entries(this.offsets)) {
        for (const [botName, timestamp] of Object.entries(bots)) {
          const token = this.tokens[botName];
          if (token) {
            try {
              client.setToken(token);
              let posts = Object.values(
                (await client.getPostsSince(channelId, timestamp)).posts
              );
              posts = posts
                .filter(
                  (p) => p.create_at > this.offsets[channelId][botName] //I think it includes the exact message for th given timestamp (so our last one)
                )
                .filter((p) => !shouldSkip(p))
                .map(cleanSkip)
                .sort((a, b) => a.create_at - b.create_at);
              if (posts.length > 0) {
                console.log("Starting reacting to posts for " + botName);
                await this.callbacks[channelId][botName](posts);
                this.offsets[channelId][botName] = Math.max(
                  this.offsets[channelId][botName],
                  posts[posts.length - 1].create_at
                );
                console.log("Finished reacting to posts for " + botName);
              }
            } catch (error) {
              console.error(
                `Failed to get posts for bot ${botName} on channel ${channelId}:`,
                error
              );
            }
          }
        }
      }

      this.storeOffsets();
      inProcess = false;
    };

    poller().then(() => setInterval(poller, 1000));
  }
}

let inProcess = false;
