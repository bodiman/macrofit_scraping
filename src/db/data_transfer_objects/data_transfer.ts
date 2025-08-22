import { type Food, type FoodLocation, type InformationSource, type Macros, type Menu } from "./types";
import { macros } from "../schema";

function createMacrosDTO(food: macros): Macros {
    return {
        name: food.name,
        brand: food.brand,
        serving_size: food.serving_size,
        macro_percentage_error_estimate: food.macro_percentage_error_estimate,
        macro_information_source: food.macro_information_source,
    }
}
