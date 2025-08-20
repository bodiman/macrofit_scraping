import axios from "axios";
import * as cheerio from 'cheerio';
import CalDiningScraper from "../src/cal_dining_menus/cal_dining_scraper";
import fs from "fs";

async function main() {
    const response = await axios.get('https://dining.berkeley.edu/menus/');
    const $ = cheerio.load(response.data);

    // Select all cafe titles
    const halls: string[] = [];
    $("span.cafe-title").each((_, el) => {
        halls.push($(el).text().trim());
    });

    console.log("Dining Halls:", halls);
}

main();