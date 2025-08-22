// Add information source to database

import { db } from "../index";
import { macro_information_sources } from "../db/schema";

async function main() {
    await db.insert(macro_information_sources).values({
        name: "Cal Dining",
        description: "Nutrition information available at https://dining.berkeley.edu/menus/",
        error_confidence_description: "Nutrition information presented on the Cal Dining website is derived from the USDA database and data provided by our suppliers while also considering factors such as cooking methods and portion sizes. The ingredient and allergen information are based on product formulation and standard recipes. Both the nutrition and ingredient content of our menu items may vary due to changes in product sourcing and formulation, portion size and other factors. Cross-contact of food allergens and gluten during food preparation may also occur despite our preventive measures. Cal Dining cannot guarantee the accuracy of the nutrition, ingredient and allergen information provided here. Guests with severe food allergies, celiac disease or other dietary concerns may seek clarification by reaching out to the Cal Dining dietitian or the chef on duty.",
    });
}

main().catch(console.error);