import { db } from '../../index.ts';
import { locations, menus, foods, macros, macro_information_sources, menuFoods } from '../schema.ts';
import { MenuWithLocationSchema, MenuSchema, type MenuWithLocation, type Menu, type BasicMenu, type MenuWithFoods, type MenuWithFoodsAndDistance } from '../data_transfer_objects/types.ts';
import { LocationService } from './location_service.ts';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import z from 'zod';

export class MenuService {
    private locationService: LocationService;
    
    constructor() {
        this.locationService = new LocationService();
    }
    
    async createMenuFromZod(menuData: Menu | MenuWithLocation): Promise<string> {
        const isMenuWithLocation = MenuWithLocationSchema.safeParse(menuData);
        if (isMenuWithLocation.success) {
            menuData = menuData as MenuWithLocation;
            return await this.insertMenuWithLocation(menuData);
        }

        const isMenu = MenuSchema.safeParse(menuData);
        if (isMenu.success) {
            menuData = menuData as Menu;
            return await this.insertMenu(menuData);
        }

        throw new Error("Invalid menu data");
        
    }

    async insertMenuWithLocation(validatedMenu: MenuWithLocation): Promise<string> {
        // const db = await getDB();
        return await db.transaction(async (tx) => {
            const locationId = await this.insertOrGetLocation(tx, validatedMenu.location);
            
            const menuResult = await tx.insert(menus).values({
                location: locationId,
                name: validatedMenu.name,
                start_time: new Date(validatedMenu.start_time),
                end_time: new Date(validatedMenu.end_time),
            }).returning({ id: menus.id });
            
            const menuId = menuResult[0].id;
            
            for (const food of validatedMenu.foods) {
                const foodId = await this.insertFood(tx, food);
                await tx.insert(menuFoods).values({
                    menu_id: menuId,
                    food_id: foodId,
                });
            }
            
            return menuId;
        });
    }

    async insertMenu(validatedMenu: Menu): Promise<string> {
        // const db = await getDB();
        return await db.transaction(async (tx) => {
            const existingLocation = await tx.select()
                .from(locations)
                .where(eq(locations.name, validatedMenu.location))
                .limit(1);
            
            if (existingLocation.length === 0) {
                throw new Error(`Location '${validatedMenu.location}' not found. Use insertMenuWithLocation for new locations.`);
            }
            
            const locationId = existingLocation[0].id;
            
            const menuResult = await tx.insert(menus).values({
                location: locationId,
                name: validatedMenu.name,
                start_time: validatedMenu.start_time,
                end_time: validatedMenu.end_time,
            }).returning({ id: menus.id });
            
            const menuId = menuResult[0].id;
            
            for (const food of validatedMenu.foods) {
                const foodId = await this.insertFood(tx, food);
                await tx.insert(menuFoods).values({
                    menu_id: menuId,
                    food_id: foodId,
                });
            }
            
            return menuId;
        });
    }

    private async insertOrGetLocation(tx: any, locationData: MenuWithLocation['location']): Promise<string> {
        // Use the location service for better duplicate detection
        return await this.locationService.getOrCreateLocation(locationData);
    }

