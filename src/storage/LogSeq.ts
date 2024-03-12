import {} from "@logseq/libs";

const token = "test-token";
const url = "http://127.0.0.1:12315/api";

export async function LogSeq(page: string, content: string[]) {
  const uuid = (await getPage(url, token, page)).uuid;
  await insertBlocks(url, token, uuid, content);
}

async function getPage(url: string, token: string, name: string) {
  const payload = { method: "logseq.Editor.getPage", args: [name] };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function insertBlocks(
  url: string,
  token: string,
  pageId: string,
  content: string[]
) {
  for (const s of content) {
    const payload = {
      method: "logseq.Editor.insertBlock",
      args: [pageId, s],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}
