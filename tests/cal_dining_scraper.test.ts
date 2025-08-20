import CalDiningScraper from "../src/cal_dining_menus/cal_dining_scraper";

describe("menu_retrieval", () => {
    it("should retrieve all dining halls", async () => {
        const scraper = new CalDiningScraper();
        const dining_halls = await scraper.get_dining_halls();
        expect(dining_halls).toBeDefined();
        expect(dining_halls.length).toBe(4);
        expect(dining_halls).toContain("Clark Kerr Campus");
        expect(dining_halls).toContain("Foothill");
        expect(dining_halls).toContain("Cafe 3");
        expect(dining_halls).toContain("Crossroads");
    });
});