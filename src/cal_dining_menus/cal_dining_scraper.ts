import MenuScraper from "../menu_scraper_interface";

import axios from 'axios';
import * as cheerio from 'cheerio';

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

    async get_dining_halls(): Promise<any> {
        const response = await axios.get('https://dining.berkeley.edu/menus/');
        const $ = cheerio.load(response.data);

        // Select all cafe titles
        const halls: string[] = [];
        $("span.cafe-title").each((_, el) => {
            halls.push($(el).text().trim());
        });

        return halls;
    }

    scrape(): Promise<string> {
        return Promise.resolve("");
    }
}

export default CalDiningScraper;