"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Items = void 0;
const db_1 = require("./db");
const modName = `SoftCoreLite`;
const MODITEMS = require("../../db/items.json");
const MODCLONE = {};
for (const key in MODITEMS) {
    try {
        MODCLONE[MODITEMS[key].CloneOf].push(key);
    }
    catch {
        MODCLONE[MODITEMS[key].CloneOf] = [];
        MODCLONE[MODITEMS[key].CloneOf].push(key);
    }
}
(0, db_1.export_json)(MODCLONE, "items_ids_mod");
const DB = __importStar(require("./db"));
const SPTRM = DB.SPTRM;
class Items {
    logger;
    tables;
    modConfig;
    jsonUtil;
    constructor(logger, tables, modConfig, jsonUtil) {
        this.logger = logger;
        this.tables = tables;
        this.modConfig = modConfig;
        this.jsonUtil = jsonUtil;
    }
    itemDB() {
        return this.tables.templates.items;
    }
    questDB() {
        return this.tables.templates.quests;
    }
    balanceMagLoadSpeed() {
    }
    createCustomItems() {
        for (let ID in MODITEMS) {
            this.addItem(MODITEMS[ID].CloneOf, ID, "violet");
            this.addToHandbook(ID, MODITEMS[ID]);
            this.addToLocale(ID, MODITEMS[ID]);
            this.updateItemProperties(ID);
        }
        // There are no weapons currently
        // this.addToMastering(ID, MODITEMS[ID].Mastering);
        // this.addCustomWeapsToQuests(MODITEMS[ID].CloneOf, ID);
        for (let item in this.itemDB()) {
            // Iterate over only items which has Slots.
            this.setItemFilters(this.itemDB()[item]);
        }
    }
    setItemFilters(item) {
        // Push all item ID from MODITEMS which are cloned from the same source into the filter of where the source ID are present
        for (const slot in item._props.Slots) {
            const SLOT = item._props.Slots[slot];
            // DEBUG
            // if (SLOT._props?.filters !== undefined && Object.keys(MODCLONE).some(key => SLOT._props.filters[0].Filter.includes(key))) {
            //     export_json(item, `items/${item._name}${item._id.slice(-4)}`)
            // }
            if (SLOT._props?.filters !== undefined) {
                SLOT._props.filters[0].Filter.push(...Object.entries(MODCLONE).filter(([key,]) => SLOT._props.filters[0].Filter.includes(key)).flatMap(([, value]) => value));
            }
        }
        // Push all item ID from MODITEMS which are cloned from the same source into the filter of where the source ID are present
        // Somehow Realism mod is pushing weird numbers and stuff into the ConflictingItems property...
        // And at this point I'm too afraid to ask...
        if (item._props?.ConflictingItems !== undefined) {
            item._props.ConflictingItems.push(...Object.entries(MODCLONE).filter(([key,]) => item._props.ConflictingItems.includes(key)).flatMap(([, value]) => value));
        }
        // if (this.modConfig.debug_db) {
        //     export_json(item, `items/${item._name}${item._id.slice(-4)}`)
        // }
    }
    updateItemProperties(ID) {
        const subject = this.itemDB()[ID];
        // this.logger.info(subject)
        this.setProperties(subject, MODITEMS[ID]._Properties);
        this.setRealism(subject, MODITEMS[ID]._Properties);
    }
    setRealism(subject, moddb) {
        subject._props.ConflictingItems.push(...["SPTRM", ...Object.entries(SPTRM).map(([k,]) => moddb[k] ?? SPTRM[k])]);
    }
    setProperties(subject, moddb) {
        for (const key in moddb) {
            switch (key) {
                case "MagSize":
                    subject._props.Cartridges[0]._max_count = moddb[key];
                    break;
                default:
                    if (key in subject._props) {
                        subject._props[key] = moddb[key];
                    }
                    else {
                        this.logger.info(`[${modName}] item ${subject._id}'s property - ${key} is not handled.`);
                    }
                    break;
            }
        }
    }
    addToMastering(id, masteringCat) {
        // Plan to make this feature capable of generating the full-weapon preset picture
        // Currently this function only makes the Skill Mastering UI to show the core component of a newly added weapon
        let mastering = this.tables.globals.config.Mastering;
        for (let cat in mastering) {
            if (mastering[cat].Name === masteringCat) {
                mastering[cat].Templates.push(id);
            }
        }
    }
    addCustomWeapsToQuests(targetWeap, weapToAdd) {
        for (let quest in this.questDB) {
            let conditions = this.questDB[quest].conditions.AvailableForFinish[0];
            if (conditions._parent === "CounterCreator") {
                let killConditions = conditions._props.counter.conditions[0];
                if (killConditions._parent === "Kills" && killConditions._props?.weapon !== undefined) {
                    if (killConditions._props.weapon.includes(targetWeap)) {
                        killConditions._props.weapon.push(weapToAdd);
                    }
                }
            }
        }
    }
    addItem(CloneOf, NewID, Rarity) {
        this.cloneItem(CloneOf, NewID);
        let NewItem = this.itemDB()[NewID];
        NewItem._props.BackgroundColor = Rarity;
        if (this.modConfig.debug == true) {
            this.logger.info("Item " + NewItem._id + " Added");
        }
    }
    cloneItem(CloneOf, NewID) {
        this.itemDB()[NewID] = this.jsonUtil.clone(this.itemDB()[CloneOf]);
        this.itemDB()[NewID]._id = NewID;
        this.itemDB()[NewID]._name = NewID;
        if (this.modConfig.debug == true) {
            this.logger.info(this.itemDB()[CloneOf]._name + " cloned");
        }
    }
    addToHandbook(id, record) {
        this.tables.templates.handbook.Items.push({
            "Id": id,
            "ParentId": db_1.HANDBOOK[db_1.BOOKMARKS[record.Type]],
            "Price": record._Procurement?.Price
        });
    }
    addToLocale(id, item) {
        const locales = this.tables.locales.global;
        for (let lang in locales) {
            locales[lang][`${id} Name`] = item._Locales?.Name;
            locales[lang][`${id} ShortName`] = item._Locales?.ShortName;
            locales[lang][`${id} Description`] = item._Locales?.Description;
        }
    }
}
exports.Items = Items;
//# sourceMappingURL=items.js.map