    private async insertFood(tx: any, foodData: MenuWithLocation['foods'][0]): Promise<string> {
        const macrosResult = await tx.insert(macros).values({
            calories: foodData.macros.calories.toString(),
            protein: foodData.macros.protein.toString(),
            fat: foodData.macros.fat.toString(),
            carbs: foodData.macros.carbs.toString(),
            fiber: foodData.macros.fiber.toString(),
            sugar: foodData.macros.sugar.toString(),
            sodium: foodData.macros.sodium.toString(),
            potassium: foodData.macros.potassium.toString(),
            vitamin_a: foodData.macros.vitamin_a.toString(),
            vitamin_c: foodData.macros.vitamin_c.toString(),
            calcium: foodData.macros.calcium.toString(),
            iron: foodData.macros.iron.toString(),
            magnesium: foodData.macros.magnesium.toString(),
            phosphorus: foodData.macros.phosphorus.toString(),
            zinc: foodData.macros.zinc.toString(),
            copper: foodData.macros.copper.toString(),
            manganese: foodData.macros.manganese.toString(),
            selenium: foodData.macros.selenium.toString(),
            vitamin_b1: foodData.macros.vitamin_b1.toString(),
            vitamin_b2: foodData.macros.vitamin_b2.toString(),
            vitamin_b3: foodData.macros.vitamin_b3.toString(),
            vitamin_b5: foodData.macros.vitamin_b5.toString(),
            vitamin_b6: foodData.macros.vitamin_b6.toString(),
            vitamin_b7: foodData.macros.vitamin_b7.toString(),
            vitamin_b9: foodData.macros.vitamin_b9.toString(),
            vitamin_b12: foodData.macros.vitamin_b12.toString(),
            vitamin_e: foodData.macros.vitamin_e.toString(),
            vitamin_k: foodData.macros.vitamin_k.toString(),
        }).returning({ id: macros.id });
        
        const macrosId = macrosResult[0].id;
        const infoSourceId = await this.getOrCreateMacroInfoSource(tx, foodData.macro_information_source);
        const macroEmbedding = this.generateMacroEmbedding(foodData.macros);
        
        const foodResult = await tx.insert(foods).values({
            name: foodData.name,
            brand: foodData.brand,
            serving_size: foodData.serving_size,
            macro_percentage_error_estimate: foodData.macro_percentage_error_estimate,
            macro_information_source: infoSourceId,
            serving_units: foodData.serving_units,
            macros_id: macrosId,
            macro_embedding: macroEmbedding,
        }).returning({ id: foods.id });
        
        return foodResult[0].id;
    }

    private async getOrCreateMacroInfoSource(tx: any, sourceName: string): Promise<string> {
        const existingSource = await tx.select()
            .from(macro_information_sources)
            .where(eq(macro_information_sources.name, sourceName))
            .limit(1);
        
        if (existingSource.length > 0) {
            return existingSource[0].id;
        }
        
        const sourceResult = await tx.insert(macro_information_sources).values({
            name: sourceName,
            description: `Macro information source: ${sourceName}`,
            error_confidence_description: 'No specific confidence information provided',
        }).returning({ id: macro_information_sources.id });
        
        return sourceResult[0].id;
    }

    private generateMacroEmbedding(macroData: MenuWithLocation['foods'][0]['macros']): number[] {
        return [
            macroData.calories,
            macroData.protein,
            macroData.fat,
            macroData.carbs,
            macroData.fiber,
            macroData.sugar,
            macroData.sodium,
            macroData.potassium,
            macroData.vitamin_a,
            macroData.vitamin_c,
            macroData.calcium,
            macroData.iron,
            macroData.magnesium,
            macroData.phosphorus,
            macroData.zinc,
            macroData.copper,
            macroData.manganese,
            macroData.selenium,
            macroData.vitamin_b1,
            macroData.vitamin_b2,
            macroData.vitamin_b3,
            macroData.vitamin_b5,
            macroData.vitamin_b6,
            macroData.vitamin_b7,
            macroData.vitamin_b9,
            macroData.vitamin_b12,
            macroData.vitamin_e,
            macroData.vitamin_k,
        ];
    }

    async getMenusByNameAndTimeWindow(
        locationName: string, 
        startTime: Date, 
        endTime: Date
    ): Promise<BasicMenu[]> {
        const results = await db.select({
            id: menus.id,
            start_time: menus.start_time,
            end_time: menus.end_time,
            location_name: locations.name,
        })
        .from(menus)
        .innerJoin(locations, eq(menus.location, locations.id))
        .where(
            and(
                eq(locations.name, locationName),
                gte(menus.end_time, startTime),
                lte(menus.start_time, endTime)
            )
        )
        .orderBy(desc(menus.start_time));

        return results.map(row => ({
            id: row.id,
            start_time: row.start_time!,
            end_time: row.end_time!,
            location_name: row.location_name!,
        }));
    }

