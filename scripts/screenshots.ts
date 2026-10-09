import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const outputDirectory = "docs/ui";
const dark = process.argv.includes("--dark");
const suffix = dark ? "-dark" : "";
const widths = [375, 1280] as const;

async function bookLinks(page: import("playwright").Page) {
  return page
    .locator('a[href^="/books/"]')
    .evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute("href")))].filter(
        (href): href is string => href !== null,
      ),
    );
}

async function findBook(page: import("playwright").Page, generated: boolean) {
  for (const href of await bookLinks(page)) {
    await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
    const hasStoredCover = (await page.locator('main img, [role="main"] img').count()) > 0;
    if (hasStoredCover !== generated) return href;
  }
  throw new Error(
    generated
      ? "No se encontró un libro sin portada en el catálogo local."
      : "No se encontró un libro con portada almacenada en el catálogo local.",
  );
}

async function capture() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  try {
    const discovery = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await discovery.goto(baseUrl, { waitUntil: "networkidle" });
    const realBook = await findBook(discovery, false);
    await discovery.goto(baseUrl, { waitUntil: "networkidle" });
    const generatedBook = await findBook(discovery, true);
    await discovery.close();

    for (const width of widths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme: dark ? "dark" : "light",
      });
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      await page.screenshot({
        path: `${outputDirectory}/home-${width}${suffix}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Vista de cuadrícula" }).click();
      await page.screenshot({
        path: `${outputDirectory}/catalogue-grid-${width}${suffix}.png`,
        fullPage: true,
      });
      await page.goto(`${baseUrl}${realBook}`, { waitUntil: "networkidle" });
      await page.screenshot({
        path: `${outputDirectory}/book-real-${width}${suffix}.png`,
        fullPage: true,
      });
      await page.goto(`${baseUrl}${generatedBook}`, { waitUntil: "networkidle" });
      await page.screenshot({
        path: `${outputDirectory}/book-generated-${width}${suffix}.png`,
        fullPage: true,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

capture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
