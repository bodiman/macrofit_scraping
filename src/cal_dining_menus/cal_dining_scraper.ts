import MenuScraper from "../menu_scraper.ts";

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as qs from "qs";
import { macroTypes } from "../db/schema.ts";
import { type MenuWithLocation, type Food, Macros } from "../db/data_transfer_objects/types.ts";
import ProgressBar from "progress";



type MenuScrapingParams = {
    diningHall: string;
    mealName: string;
    recipeName: string;
    menu_id: string;
    id: string;
    location: string;
};

class CalDiningScraper extends MenuScraper {

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

        $("ul.cafe-location > li").each((_, hallEl) => {
            const diningHallName = $(hallEl).find("span.cafe-title").first().text().trim();
        
            // Each meal-period section under the dining hall
            $(hallEl).find("ul.meal-period").each((_, mealEl) => {
                const header = $(mealEl).children("li").first(); // <li class="preiod-name …">
                const mealName = header
                    .find("> span")
                    .contents()
                    .filter((_, n) => n.type === "text") // pick only the text node, not the icon <span>
                    .text()
                    .trim() || "Unknown"
                    .split(" - ")[1];
        
                $(mealEl).find("li[data-menuid][data-id]").each((_, recipeEl) => {
                    const $recipe = $(recipeEl);

                    results.push({
                        diningHall: diningHallName,
                        mealName,
                        recipeName: $recipe.children().first().text().trim(),
                        menu_id: $recipe.attr("data-menuid")!!,
                        id: $recipe.attr("data-id")!!,
                        location: $recipe.attr("data-location")!!,
                    });
                });
            });
        });

        return results;
    }

    async scrape(params: MenuScrapingParams[]): Promise<MenuWithLocation[]> {
        const menus: MenuWithLocation[] = [];
        const failed_params: MenuScrapingParams[] = [];

        const bar = new ProgressBar(":bar :percent", { total: params.length, complete: "=", incomplete: " ", width: 20 });

        for (const param of params) {
            try {
                const menu = await this._scrape(param);
                menus.push(menu);
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

        return menus;
    }

    private async _scrape(params: MenuScrapingParams): Promise<MenuWithLocation> {
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

        const menu: MenuWithLocation = {
            name: `${params.diningHall} - ${params.mealName}`,
            location: {
                name: params.diningHall,
                description: `${params.diningHall} dining location`,
                latitude: 37.8719,
                longitude: -122.2585
            },
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            foods: [food]
        };
        
        return menu;
    }
}

export default CalDiningScraper;

async function main() {
    const scraper = new CalDiningScraper();
    const availableDates = await scraper.getAvailableDates();

    const allConfigs: MenuScrapingParams[] = [];

    console.log("Available dates:")
    console.log("--------------------------------")
    console.log(availableDates);
    console.log("--------------------------------")

    for (const date of availableDates) {
        console.log(`Scraping date: ${date}`)
        console.log("--------------------------------")
        await scraper.loadPage(date);
        const diningHalls = await scraper.getDiningHalls(date);
        console.log("Dining halls:")
        console.log("--------------------------------")
        console.log(diningHalls);
        console.log("--------------------------------")

        const meals = await scraper.getMeals(date);
        console.log("Meals:")
        console.log("--------------------------------")
        console.log(meals);
        console.log("--------------------------------")

        const configs = await scraper.getFoodRetrievalParams(date);
        allConfigs.push(...configs);
    }

    console.log("Retrieved configs.")

    console.log("Scraping menus...")
    const menus = await scraper.scrape(allConfigs.slice(0, 10));
    console.log("Example Menu:")
    console.log("--------------------------------")
    console.log(menus[0]);
    console.log("--------------------------------")

    console.log("Saving menus...")

    const menuIds = await scraper.saveMenus(menus);
    console.log("Menu IDs:")
    console.log("--------------------------------")
    console.log(menuIds);
    console.log("--------------------------------")

}

if (require.main === module) {
    main();
}