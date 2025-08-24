import { InferInsertModel, sql } from "drizzle-orm";
import { integer, numeric, pgTable, timestamp, varchar, vector, uuid, jsonb, unique } from "drizzle-orm/pg-core";

type ServingUnit = {
    name: string;   // e.g. "cup"
    grams: number;  // grams per that unit for this food
};

export const macroTypes = {
    calories: numeric("calories", {precision: 7, scale: 3}), // kcal
    protein: numeric("protein", {precision: 7, scale: 3}), // g
    fat: numeric("fat", {precision: 7, scale: 3}), // g
    carbs: numeric("carbs", {precision: 7, scale: 3}), // g
    fiber: numeric("fiber", {precision: 7, scale: 3}), // g
    sugar: numeric("sugar", {precision: 7, scale: 3}), // g
    sodium: numeric("sodium", {precision: 7, scale: 3}), // mg
    potassium: numeric("potassium", {precision: 7, scale: 3}), // mg
    vitamin_a: numeric("vitamin_a", {precision: 7, scale: 3}), // IU
    vitamin_c: numeric("vitamin_c", {precision: 7, scale: 3}), // mg
    calcium: numeric("calcium", {precision: 7, scale: 3}), // mg
    iron: numeric("iron", {precision: 7, scale: 3}), // mg
    magnesium: numeric("magnesium", {precision: 7, scale: 3}), // mg
    phosphorus: numeric("phosphorus", {precision: 7, scale: 3}), // mg
    zinc: numeric("zinc", {precision: 7, scale: 3}), // mg
    copper: numeric("copper", {precision: 7, scale: 3}), // mg
    manganese: numeric("manganese", {precision: 7, scale: 3}), // mg
    selenium: numeric("selenium", {precision: 7, scale: 3}), // mg
    vitamin_b1: numeric("vitamin_b1", {precision: 7, scale: 3}), // mg
    vitamin_b2: numeric("vitamin_b2", {precision: 7, scale: 3}), // mg
    vitamin_b3: numeric("vitamin_b3", {precision: 7, scale: 3}), // mg
    vitamin_b5: numeric("vitamin_b5", {precision: 7, scale: 3}), // mg
    vitamin_b6: numeric("vitamin_b6", {precision: 7, scale: 3}), // mg
    vitamin_b7: numeric("vitamin_b7", {precision: 7, scale: 3}), // mg
    vitamin_b9: numeric("vitamin_b9", {precision: 7, scale: 3}), // mg
    vitamin_b12: numeric("vitamin_b12", {precision: 7, scale: 3}), // mg
    vitamin_e: numeric("vitamin_e", {precision: 7, scale: 3}), // mg
    vitamin_k: numeric("vitamin_k", {precision: 7, scale: 3}), // mg
}

export const macros = pgTable('macros', {
    id: uuid().primaryKey().defaultRandom(),
    ...macroTypes,
});

export const menus = pgTable('menus', {
    id: uuid().primaryKey().defaultRandom(),
    location: uuid().references(() => locations.id),
    start_time: timestamp().notNull(),
    end_time: timestamp().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
});

export const locations = pgTable('locations', {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    coordinates: vector("coordinates", {dimensions: 2}).notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
}, (table) => ({
    uniqueNameLocation: unique().on(table.name, table.coordinates),
}));

export const foods = pgTable('foods', {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    brand: varchar().notNull(),
    serving_size: integer().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
    macro_percentage_error_estimate: integer().notNull(),
    macro_information_source: uuid().references(() => macro_information_sources.id).notNull(),

    serving_units: jsonb("serving_units")
    .$type<ServingUnit[]>()                 // tells TS what the JSON shape is
    .notNull()
    .default(sql`'[]'::jsonb`),

    macros_id: uuid().references(() => macros.id).notNull(),
    macro_embedding: vector("macro_embedding", {dimensions: 28}).notNull(),
});

export const menuFoods = pgTable('menu_foods', {
    id: uuid().primaryKey().defaultRandom(),
    menu_id: uuid().references(() => menus.id).notNull(),
    food_id: uuid().references(() => foods.id).notNull(),
    created_at: timestamp().defaultNow().notNull(),
}, (table) => ({
    uniqueMenuFood: unique().on(table.menu_id, table.food_id),
})); 

export const macro_information_sources = pgTable('macro_information_sources', {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    description: varchar(),
    error_confidence_description: varchar(),
}, (table) => ({
    uniqueSourceName: unique().on(table.name),
}));

export type NewFood = InferInsertModel<typeof foods>;
