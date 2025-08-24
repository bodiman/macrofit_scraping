// Add Cal Dining locations and information source to database

import { LocationService } from "../db/services/location_service";
import { ScraperService } from "../db/services/scraper_service";

async function main() {
    const locationService = new LocationService();
    const scraperService = new ScraperService();
    
    // Create Cal Dining information source using scraper service
    const calDiningSourceId = await scraperService.createMacroInformationSourceIfNotExists({
        name: "Cal Dining",
        description: "Nutrition information available at https://dining.berkeley.edu/menus/",
        error_confidence_description: "Nutrition information presented on the Cal Dining website is derived from the USDA database and data provided by our suppliers while also considering factors such as cooking methods and portion sizes. The ingredient and allergen information are based on product formulation and standard recipes. Both the nutrition and ingredient content of our menu items may vary due to changes in product sourcing and formulation, portion size and other factors. Cross-contact of food allergens and gluten during food preparation may also occur despite our preventive measures. Cal Dining cannot guarantee the accuracy of the nutrition, ingredient and allergen information provided here. Guests with severe food allergies, celiac disease or other dietary concerns may seek clarification by reaching out to the Cal Dining dietitian or the chef on duty.",
    });
    console.log(`Created/found Cal Dining macro information source with ID: ${calDiningSourceId}`);
    
    // Create Cal Dining locations
    const locations = [
        {
            name: "Crossroads",
            description: "Crossroads dining hall at UC Berkeley",
            latitude: 37.867002796350604,
            longitude: -122.25622229402228,
        },
        {
            name: "Foothill",
            description: "Foothill dining hall at UC Berkeley",
            latitude: 37.87574317540418,
            longitude: -122.25605167267514,
        },
        {
            name: "Clark Kerr Campus",
            description: "Clark Kerr Campus dining hall at UC Berkeley",
            latitude: 37.864143308702076,
            longitude: -122.24888972575017,
        },
        {
            name: "Cafe 3",
            description: "Cafe 3 dining hall at UC Berkeley",
            latitude: 37.86732112692691,
            longitude: -122.26022742849526,
        }
    ];
    
    console.log('Creating Cal Dining locations...');
    for (const location of locations) {
        try {
            const locationId = await locationService.createLocationIfNotExists(location);
            console.log(`Created/found location "${location.name}" with ID: ${locationId}`);
        } catch (error) {
            console.error(`Error creating location "${location.name}":`, error);
        }
    }
    
    console.log('Seed data creation completed!');
}

main().catch(console.error);