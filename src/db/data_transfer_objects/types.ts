import { z } from 'zod';

// Food and Macros
export const MacrosSchema = z.object({
    calories: z.number().nonnegative(), // kcal
    protein: z.number().nonnegative(), // g
    fat: z.number().nonnegative(), // g
    carbs: z.number().nonnegative(), // g
    fiber: z.number().nonnegative(), // g
    sugar: z.number().nonnegative(), // g
    sodium: z.number().nonnegative(), // mg
    potassium: z.number().nonnegative(), // mg
    vitamin_a: z.number().nonnegative(), // IU
    vitamin_c: z.number().nonnegative(), // mg
    calcium: z.number().nonnegative(), // mg
    iron: z.number().nonnegative(), // mg
    magnesium: z.number().nonnegative(), // mg
    phosphorus: z.number().nonnegative(), // mg
    zinc: z.number().nonnegative(), // mg
    copper: z.number().nonnegative(), // mg
    manganese: z.number().nonnegative(), // mg
    selenium: z.number().nonnegative(), // mg
    vitamin_b1: z.number().nonnegative(), // mg
    vitamin_b2: z.number().nonnegative(), // mg
    vitamin_b3: z.number().nonnegative(), // mg
    vitamin_b5: z.number().nonnegative(), // mg
    vitamin_b6: z.number().nonnegative(), // mg
    vitamin_b7: z.number().nonnegative(), // mg
    vitamin_b9: z.number().nonnegative(), // mg
    vitamin_b12: z.number().nonnegative(), // mg
    vitamin_e: z.number().nonnegative(), // mg
    vitamin_k: z.number().nonnegative(), // mg
});

export type Macros = z.infer<typeof MacrosSchema>;

export const ServingUnitSchema = z.object({
    name: z.string().min(1), // e.g. "cup"
    grams: z.number().positive(), // grams per that unit for this food
});

export type ServingUnit = z.infer<typeof ServingUnitSchema>;

export const FoodSchema = z.object({
    name: z.string().min(1),
    brand: z.string().min(1),
    serving_size: z.number().positive(),
    macro_percentage_error_estimate: z.number().min(0).max(100),
    macro_information_source: z.string().min(1),
    serving_units: z.array(ServingUnitSchema),
    macros: MacrosSchema,
});

export type Food = z.infer<typeof FoodSchema>;


// Locations, brands, and menus

export const FoodLocationSchema = z.object({
    name: z.string().min(1),
    description: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

export type FoodLocation = z.infer<typeof FoodLocationSchema>;

export const MenuSchema = z.object({
    name: z.string().min(1),
    location: z.string().min(1),
    start_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime string",
    }),
    end_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime string",
    }),
    foods: z.array(FoodSchema),
});

export type Menu = z.infer<typeof MenuSchema>;


// Confidence and metadata
export const InformationSourceSchema = z.object({
    name: z.string().min(1),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    metadata: z.record(z.string(), z.any()),
});

export type InformationSource = z.infer<typeof InformationSourceSchema>;

// Complete menu data with location information for database insertion
export const MenuWithLocationSchema = z.object({
    name: z.string().min(1),
    location: FoodLocationSchema,
    start_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime string",
    }),
    end_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime string",
    }),
    foods: z.array(FoodSchema),
});

export type MenuWithLocation = z.infer<typeof MenuWithLocationSchema>;