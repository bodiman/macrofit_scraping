import MenuScraper from "../menu_scraper.ts";

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as qs from "qs";
import { macroTypes } from "../db/schema.ts";
import { type Menu, type Food, Macros } from "../db/data_transfer_objects/types.ts";
import { LocationService } from "../db/services/location_service.ts";
import ProgressBar from "progress";
import { parseTimeToTimestamp } from "../utils/time_parsing.ts";


type MenuScrapingParams = {
    diningHall: string;
    mealName: string;
    recipeName: string;
    menu_id: string;
    id: string;
    location: string;
    start_time: Date;
    end_time: Date;
};

class CalDiningScraper extends MenuScraper {

    private locationService: LocationService;
    private locationMapping: Record<string, string> = {};

    private readonly CALDINING_MACRONUTRIENT_NAME_MAP: Record<string, string> = {
        'Calories (kcal):': 'calories',
        'Total Lipid/Fat (g):': 'total_fat',
        'Saturated fatty acid (g):': 'saturated_fat',
        'Trans Fat (g):': 'trans_fat',
        'Cholesterol (mg):': 'cholesterol',
        'Sodium (mg):': 'sodium',
        'Carbohydrate (g):': 'carbohydrates',
        'Total Dietary Fiber (g):': 'fiber',
        'Sugar (g):': 'sugar',
        'Protein (g):': 'protein',
        'Vitamin A (iu):': 'vitamin_a',
        'Vitamin C (mg):': 'vitamin_c',
        'Calcium (mg):': 'calcium',
        'Iron (mg):': 'iron',
        'Water (g):': 'water',
        'Potassium (mg):': 'potassium',
        'Vitamin D(iu):': 'vitamin_d'
    };

    // YYYYMMDD -> html
    private pages: Record<string, string>;

    constructor () {
        super();
        this.pages = {} as Record<string, string>;
        this.locationService = new LocationService();
    }

    private getDateString(date: Date): string {
        return date.toISOString().split("T")[0].replace(/-/g, "");
    }

    private dateFromDateString(dateString: string): Date {
        return new Date(dateString.slice(0, 4) + "-" + dateString.slice(4, 6) + "-" + dateString.slice(6, 8));
    }

    async getAvailableDates() {
        const res = await axios.get("https://dining.berkeley.edu/menus/");
        const $ = cheerio.load(res.data);
      
        const dates: Date[] = [];
      
        $("#date option").each((_, el) => {
          const value = $(el).attr("value")?.trim()!;
          const date = this.dateFromDateString(value);
          if (value && value !== "") {
            dates.push(date);
          }
        });
      
        return dates;
    }

