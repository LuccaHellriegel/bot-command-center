import { Post } from "@mattermost/types/posts";
import { BaseConfig, BotConfig } from "../config";
import { Client4 } from "@mattermost/client";
import { z } from "zod";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { cleanSkip, shouldSkip } from "../utils/skip";

const AlreadyCaptured = z.object({
  date: z.number(),
  ids: z.array(z.string()),
});

type AlreadyCaptured = ReturnType<(typeof AlreadyCaptured)["parse"]>;

// we need some state to avoid double processing for the bots that need to fetch posts (not the one reacting)
// this takes care of all that BS
export class PostCapture {
  private inProcess = false;
  private botName: string;
  private byID: boolean;
  private updateDate: boolean;
  private skip: boolean;
  private mmClient: Client4;
  private captureState: AlreadyCaptured;
  private stateFile: string;
  private processing: (posts: Post[]) => Promise<void | string[]>;

  constructor(
    base: BaseConfig,
    botConfig: BotConfig,
    processing: (posts: Post[]) => Promise<void | string[]>,
    byID: boolean = false,
    updateDate: boolean = false,
    skip: boolean = false
  ) {
    this.botName = botConfig.name;
    this.skip = skip;
    const client = new Client4();
    client.setUrl(base.serverUrl);
    client.setToken(botConfig.accessToken);
    this.mmClient = client;
    this.byID = byID;
    this.updateDate = updateDate;
    this.processing = processing;

    const stateFile =
      botConfig.config?.stateFile ?? botConfig.name + "-state_file.json";
    this.stateFile = stateFile;

    if (existsSync(stateFile)) {
      const loadedOffsets = JSON.parse(
        readFileSync(stateFile, "utf-8").toString()
      );
      this.captureState = AlreadyCaptured.parse(loadedOffsets);
    } else {
      this.captureState = { date: new Date().setHours(0, 0, 0, 0), ids: [] };
    }
  }

  public async capture(channelID: string) {
    if (this.inProcess) return;
    this.inProcess = true;
    console.debug(
      "Capturing for " + this.botName,
      this.byID,
      this.updateDate,
      this.skip
    );
    const posts = Object.values(
      (await this.mmClient.getPostsSince(channelID, this.captureState.date))
        .posts
    )
      .filter((p) => {
        if (p.type != "" && p.type.toLowerCase().includes("system")) {
          return false;
        }
        if (!isToday(p.create_at, this.captureState.date)) {
          return false;
        }
        if (this.byID && this.captureState.ids.includes(p.id)) {
          return false;
        }
        if (this.skip && shouldSkip(p)) {
          return false;
        }

        return true;
      })
      .map(cleanSkip)
      .sort((a, b) => a.create_at - b.create_at);

    if (posts.length == 0) {
      this.inProcess = false;
      return;
    }

    console.log("Executing Posts processing for " + this.botName);
    const res = await this.processing(posts);
    console.log("Finished Posts processing for " + this.botName);

    if (this.updateDate) {
      this.captureState.date = posts[posts.length - 1].create_at;
    }
    if (res) {
      this.captureState.ids.push(...res);
    } else {
      this.captureState.ids.push(...posts.map((p) => p.id));
    }
    this.saveState();
    this.inProcess = false;
  }

  private saveState() {
    if (!isToday(this.captureState.date)) {
      this.captureState = { date: new Date().setHours(0, 0, 0, 0), ids: [] };
    }
    writeFileSync(this.stateFile, JSON.stringify(this.captureState));
  }
}

function isToday(
  number: number,
  today: number = new Date().setHours(0, 0, 0, 0)
) {
  const stateDate = new Date(number).setHours(0, 0, 0, 0);
  return today === stateDate;
}
