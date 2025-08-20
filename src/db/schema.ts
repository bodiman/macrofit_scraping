import { InferInsertModel } from "drizzle-orm";
import { integer, numeric, pgTable, timestamp, varchar, vector } from "drizzle-orm/pg-core";

export const menus = pgTable('menus', {
    id: varchar().primaryKey(),
    location: varchar().references(() => locations.id).notNull(),
    start_time: timestamp().notNull(),
    end_time: timestamp().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
    food_ids: varchar().array().references(() => foods.id).notNull(),
});

export const locations = pgTable('locations', {
    id: varchar().primaryKey(),
    name: varchar().notNull(),
    coordinates: vector("coordinates", {dimensions: 2}).notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
});

export const foods = pgTable('foods', {
    id: varchar().primaryKey(),
    name: varchar().notNull(),
    brand: varchar().notNull(),
    serving_size: integer().notNull(),
    serving_units: varchar().references(() => serving_units.id).notNull(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
    macro_percentage_error_estimate: integer().notNull(),
    macro_information_source: varchar().references(() => macro_information_sources.id).notNull(),

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

    macro_embedding: vector("macro_embedding", {dimensions: 28}).notNull(),
});

export const serving_units = pgTable('serving_units', {
    id: varchar().primaryKey(),
    name: varchar().notNull(),
    grams: numeric().notNull(),
    created_at: timestamp().defaultNow(),
});

export const macro_information_sources = pgTable('macro_information_sources', {
    id: varchar().primaryKey(),
    name: varchar().notNull(),
    description: varchar(),
    error_confidence_description: varchar(),
    created_at: timestamp().defaultNow(),
});


export type NewFood = InferInsertModel<typeof foods>;
