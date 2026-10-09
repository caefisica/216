import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const outputDirectory = "docs/ui";
const dark = process.argv.includes("--dark");
const suffix = dark ? "-dark" : "";
const widths = [375, 1280] as const;
const maxPages = 200;

async function waitForCatalogueSearch(page: Page) {
  await page.waitForTimeout(300);
  await page.waitForFunction(
    () => !document.querySelector('[aria-live="polite"]')?.textContent?.includes("Buscando…"),
  );
}

async function showGrid(page: Page, pageNumber: number) {
  await page.goto(`${baseUrl}/?page=${pageNumber}`, { waitUntil: "networkidle" });
  await waitForCatalogueSearch(page);
  await page.getByRole("button", { name: "Vista de cuadrícula" }).click();
  await waitForCatalogueSearch(page);
  return page.locator('[role="list"] article');
}

async function findBooks(page: Page) {
  let stored: string | null = null;
  let generated: string | null = null;
  const seen = new Set<string>();
  for (let pageNumber = 1; pageNumber <= maxPages && !(stored && generated); pageNumber++) {
    const cards = await showGrid(page, pageNumber);
    const links = await cards.evaluateAll((items) =>
      items.map((item) => ({
        href: item.querySelector("a")?.getAttribute("href") ?? null,
        hasImage: item.querySelector("img") !== null,
      })),
    );
    const firstHref = links[0]?.href;
    if (!firstHref || seen.has(firstHref)) break;
    seen.add(firstHref);
    for (const { href, hasImage } of links) {
      if (!href) continue;
      if (hasImage) stored ??= href;
      else generated ??= href;
    }
  }
  return { stored, generated };
}

async function capture() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  try {
    const discovery = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const { stored, generated } = await findBooks(discovery);
    await discovery.close();
    if (!stored) {
      console.warn("Ningún libro tiene portada almacenada: se omiten las capturas book-real.");
    }
    if (!generated) {
      console.warn(
        "Todos los libros tienen portada almacenada: se omiten las capturas book-generated.",
      );
    }
    const splitHref = stored ?? generated;
    const splitBookId = splitHref ? new URL(splitHref, baseUrl).pathname.split("/").pop() : null;

    for (const width of widths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme: dark ? "dark" : "light",
      });
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      await waitForCatalogueSearch(page);
      await page.screenshot({
        path: `${outputDirectory}/home-${width}${suffix}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Vista de cuadrícula" }).click();
      await waitForCatalogueSearch(page);
      await page.screenshot({
        path: `${outputDirectory}/catalogue-grid-${width}${suffix}.png`,
        fullPage: true,
      });
      if (width === 1280 && splitBookId) {
        await page.goto(`${baseUrl}/?book=${splitBookId}`, { waitUntil: "networkidle" });
        await waitForCatalogueSearch(page);
        await page
          .getByRole("listbox", { name: "Libros" })
          .evaluate((list) =>
            window.scrollTo(0, list.getBoundingClientRect().top + window.scrollY - 180),
          );
        await page.screenshot({ path: `${outputDirectory}/catalogue-split-${width}${suffix}.png` });
      }
      for (const [name, href] of [
        ["book-real", stored],
        ["book-generated", generated],
      ] as const) {
        if (!href) continue;
        await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
        await page.screenshot({
          path: `${outputDirectory}/${name}-${width}${suffix}.png`,
          fullPage: true,
        });
      }
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