    async getMenusWithFoodsByNameAndTimeWindow(
        locationName: string, 
        startTime: Date, 
        endTime: Date
    ): Promise<MenuWithFoods[]> {
        const results = await db.select({
            menu_id: menus.id,
            menu_start_time: menus.start_time,
            menu_end_time: menus.end_time,
            location_name: locations.name,
            food_id: foods.id,
            food_name: foods.name,
            food_brand: foods.brand,
            food_serving_size: foods.serving_size,
            food_macro_percentage_error_estimate: foods.macro_percentage_error_estimate,
            food_serving_units: foods.serving_units,
            macro_information_source_name: macro_information_sources.name,
            macros_data: macros,
        })
        .from(menus)
        .innerJoin(locations, eq(menus.location, locations.id))
        .innerJoin(menuFoods, eq(menuFoods.menu_id, menus.id))
        .innerJoin(foods, eq(menuFoods.food_id, foods.id))
        .innerJoin(macros, eq(foods.macros_id, macros.id))
        .innerJoin(macro_information_sources, eq(foods.macro_information_source, macro_information_sources.id))
        .where(
            and(
                eq(locations.name, locationName),
                gte(menus.end_time, startTime),
                lte(menus.start_time, endTime)
            )
        )
        .orderBy(desc(menus.start_time));

        const menuMap = new Map<string, MenuWithFoods>();

        for (const row of results) {
            if (!menuMap.has(row.menu_id)) {
                menuMap.set(row.menu_id, {
                    id: row.menu_id,
                    start_time: row.menu_start_time!,
                    end_time: row.menu_end_time!,
                    location_name: row.location_name!,
                    foods: [],
                });
            }

            const menu = menuMap.get(row.menu_id)!;
            const macrosData = row.macros_data!;
            
            menu.foods.push({
                id: row.food_id!,
                name: row.food_name!,
                brand: row.food_brand!,
                serving_size: Number(row.food_serving_size!),
                macro_percentage_error_estimate: row.food_macro_percentage_error_estimate!,
                macro_information_source: row.macro_information_source_name!,
                serving_units: row.food_serving_units as any,
                macros: {
                    calories: Number(macrosData.calories),
                    protein: Number(macrosData.protein),
                    fat: Number(macrosData.fat),
                    carbs: Number(macrosData.carbs),
                    fiber: Number(macrosData.fiber),
                    sugar: Number(macrosData.sugar),
                    sodium: Number(macrosData.sodium),
                    potassium: Number(macrosData.potassium),
                    vitamin_a: Number(macrosData.vitamin_a),
                    vitamin_c: Number(macrosData.vitamin_c),
                    calcium: Number(macrosData.calcium),
                    iron: Number(macrosData.iron),
                    magnesium: Number(macrosData.magnesium),
                    phosphorus: Number(macrosData.phosphorus),
                    zinc: Number(macrosData.zinc),
                    copper: Number(macrosData.copper),
                    manganese: Number(macrosData.manganese),
                    selenium: Number(macrosData.selenium),
                    vitamin_b1: Number(macrosData.vitamin_b1),
                    vitamin_b2: Number(macrosData.vitamin_b2),
                    vitamin_b3: Number(macrosData.vitamin_b3),
                    vitamin_b5: Number(macrosData.vitamin_b5),
                    vitamin_b6: Number(macrosData.vitamin_b6),
                    vitamin_b7: Number(macrosData.vitamin_b7),
                    vitamin_b9: Number(macrosData.vitamin_b9),
                    vitamin_b12: Number(macrosData.vitamin_b12),
                    vitamin_e: Number(macrosData.vitamin_e),
                    vitamin_k: Number(macrosData.vitamin_k),
                },
            });
        }

        return Array.from(menuMap.values());
    }