    async loadPage(date: Date) {
        const dateString = this.getDateString(date);
        const data = qs.stringify({
            action: "cald_filter_xml", // ✅ correct action
            date: dateString,          // ✅ YYYYMMDD format
        });
        
        const response = await axios.post(
            "https://dining.berkeley.edu/wp-admin/admin-ajax.php",
            data,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": "Mozilla/5.0", // helps avoid being blocked
              },
            }
        );
        
        this.pages[dateString] = response.data;
    }

    async getDiningHalls(date: Date): Promise<string[]> {
        const dateString = this.getDateString(date);
        const html = this.pages[dateString];
        const $ = cheerio.load(html);
    
        const diningCommons = ["Clark Kerr Campus", "Foothill", "Crossroads", "Cafe 3"];
        const halls: string[] = [];
    
        $("li.location-name .cafe-title").each((_, el) => {
            const name = $(el).text().trim();
            if (diningCommons.includes(name)) {
                halls.push(name);
            }
        });
    
        return halls;
    }

    async getMeals(date: Date): Promise<any> {
        const dateString = this.getDateString(date);
        const html = this.pages[dateString];

        const $ = cheerio.load(html);

        type HallData = {
            serveDate: string;   // human-readable, e.g. "Wed, Aug 20"
            rawDate: string;     // machine date from class, e.g. "20250820"
            meals: string[];
          };
        
          const hallData: Record<string, HallData> = {};
        
          $("li.location-name").each((_, hallEl) => {
            const hall = $(hallEl).find(".cafe-title").text().trim();
            if (!hall) return;
        
            // Extract "20250820" from the class attribute
            const classes = ($(hallEl).attr("class") || "").split(/\s+/);
            const rawDate = classes.find(c => /^\d{8}$/.test(c)) || "";
        
            const serveDate = $(hallEl).find(".serve-date").first().text().trim();
        
            const meals: string[] = [];
            $(hallEl).find("ul.meal-period li.preiod-name").each((_, mealEl) => {
              const mealName = $(mealEl).find("> span").first().text().trim();
              if (mealName) meals.push(mealName);
            });
        
            hallData[hall] = { serveDate, rawDate, meals };
          });
        
          return JSON.stringify(hallData, null, 2)
    }

    async getFoodRetrievalParams(date: Date): Promise<MenuScrapingParams[]> {
        const dateString = this.getDateString(date);
        const html = this.pages[dateString];

        const $ = cheerio.load(html);

        const results: MenuScrapingParams[] = [];
        const diningHallNames = new Set<string>();

        $("ul.cafe-location > li").each((_, hallEl) => {
            const diningHallName = $(hallEl).find("span.cafe-title").first().text().trim();
            diningHallNames.add(diningHallName);
        
            $(hallEl).find("ul.meal-period").each((mealIdx, mealEl) => {
                const header = $(mealEl).children("li").first();
                const mealName = header
                  .find("> span")
                  .contents()
                  .filter((_, n) => n.type === "text")
                  .text()
                  .trim()
                  .split(" - ")[1] || "Unknown";
              
                // Interpret these as local timestamps
                const times = $(hallEl).find("div.times span").map((_, t) => $(t).text().trim()).get();
                const [startRaw, endRaw] = times[mealIdx]?.split(" - ") || [];

               if (!startRaw || !endRaw) {
                   console.warn(`Missing time data for ${diningHallName} - ${mealName}`);
                   throw new Error(`No date found for ${diningHallName} - ${mealName}`);
               }

                // Interpret these as local timestamps
                const start_time = parseTimeToTimestamp(startRaw, date, "America/Los_Angeles");
                const end_time = parseTimeToTimestamp(endRaw, date, "America/Los_Angeles");
                
                console.log(startRaw, endRaw);
                console.log(start_time, end_time);
              
                $(mealEl).find("li[data-menuid][data-id]").each((_, recipeEl) => {
                  const $recipe = $(recipeEl);
                  results.push({
                    diningHall: diningHallName,
                    mealName,
                    recipeName: $recipe.children().first().text().trim(),
                    menu_id: $recipe.attr("data-menuid")!,
                    id: $recipe.attr("data-id")!,
                    location: $recipe.attr("data-location")!,
                    start_time,
                    end_time,
                  });
                });
            });
        });

        // Build location mapping using bulk retrieval)
        this.locationMapping = await this.locationService.getLocationsByDiningHallNames(Array.from(diningHallNames));

        return results;
    }

    async scrape(params: MenuScrapingParams[]): Promise<Menu[]> {
        const menuMap = new Map<string, Menu>();
        const failed_params: MenuScrapingParams[] = [];

        const bar = new ProgressBar(":bar :percent", { total: params.length, complete: "=", incomplete: " ", width: 20 });

        for (const param of params) {
            try {
                const food = await this._scrapeFood(param);
                const menuKey = `${param.diningHall} - ${param.mealName}`;
                
                if (menuMap.has(menuKey)) {
                    menuMap.get(menuKey)!.foods.push(food);
                } else {
                    const locationId = this.locationMapping[param.diningHall];
                    if (!locationId) {
                        console.log(Object.keys(this.locationMapping));
                        console.warn(`Location not found for dining hall: ${param.diningHall}`);
                        continue;
                    }

                    const menu: Menu = {
                        name: param.mealName,
                        location: locationId,
                        start_time: param.start_time,
                        end_time: param.end_time,
                        foods: [food]
                    };
                    menuMap.set(menuKey, menu);
                }
            } catch (error) {
                console.error(`Failed to scrape menu: ${param.recipeName}`, error);
                failed_params.push(param);
            }
            bar.tick();
        }

        if (failed_params.length > 0) {
        console.log("Failed params:")
            console.log("--------------------------------")
            console.log(failed_params);
            console.log("--------------------------------")
        }

        return Array.from(menuMap.values());
    }

    private async _scrapeFood(params: MenuScrapingParams): Promise<Food> {
        const payload = {
            action: "get_recipe_details",
            menu_id: params.menu_id,
            id: params.id,
            location: params.location,
        }

        const response = await axios.post(
            'https://dining.berkeley.edu/wp-admin/admin-ajax.php',
            new URLSearchParams(payload),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const html = response.data;

        const $ = cheerio.load(html);

        // grab first serving size text
        const servingSizeRaw = $("span.serving-size").first().text();
        const servingSize = parseFloat(servingSizeRaw.replace(/^Serving Size:\s*/, "").trim().split(" ")[0]) * 28.3495;

        const servingUnits = [{
            name: "g",
            grams: 1,
        }, {
            name: "oz",
            grams: 28.3495,
        }]

        const macros: Record<string, number> = {};

        $("div.nutration-details li").each((_, el) => {
            const $el = $(el);
          
            // the nutrient name is usually in the first <span>
            const label = $el.find("span").first().text().trim();
          
            // the value is usually the text node after the <span>
            const value = $el
              .contents()
              .filter((_, node) => node.type === "text")
              .text()
              .trim();
          
            if (label && value) {
                macros[this.CALDINING_MACRONUTRIENT_NAME_MAP[label]] = parseFloat(value);
            }
        });

        // 28 dimensional vector
        const vector = new Array(28).fill(0);
        const allMacros = Object.keys(macroTypes);

        for (let i = 0; i < allMacros.length; i++) {
            if (macros[allMacros[i]] === undefined) {
                macros[allMacros[i]] = 0;
            }
            vector[i] = macros[allMacros[i]];
        }
        

        const food: Food = {
            name: params.recipeName,
            brand: "Cal Dining",
            serving_size: servingSize,
            serving_units: servingUnits,
            macro_percentage_error_estimate: 25,
            macro_information_source: "Nutrition information available at https://dining.berkeley.edu/menus/",
            macros: macros as Macros
        };
        
        return food;
    }
}

export default CalDiningScraper;

async function main() {
    const override = process.argv.includes('--override');
    
    const scraper = new CalDiningScraper();
    const availableDates = await scraper.getAvailableDates();
    console.log("Available dates:")
    console.log("--------------------------------")
    console.log(availableDates);
    console.log("--------------------------------")

    const batchedConfigs: MenuScrapingParams[] = [];

    for (const date of availableDates) {
        await scraper.loadPage(date);
        
        const configs = await scraper.getFoodRetrievalParams(date);
        batchedConfigs.push(...configs);

        const uniquemeals = new Set();
        for (const config of configs) {
            uniquemeals.add(`${config.diningHall} - ${config.mealName}`);
        }
        console.log(`Retrieved ${uniquemeals.size} unique meals for ${date}`)
        console.log(uniquemeals)
    }
    const menus: Menu[] = await scraper.scrape(batchedConfigs);

    console.log(`Retrieved ${menus.length} menus`)

    console.log("Saving menus...")

    const menuIds = await scraper.saveMenus(menus, override);
    console.log("Menu IDs:")
    console.log("--------------------------------")
    console.log(menuIds);
    console.log("--------------------------------")

    console.log("Cal Dining Menus Scraped! You may hit ctrl+c to exit.")
}

main();