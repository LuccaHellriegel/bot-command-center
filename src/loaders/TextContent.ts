import puppeteer from "puppeteer";
const browserPromise = puppeteer.launch();

export async function TextContent(url: string) {
  console.log("Fetching content for " + url);
  const page = await (await browserPromise).newPage();
  await page.goto(url);

  const summary = await page.evaluate(() => {
    return document.body.textContent;
  });

  return summary;
}