    async findMenusNearLocation(
        latitude: number,
        longitude: number,
        startTime: Date,
        endTime: Date,
        maxDistanceKm: number = 10
    ): Promise<MenuWithFoodsAndDistance[]> {
        const nearbyLocations = await this.locationService.findAllLocationsNear(latitude, longitude, maxDistanceKm);
        
        if (nearbyLocations.length === 0) {
            return [];
        }
        
        const locationIds = nearbyLocations.map(loc => loc.id);
        const locationDistanceMap = new Map(nearbyLocations.map(loc => [loc.id, { name: loc.name, distance: loc.distance }]));
        
        // const db = await getDB();
        const results = await db.select({
            menu_id: menus.id,
            menu_start_time: menus.start_time,
            menu_end_time: menus.end_time,
            location_id: locations.id,
            location_name: locations.name,
            food_id: foods.id,
            food_name: foods.name,
            food_brand: foods.brand,
            food_serving_size: foods.serving_size,
            food_macro_percentage_error_estimate: foods.macro_percentage_error_estimate,
            food_serving_units: foods.serving_units,
            macro_information_source_name: macro_information_sources.name,
            macros_data: macros,
        })
        .from(menus)
        .innerJoin(locations, eq(menus.location, locations.id))
        .innerJoin(menuFoods, eq(menuFoods.menu_id, menus.id))
        .innerJoin(foods, eq(menuFoods.food_id, foods.id))
        .innerJoin(macros, eq(foods.macros_id, macros.id))
        .innerJoin(macro_information_sources, eq(foods.macro_information_source, macro_information_sources.id))
        .where(
            and(
                inArray(locations.id, locationIds),
                gte(menus.end_time, startTime),
                lte(menus.start_time, endTime)
            )
        )
        .orderBy(desc(menus.start_time));
        
        const menuMap = new Map<string, MenuWithFoodsAndDistance>();
        
        for (const row of results) {
            if (!menuMap.has(row.menu_id)) {
                const locationInfo = locationDistanceMap.get(row.location_id!)!;
                menuMap.set(row.menu_id, {
                    id: row.menu_id,
                    start_time: row.menu_start_time!,
                    end_time: row.menu_end_time!,
                    location_name: row.location_name!,
                    distance: locationInfo.distance,
                    foods: [],
                });
            }
            
            const menu = menuMap.get(row.menu_id)!;
            const macrosData = row.macros_data!;
            
            menu.foods.push({
                id: row.food_id!,
                name: row.food_name!,
                brand: row.food_brand!,
                serving_size: Number(row.food_serving_size!),
                macro_percentage_error_estimate: row.food_macro_percentage_error_estimate!,
                macro_information_source: row.macro_information_source_name!,
                serving_units: row.food_serving_units as any,
                macros: {
                    calories: Number(macrosData.calories),
                    protein: Number(macrosData.protein),
                    fat: Number(macrosData.fat),
                    carbs: Number(macrosData.carbs),
                    fiber: Number(macrosData.fiber),
                    sugar: Number(macrosData.sugar),
                    sodium: Number(macrosData.sodium),
                    potassium: Number(macrosData.potassium),
                    vitamin_a: Number(macrosData.vitamin_a),
                    vitamin_c: Number(macrosData.vitamin_c),
                    calcium: Number(macrosData.calcium),
                    iron: Number(macrosData.iron),
                    magnesium: Number(macrosData.magnesium),
                    phosphorus: Number(macrosData.phosphorus),
                    zinc: Number(macrosData.zinc),
                    copper: Number(macrosData.copper),
                    manganese: Number(macrosData.manganese),
                    selenium: Number(macrosData.selenium),
                    vitamin_b1: Number(macrosData.vitamin_b1),
                    vitamin_b2: Number(macrosData.vitamin_b2),
                    vitamin_b3: Number(macrosData.vitamin_b3),
                    vitamin_b5: Number(macrosData.vitamin_b5),
                    vitamin_b6: Number(macrosData.vitamin_b6),
                    vitamin_b7: Number(macrosData.vitamin_b7),
                    vitamin_b9: Number(macrosData.vitamin_b9),
                    vitamin_b12: Number(macrosData.vitamin_b12),
                    vitamin_e: Number(macrosData.vitamin_e),
                    vitamin_k: Number(macrosData.vitamin_k),
                },
            });
        }
        
        return Array.from(menuMap.values()).sort((a, b) => a.distance - b.distance);
    }

    validateMenuData(data: unknown): MenuWithLocation | Menu {
        try {
            return MenuWithLocationSchema.parse(data);
        } catch {
            return MenuSchema.parse(data);
        }
    }
}