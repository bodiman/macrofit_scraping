import { getDB } from '../../index';
import { locations } from '../schema';
import { FoodLocationSchema, type FoodLocation } from '../data_transfer_objects/types';
import { eq, sql, asc } from 'drizzle-orm';

export class LocationService {
    
    async createLocation(locationData: unknown): Promise<string> {
        const validatedLocation = FoodLocationSchema.parse(locationData);
        
        const db = await getDB();
        const result = await db.insert(locations).values({
            name: validatedLocation.name,
            coordinates: [validatedLocation.latitude, validatedLocation.longitude],
        }).returning({ id: locations.id });
        
        return result[0].id;
    }

    async getLocationById(id: string): Promise<any> {
        const db = await getDB();
        const result = await db.select()
            .from(locations)
            .where(eq(locations.id, id))
            .limit(1);
        
        return result[0] || null;
    }

    async getLocationByName(name: string): Promise<any> {
        const db = await getDB();
        const result = await db.select()
            .from(locations)
            .where(eq(locations.name, name))
            .limit(1);
        
        return result[0] || null;
    }

    async getAllLocations(): Promise<any[]> {
        const db = await getDB();
        return await db.select().from(locations);
    }

    async getOrCreateLocation(locationData: FoodLocation): Promise<string> {
        const coordinates = [locationData.latitude, locationData.longitude];
        
        // First try to find exact match by name and coordinates
        const db = await getDB();
        const existingLocation = await db.select()
            .from(locations)
            .where(
                eq(locations.name, locationData.name)
            )
            .limit(1);
        
        // Check if coordinates are close enough (within ~100m)
        if (existingLocation.length > 0) {
            const existing = existingLocation[0];
            const existingCoords = existing.coordinates as number[];
            const distance = this.calculateHaversineDistance(
                existingCoords[0], existingCoords[1],
                locationData.latitude, locationData.longitude
            );
            
            // If within 100 meters, consider it the same location
            if (distance < 0.1) {
                return existing.id;
            }
        }
        
        // Create new location if no close match found
        const result = await db.insert(locations).values({
            name: locationData.name,
            coordinates: coordinates,
        }).returning({ id: locations.id });
        
        return result[0].id;
    }

    async createLocationIfNotExists(locationData: unknown): Promise<string> {
        const validatedLocation = FoodLocationSchema.parse(locationData);
        return await this.getOrCreateLocation(validatedLocation);
    }

    async findNearestLocationByName(
        name: string,
        latitude: number,
        longitude: number,
        maxDistanceKm: number = 50
    ): Promise<{ id: string; name: string; latitude: number; longitude: number; distance: number } | null> {
        // Use pgvector's cosine distance for geographic proximity
        // Convert lat/lng to a normalized vector for better distance calculation
        const queryVector = [latitude, longitude];
        
        const db = await getDB();
        const results = await db.select({
            id: locations.id,
            name: locations.name,
            coordinates: locations.coordinates,
            // Calculate Euclidean distance using pgvector
            distance: sql<number>`${locations.coordinates} <-> ${queryVector}::vector`
        })
        .from(locations)
        .where(eq(locations.name, name))
        .orderBy(asc(sql`${locations.coordinates} <-> ${queryVector}::vector`))
        .limit(10);
        
        if (results.length === 0) {
            return null;
        }
        
        // Filter by actual haversine distance and find the closest
        let closest: typeof results[0] | null = null;
        let minDistance = Infinity;
        
        for (const result of results) {
            const coords = result.coordinates as number[];
            const actualDistance = this.calculateHaversineDistance(
                coords[0], coords[1],
                latitude, longitude
            );
            
            if (actualDistance <= maxDistanceKm && actualDistance < minDistance) {
                minDistance = actualDistance;
                closest = result;
            }
        }
        
        if (!closest) {
            return null;
        }
        
        const coords = closest.coordinates as number[];
        return {
            id: closest.id,
            name: closest.name,
            latitude: coords[0],
            longitude: coords[1],
            distance: minDistance
        };
    }

    async findAllLocationsNear(
        latitude: number,
        longitude: number,
        maxDistanceKm: number = 10
    ): Promise<Array<{ id: string; name: string; latitude: number; longitude: number; distance: number }>> {
        const queryVector = [latitude, longitude];
        
        const db = await getDB();
        const results = await db.select({
            id: locations.id,
            name: locations.name,
            coordinates: locations.coordinates,
        })
        .from(locations)
        .orderBy(asc(sql`${locations.coordinates} <-> ${queryVector}::vector`))
        .limit(50); // Get more results to filter by actual distance
        
        const nearbyLocations: Array<{ id: string; name: string; latitude: number; longitude: number; distance: number }> = [];
        
        for (const result of results) {
            const coords = result.coordinates as number[];
            const distance = this.calculateHaversineDistance(
                coords[0], coords[1],
                latitude, longitude
            );
            
            if (distance <= maxDistanceKm) {
                nearbyLocations.push({
                    id: result.id,
                    name: result.name,
                    latitude: coords[0],
                    longitude: coords[1],
                    distance: distance
                });
            }
        }
        
        // Sort by actual distance
        return nearbyLocations.sort((a, b) => a.distance - b.distance);
    }

    private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    private degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    validateLocationData(data: unknown): FoodLocation {
        return FoodLocationSchema.parse(data);
    }
}