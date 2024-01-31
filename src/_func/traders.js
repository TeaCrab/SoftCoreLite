"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Traders = void 0;
const db_1 = require("./db");
const db_2 = require("./db");
const MOD_ITEMS = require("../../db/items.json");
class Traders {
    logger;
    tables;
    utils;
    constructor(logger, tables, utils) {
        this.logger = logger;
        this.tables = tables;
        this.utils = utils;
    }
    itemDB() {
        return this.tables.templates.items;
    }
    addItemsToAssorts() {
        for (let ID in MOD_ITEMS) {
            const trade = MOD_ITEMS[ID].Procurement;
            this.assortItemPusher(trade.Trader, ID, trade.Stock, trade.Currency, trade.Loyalty, trade.Price);
        }
    }
    assortItemPusher(trader, itemId, buyRestriction, saleCurrency, loyalLvl, price = 0, useHandbookPrice = false, priceMulti = 1) {
        let assort = this.tables.traders[db_2.NICKNAME[db_1.TRADERS[trader]]].assort;
        let assortId = this.utils.genId();
        if (useHandbookPrice == true) {
            price += this.handBookPriceLookup(itemId);
        }
        this.assortPusherHelper(assort, assortId, price, saleCurrency, loyalLvl, itemId, buyRestriction, priceMulti);
    }
    handBookPriceLookup(itemId) {
        let item = this.tables.templates.handbook.Items.find(i => i.Id === itemId);
        return item.Price;
    }
    assortPusherHelper(assort, assortId, price, saleCurrency, loyalLvl, itemId, buyRestriction, priceMulti) {
        price *= priceMulti;
        assort.items.push({
            "_id": assortId,
            "_tpl": itemId,
            "parentId": "hideout",
            "slotId": "hideout",
            "upd": {
                "BuyRestrictionMax": buyRestriction,
                "BuyRestrictionCurrent": 0,
                "StackObjectsCount": 1
            }
        });
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
exports.Traders = Traders;
//# sourceMappingURL=traders.js.map