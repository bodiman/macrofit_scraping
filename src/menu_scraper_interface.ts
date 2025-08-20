import { db } from "./index";
import { foods, NewFood } from "./db/schema";

abstract class MenuScraper {
    abstract scrape(url: string): Promise<string>;

    save(scrapedFoods: NewFood[]) {
        db.insert(foods).values(scrapedFoods).returning().then(() => {});
    }
}

export default MenuScraper;
