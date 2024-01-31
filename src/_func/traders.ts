import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger"
import { ITraderAssort } from "@spt-aki/models/eft/common/tables/ITrader";
import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";
import { Utils } from "./utils";

import { TRADERS } from "./db";
import { NICKNAME } from "./db";

const MOD_ITEMS: Record<string, Record<string, any>> = require("../../db/items.json");

export class Traders {
    constructor(private logger: ILogger, private tables: IDatabaseTables, private utils: Utils) { }

    itemDB(): Record<string, ITemplateItem> {
        return this.tables.templates.items;
    }

    public addItemsToAssorts() {
        for (let ID in MOD_ITEMS) {
            const trade:Record<string, any> = MOD_ITEMS[ID].Procurement
            this.assortItemPusher(trade.Trader, ID, trade.Stock, trade.Currency, trade.Loyalty, trade.Price);
        }
    }

    private assortItemPusher(trader: string, itemId: string, buyRestriction: number, saleCurrency: string, loyalLvl: number, price: number = 0, useHandbookPrice: boolean = false, priceMulti: number = 1) {
        let assort = this.tables.traders[NICKNAME[TRADERS[trader]]].assort;
        let assortId = this.utils.genId();
        if (useHandbookPrice == true) {
            price += this.handBookPriceLookup(itemId);
        }
        this.assortPusherHelper(assort, assortId, price, saleCurrency, loyalLvl, itemId, buyRestriction, priceMulti);

    }

    private handBookPriceLookup(itemId: string): number {
        let item = this.tables.templates.handbook.Items.find(i => i.Id === itemId);
        return item.Price;
    }

    private assortPusherHelper(assort: ITraderAssort, assortId: string, price: number, saleCurrency: string, loyalLvl: number, itemId: string, buyRestriction: number, priceMulti: number) {
        price *= priceMulti;
        assort.items.push(
            {
                "_id": assortId,
                "_tpl": itemId,
                "parentId": "hideout",
                "slotId": "hideout",
                "upd": {
                    "BuyRestrictionMax": buyRestriction,
                    "BuyRestrictionCurrent": 0,
                    "StackObjectsCount": 1
                }
            }
        );
        assort.barter_scheme[assortId] =
            [
                [
                    {
                        "count": price,
                        "_tpl": saleCurrency
                    }
                ]
            ];
        assort.loyal_level_items[assortId] = loyalLvl;
    }
}