import OpenAI from "openai";
import { CommandCenterConfig } from "./config";
import { MembershipManager } from "./managers/MembershipManager";
import { PostManager } from "./managers/PostManager";

export function CreateSystem(config: CommandCenterConfig) {
  const openai = new OpenAI();
  const postManager = new PostManager(config.base);
  const membManager = new MembershipManager(config.base);

  return { openai, postManager, membManager };
}

export function StartSystem(system: System) {
  system.membManager.start();
  system.postManager.startPolling();
}

export type System = ReturnType<typeof CreateSystem>;
