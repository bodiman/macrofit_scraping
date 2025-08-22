import MenuScraper from "../menu_scraper_interface";

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import * as qs from "qs";
import { NewFood, macroTypes } from "../db/schema";


type Config = {
    diningHall: string;
    mealName: string;
    recipeName: string;
    menu_id: string
    id: string;
    location: string;
}

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

    private async getDateString(date: Date): Promise<string> {
        return date.toISOString().split("T")[0].replace(/-/g, "");
    }

    async getAvailableDates() {
        const res = await axios.get("https://dining.berkeley.edu/menus/");
        const $ = cheerio.load(res.data);
      
        const dates: { value: string; label: string }[] = [];
      
        $("#date option").each((_, el) => {
          const value = $(el).attr("value")?.trim();
          const label = $(el).text().trim();
          if (value && value !== "") {
            dates.push({ value, label });
          }
        });
      
        return dates;
    }

    async loadPage(dateString: string) {
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
        const dateString = await this.getDateString(date);
        const html = this.pages[dateString];

        const $ = cheerio.load(html);

        // Select all cafe titles
        const halls: string[] = [];
        $("span.cafe-title").each((_, el) => {
            halls.push($(el).text().trim());
        });

        return halls;
    }

    async getMeals(date: Date): Promise<any> {
        const dateString = await this.getDateString(date);
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

    async getConfigs(date: Date): Promise<Config[]> {
        const dateString = await this.getDateString(date);
        const html = this.pages[dateString];

        const $ = cheerio.load(html);

        const results: {
            diningHall: string;
            mealName: string;
            recipeName: string;
            menu_id: string;
            id: string;
            location: string;
        }[] = [];

        $("ul.cafe-location > li").each((_, hallEl) => {
            const diningHallName = $(hallEl).find("span.cafe-title").first().text().trim();
        
            // Each meal-period section under the dining hall
            $(hallEl).find("ul.meal-period").each((_, mealEl) => {
                const mealName = $(mealEl).attr("class")?.split(" ").pop()?.trim() ?? "Unknown";
        
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

    async scrape(kwargs: {
        configs: Config[]
    }): Promise<any> {
        const results: any[] = [];

        for (const config of kwargs.configs) {

            const payload = {
                action: "get_recipe_details",
                menu_id: config.menu_id,
                id: config.id,
                location: config.location,
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

            const macros = {

            }

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
            

            const food: NewFood = {
                name: config.recipeName,
                brand: "Cal Dining",
                serving_size: servingSize,
                serving_units: servingUnits,
                macro_percentage_error_estimate: 25,
                macro_information_source: "Nutrition information available athttps://dining.berkeley.edu/menus/",
                macro_embedding: vector,
            }

            // console.log(food);
            throw new Error("Stop");
        }

        return results;
    }
}

export default CalDiningScraper;