import { BaseConfig, BotConfig } from "../config";

export async function getFile(
  base: BaseConfig,
  botConfig: BotConfig,
  fileID: string
) {
  //TODO: contribute this function to the OSS project
  const response = await fetch(base.serverUrl + "/api/v4/files/" + fileID, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botConfig.accessToken}`,
    },
  });
  if (!response.ok || response.body == null) {
    throw "Response not ok";
  }
  return response;
}
