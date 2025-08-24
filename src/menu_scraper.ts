import { MenuService } from "./db/services/menu_service.ts";
import { type Menu, type MenuWithLocation } from "./db/data_transfer_objects/types.ts";
import ProgressBar from "progress";

abstract class MenuScraper {
    protected menuService: MenuService;
    
    constructor() {
        this.menuService = new MenuService();
    }

    abstract scrape(kwargs: Object): Promise<Menu[] | MenuWithLocation[]>;

    async saveMenus(menus: (Menu | MenuWithLocation)[]): Promise<string[]> {
        const menuIds: string[] = [];
        
        const bar = new ProgressBar(':bar :current/:total', { total: menus.length });

        for (const menu of menus) {
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

    async saveMenu(menu: Menu | MenuWithLocation): Promise<string> {
        return await this.menuService.createMenuFromZod(menu);
    }
}

export default MenuScraper;
