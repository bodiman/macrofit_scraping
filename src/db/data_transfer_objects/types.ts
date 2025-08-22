

// Food and Macros
export type Macros = {
    calories: number, // kcal
    protein: number, // g
    fat: number, // g
    carbs: number, // g
    fiber: number, // g
    sugar: number, // g
    sodium: number, // mg
    potassium: number, // mg
    vitamin_a: number, // IU
    vitamin_c: number, // mg
    calcium: number, // mg
    iron: number, // mg
    magnesium: number, // mg
    phosphorus: number, // mg
    zinc: number, // mg
    copper: number, // mg
    manganese: number, // mg
    selenium: number, // mg
    vitamin_b1: number, // mg
    vitamin_b2: number, // mg
    vitamin_b3: number, // mg
    vitamin_b5: number, // mg
    vitamin_b6: number, // mg
    vitamin_b7: number, // mg
    vitamin_b9: number, // mg
    vitamin_b12: number, // mg
    vitamin_e: number, // mg
    vitamin_k: number, // mg
}

export type ServingUnit = {
    name: string;   // e.g. "cup"
    grams: number;  // grams per that unit for this food
};

export type Food = {
    name: string;
    brand: string;
    serving_size: number;
    macro_percentage_error_estimate: number;
    macro_information_source: string;
    serving_units: ServingUnit[];
    macros: Macros;
}


// Locations, brands, and menus

export type FoodLocation = {
    name: string;
    description: string;
    latitude: number;
    longitude: number;
}

export type Menu = {
    name: string;
    location: string;
    start_time: string;
    end_time: string;
    foods: Food[];
}


// Confidence and metadata
export type InformationSource = {
    name: string;
    description: string;
    confidence: number;
    metadata: Record<string, any>;
}