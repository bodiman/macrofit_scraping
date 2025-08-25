import { MenuService } from "./db/services/menu_service.ts";
import { type Menu, type MenuWithLocation } from "./db/data_transfer_objects/types.ts";
import ProgressBar from "progress";

abstract class MenuScraper {
    protected menuService: MenuService;
    
    constructor() {
        this.menuService = new MenuService();
    }

    abstract scrape(kwargs: Object): Promise<Menu[] | MenuWithLocation[]>;

    async saveMenus(menus: (Menu | MenuWithLocation)[], override: boolean = false): Promise<string[]> {
        const menusToSave = override ? menus : await this.filterExistingMenus(menus);
        const menuIds: string[] = [];
        
        if (menusToSave.length === 0) {
            console.log("No new menus to save (all already exist)");
            return menuIds;
        }

        console.log(`Saving ${menusToSave.length}/${menus.length} menus (${menus.length - menusToSave.length} already exist)`);
        
        const bar = new ProgressBar(':bar :current/:total', { total: menusToSave.length });

        for (const menu of menusToSave) {
            try {
                const menuId = await this.menuService.createMenuFromZod(menu);
                menuIds.push(menuId);
                bar.tick();
            } catch (error) {
                console.error(`Failed to save menu:`, error);
                throw error;
            }
        }
        
        return menuIds;
    }

    private async filterExistingMenus(menus: (Menu | MenuWithLocation)[]): Promise<(Menu | MenuWithLocation)[]> {
        const newMenus: (Menu | MenuWithLocation)[] = [];

        for (const menu of menus) {
            const locationName = 'location' in menu && typeof menu.location === 'object' 
                ? menu.location.name 
                : menu.location as string;

            const startTime = new Date(menu.start_time);
            const endTime = new Date(menu.end_time);

            const existingMenus = await this.menuService.getMenusByNameAndTimeWindow(
                locationName,
                startTime,
                endTime
            );

            if (existingMenus.length === 0) {
                newMenus.push(menu);
            }
        }

        return newMenus;
    }

    async saveMenu(menu: Menu | MenuWithLocation): Promise<string> {
        return await this.menuService.createMenuFromZod(menu);
    }
}

export default MenuScraper;
