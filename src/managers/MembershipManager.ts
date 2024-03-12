import { Client4 } from "@mattermost/client";
import { BaseConfig, BotConfig } from "../config";

// TODO: the reason for a separate class is that later we want to do this dynamically via websocket

const client = new Client4();

export class MembershipManager {
  private teamId: string;
  //<userId, channel IDs>
  private memberships: Record<string, string[]> = {};
  //<userId, token>
  private tokens: Record<string, string> = {};
  private callbacks: Record<string, (channelIDs: string[]) => Promise<void>> =
    {};

  constructor(base: BaseConfig) {
    client.setUrl(base.serverUrl);
    this.teamId = base.teamId;
  }

  register(
    botConfig: BotConfig,
    callback: (channelIDs: string[]) => Promise<void>
  ) {
    const userId = botConfig.userId;
    const token = botConfig.accessToken;
    this.memberships[userId] = [];
    this.tokens[userId] = token;
    this.callbacks[userId] = callback;
  }

  start() {
    const poller = async () => {
      for (const userId of Object.keys(this.memberships)) {
        client.setToken(this.tokens[userId]);
        const knownChannelIds = this.memberships[userId];
        const memberships = await client.getAllChannelsMembers(userId);
        const newChannelIds = [];
        for (const memb of memberships) {
          if (!knownChannelIds.includes(memb.channel_id)) {
            const channel = await client.getChannel(memb.channel_id);
            //only private channels because you are added to public ones automatically
            if (channel.type === "P") {
              newChannelIds.push(memb.channel_id);
            }
          }
        }
        if (newChannelIds.length > 0) {
          this.callbacks[userId](newChannelIds);
          this.memberships[userId].push(...newChannelIds);
        }
      }
    };

    poller().then(() => setInterval(poller, 10000));
  }
}
