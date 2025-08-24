import { db } from '../../index.ts';
import { macro_information_sources } from '../schema.ts';
import { eq } from 'drizzle-orm';

export interface MacroInformationSourceData {
    name: string;
    description?: string;
    error_confidence_description?: string;
}

export class ScraperService {
    
    async createMacroInformationSourceIfNotExists(sourceData: MacroInformationSourceData): Promise<string> {
        // const db = await getDB();
        const existingSource = await db.select()
            .from(macro_information_sources)
            .where(eq(macro_information_sources.name, sourceData.name))
            .limit(1);
        
        if (existingSource.length > 0) {
            return existingSource[0].id;
        }
        
        const result = await db.insert(macro_information_sources).values({
            name: sourceData.name,
            description: sourceData.description || `Macro information source: ${sourceData.name}`,
            error_confidence_description: sourceData.error_confidence_description || 'No specific confidence information provided',
        }).returning({ id: macro_information_sources.id });
        
        return result[0].id;
    }

    async getMacroInformationSourceByName(name: string): Promise<{ id: string; name: string; description: string | null; error_confidence_description: string | null } | null> {
        // const db = await getDB();
        const result = await db.select()
            .from(macro_information_sources)
            .where(eq(macro_information_sources.name, name))
            .limit(1);
        
        return result[0] || null;
    }

    async getAllMacroInformationSources(): Promise<Array<{ id: string; name: string; description: string | null; error_confidence_description: string | null }>> {
        // const db = await getDB();
        return await db.select().from(macro_information_sources);
    }

    async deleteMacroInformationSource(id: string): Promise<void> {
        // const db = await getDB();
        await db.delete(macro_information_sources)
            .where(eq(macro_information_sources.id, id));
    }
}