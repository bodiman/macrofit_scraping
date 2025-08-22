import axios from "axios";
import * as qs from "qs";
import CalDiningScraper from "../src/cal_dining_menus/cal_dining_scraper";

async function main() {
  const scraper = new CalDiningScraper();
  const dataStrings = await scraper.getAvailableDates();

  for (const dateString of dataStrings) {
    await scraper.loadPage(dateString.value);
  }

  const configs = await scraper.getConfigs(new Date("2025-08-21"));
  const foods = await scraper.scrape({ configs });
}

main().catch(console.error);
