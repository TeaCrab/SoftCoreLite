import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger"
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";

const fs = require("fs");
const path = require("path");
const modName = `SoftCoreLite`;

const traderPath = path.resolve(__dirname, "../../../../../Aki_Data/Server/database/traders");
const traderPaths = fs.readdirSync(traderPath);

let traders = {}
for (let e of traderPaths) {
    traders[e] = require(`../../../../../Aki_Data/Server/database/traders/${e}/base.json`);
}

const AKI_TRADERS = structuredClone(traders);
const AKI_HANDBOOK = require("../../../../../Aki_Data/Server/database/templates/handbook.json");
const AKI_LOCALES = require("../../../../../Aki_Data/Server/database/locales/global/en.json");
const AKI_ITEMS = require("../../../../../Aki_Data/Server/database/templates/items.json");
const AKI_GLOBALS = require("../../../../../Aki_Data/Server/database/globals.json");

//SPTRM default values - meaning the properties are not in use
//Keep the order of the keys
export const SPTRM = {
    ModType: "undefined",
    VerticalRecoil: "0",
    HorizontalRecoil: "0",
    Dispersion: "0",
    CameraRecoil: "0",
    AutoROF: "0",
    SemiROF: "0",
    ModMalfunctionChance: "0",
    ReloadSpeed: "0",
    AimSpeed: "0",
    ChamberSpeed: "0",
    Convergence: "0",
    CanCycleSubs: "false",
    RecoilAngle: "0",
    StockAllowADS: "false",
    FixSpeed: "0",
    ModShotDispersion: "0",
    MeleeDamage: "0",
    MeleePen: "0",
}

export var BOOK_REL:Record<string, Relation> = {};
export var BOOK_IDS:Record<string, string> = {};
export var BOOKTREE:Record<string, any> = {}

export var ITEM_REL:Record<string, Relation> = {};
export var ITEM_IDS:Record<string, string> = {};
export var ITEMTREE:Record<string, any> = {};

export var TRADERS:Record<string, string> = {};
export var HANDBOOK:Record<string, string> = {};
export var NICKNAMES:Record<string, string> = {};
export var BOOKMARKS:Record<string, string> = {};

JSON_book_rel(); // Generates KeyName:{ID, ParentID} records
JSON_book_ids(); // Generates ID:KeyName table
JSON_booktree(); // Generates ParentKeyName:{ChildKeyName...} tree

JSON_item_rel(); // Generates KeyName:{ID, ParentID} records
JSON_item_ids(); // Generates ID:KeyName table
JSON_itemtree(); // Generates ParentKeyName:{ChildKeyName...} tree

JSON_traders(); // Generates KeyName:ID table
JSON_handbook(); // Generates KeyName:ID table
JSON_nicknames(); // Generates Name:KeyName table
JSON_bookmarks(); // Generates Name:KeyName table

const SPTRM_KEYS = Object.keys(SPTRM);
const SPTRM_VALS = Object.values(SPTRM);

function RMIDX(key:string) {
    return SPTRM_KEYS.indexOf(key)+1
}

// console.log(SPTRM_KEYS);
// console.log(SPTRM_VALS);

type Relation = {
    ID: string;
    ParentID: string;
};

type Tree = {
    [key: string] : Tree;
}

function date():string {
    const _ = new Date;
    return `${JSON.stringify(_).slice(1,11).replace(/-/g, "")}`
}

function hasProperties(subject, properties:string[]) {
    return properties.some(key => checkProp(key, subject))
}

function checkProp(prop, subject):boolean {
    if (prop in subject) {
        if (subject[prop] !== 0 ?? false) return true
    } else if (SPTRM_KEYS.includes(prop) && subject?.ConflictingItems !== undefined && subject.ConflictingItems[0] === "SPTRM") {
        if (subject.ConflictingItems[RMIDX(prop)] !== SPTRM[prop]) return true
    } else {
        switch (prop) {
            case "MagSize":
                if (subject.Cartridges !== undefined ?? false) return true
                break;
            case "Armor":
                console.log(`[${modName}.debug] returnProp() of ${prop} - to do.`);
                break;
            default:
                return false
        }
    }
    return false
}

export function MAG_LOADUNLOAD_BALANCER(dividend: number) {
    if (dividend > 0) {
        return Math.ceil((~~(dividend / 5)) / 5) * 5
    } else {
        return dividend
    }
}

function returnProp(subject, properties):Record<string, any> {
    let record = {}
    for (const prop of properties) {
        if (SPTRM_KEYS.includes(prop)) {
            record[prop] = subject.ConflictingItems[RMIDX(prop)];
            // console.log(prop, record[prop])
        } else if (prop in subject) {
            record[prop] = subject[prop];
        } else {
            switch (prop) {
                case "MagSize":
                    record[prop] = subject.Cartridges[0]._max_count;
                    break;
                default:
                    console.log(`[${modName}.debug] returnProp() of ${prop} - is not handled.`);
                    break;
            }
        }
    }
    return record;
}

function setProp(subject, properties:string[], functions:CallableFunction[]) {
    const functable = Object.fromEntries(properties.map((e, i) => [e, functions[i]]))
    for (const prop in functable) {
        if (SPTRM_KEYS.includes(prop)) {
            subject.ConflictingItems[RMIDX(prop)] = functable[prop](subject.ConflictingItems[RMIDX(prop)]) as string;
        } else if (prop in subject) {
            subject[prop] = functable[prop](subject[prop]);
        } else {
            switch (prop) {
                case "MagSize":
                    subject.Cartridges[0]._max_count = functable[prop](subject.Cartridges[0]._max_count);
                    break;
                default:
                    console.log(`[${modName}.debug] setProp() of ${prop} - is not handled.`);
                    break;
            }
        }
    }
}

export class DB_UTIL {
    constructor(private logger: ILogger, private tables: IDatabaseTables, private modConfig, private jsonUtil: JsonUtil) {}

    itemDB(): Record<string, ITemplateItem> {
        return this.tables.templates.items;
    }

    globals(): Record<string, any> {
        return this.tables.globals;
    }

    //The size of Callable Functions must match the size of properties - functions are mapped to the properties
    public set_prop(categories:string[], properties:string[], functions:CallableFunction[]) {
        for (const entry of Object.entries(this.itemDB()).filter(([, v]) => categories.includes(v._parent) && hasProperties(v._props, properties))) {
            // console.log(entry);
            setProp(this.itemDB()[entry[1]._id]._props, properties, functions);
        }
    }

    public dump_prop(categories:string[], properties:string[]) {
        const targets = Object.entries(this.itemDB()).filter(([k, v]) => categories.includes(v._parent) && hasProperties(v._props, properties));
        const result = Object.fromEntries(targets.map(([k, v]) => [k, returnProp(v._props, properties)]));
        export_json(result, `item_stat_${date()}`);
    }

    public dump_individual_itemDB() {
        for (let item in this.itemDB()) {
            export_json(this.itemDB()[item], `items_loose_${date()}/${this.itemDB()[item]._name}${this.itemDB()[item]._id.slice(-4)}`);
        }
    }

    public dump_itemDB(mode = 0) {
        switch (mode) {
            case 1:
                const new_items = Object.fromEntries(Object.entries(this.itemDB()).filter(([k, v]) => !(k in AKI_ITEMS)));
                export_json(new_items, `items_${date()}/items_newDB`);
                break;
            default:
                export_json(AKI_ITEMS, `items_${date()}/items_preDB`);
                export_json(this.itemDB(), `items_${date()}/items_postDB`);
        }
    }

    public dump_mastering_category() {
        export_json(AKI_GLOBALS.config.Mastering, `globals_${date()}/mastering_preDB`);
        export_json(this.globals().config.Mastering, `globals_${date()}/mastering_postDB`);
    }
}

export function export_json(object, filename: string = "db_debug") {
    // Export object as JSON file
    const filepath = `./user/mods/SoftCoreLite/aki/${filename}.json`
    if (fs.existsSync(path.dirname(`${filepath}`)) === false) {
        fs.mkdirSync(path.dirname(`${filepath}`), {recursive: true});
    }

    fs.writeFileSync(`${filepath}`, JSON.stringify(object), function (err) {
        if (err) throw err;
        console.log(`[SoftCoreLite]\\aki\\${filename}.json`);
    });
}

function grow(tree: Tree, buds:object, branch: string, _ID_REFERENCE:Record<string, string>) {
    // Recursively assign child items to their parents on a given Relation Record & matching ID:KeyName table
    for (const bud in Object.fromEntries(Object.entries(buds).filter(([k, v]) => _ID_REFERENCE[v.ParentID] === branch))) {
        // console.log(bud, branch, buds[bud].parent);
        try {
            tree[branch][bud] = {};
        } catch {
            tree[branch] = {};
            tree[branch][bud] = {};
        }
    }
    tree[branch] = Object.fromEntries(Object.entries(tree[branch]).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    for (const subbranch in tree[branch]) {
        grow(tree[branch], buds, subbranch, _ID_REFERENCE);
    }
    return tree
}

function trim(tree: Tree, level: number = -1) {
    // Remove leaves or branches
    for (let i:number = 0; i > level && i + age(tree) >= 0; i--) {
        // To be implemented
    }
}

function age(tree: Tree, level: number = 0): number {
    const branches = Object.entries(tree).filter(([k, v]) => v !== undefined);
    return Math.max(age(Object.fromEntries(branches), level+1));
}

function JSON_book_rel(filename: string = "book_rel", _HANDBOOK = AKI_HANDBOOK, _LOCALES = AKI_LOCALES) {
    // Generate KeyName:{ID, ParentID} Relation Record for handbook entries from default SPT-AKI json files
    for (let i=0; i< _HANDBOOK.Categories.length; i++) {
        let entry = _HANDBOOK.Categories[i]
        BOOK_REL[_LOCALES[entry.Id]] = {"ID": entry.Id, "ParentID": entry.ParentId};
    }
    BOOK_REL = Object.fromEntries(Object.entries(BOOK_REL).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(BOOK_REL);
    export_json(BOOK_REL, filename);
}

function JSON_book_ids(filename: string = "book_ids") {
    // Generate ID:KeyName pairing table from already processed BOOK_REL record
    for (const e in BOOK_REL) {
        BOOK_IDS[BOOK_REL[e].ID] = e;
    }
    // Use book ID as key and their name as value for easier reference.
    BOOK_IDS = Object.fromEntries(Object.entries(BOOK_IDS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    export_json(BOOK_IDS, filename);
}

function JSON_booktree(filename: string = "booktree") {
    // Create tree hierarchy - BOOKTREE based on already processed BOOK_REL and BOOK_IDS record
    const rootnode = Object.fromEntries(Object.entries(BOOK_REL).filter(([k, v]) => v.ParentID === null));
    const buds = Object.fromEntries(Object.entries(BOOK_REL).filter(([k, v]) => v.ParentID !== null));
    for (let keybranch of Object.keys(rootnode)) {
        BOOKTREE[keybranch] = {};
        grow(BOOKTREE, buds, keybranch, BOOK_IDS);
    }
    export_json(BOOKTREE, filename);
}

function JSON_item_rel(filename: string = "item_rel", _ITEMS = AKI_ITEMS, _LOCALES = AKI_LOCALES) {
    // Generate KeyName:{ID, ParentID} Relation Record for all items from default SPT-AKI json files
    for (const e in _ITEMS) {
        if (_ITEMS[e]._name in ITEM_REL) {
            const _entry:string = _LOCALES[e+" Name"];
            // const _entry:string = _LOCALES[e + " Name"];
            if (_entry in ITEM_REL) {
                console.log(`Duplicate item name ${_ITEMS[e]._name} - ${e} Found!`);
                console.log(`Locale of ${e}: ${_LOCALES[e+" Name"]}`);
            } else {
                ITEM_REL[_LOCALES[e+" Name"]] = {"ID": e, "ParentID": _ITEMS[e]._parent};
            }
        } else {
            ITEM_REL[_ITEMS[e]._name] = {"ID": e, "ParentID": _ITEMS[e]._parent};
        }
    }
    ITEM_REL = Object.fromEntries(Object.entries(ITEM_REL).sort(([k1, v1], [k2, v2]) => v1.ParentID.localeCompare(v2.ParentID)));
    export_json(ITEM_REL, filename);
}

function JSON_item_ids(filename: string = "item_ids") {
    // Generate ID:KeyName pairing table from already processed ITEM_REL record
    for (const e in ITEM_REL) {
        ITEM_IDS[ITEM_REL[e].ID] = e;
    }
    // Use item ID as key and their name as value for easier reference.
    ITEM_IDS = Object.fromEntries(Object.entries(ITEM_IDS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    export_json(ITEM_IDS, filename);
}

function JSON_itemtree(filename: string = "itemtree") {
    // Create tree hierarchy - ITEMTREE based on already processed ITEM_REL and ITEM_IDS record
    const rootnode = Object.fromEntries(Object.entries(ITEM_REL).filter(([k, v]) => v.ParentID === ""));
    const buds = Object.fromEntries(Object.entries(ITEM_REL).filter(([k, v]) => v.ParentID !== ""));
    for (let keybranch of Object.keys(rootnode)) {
        ITEMTREE[keybranch] = {};
        grow(ITEMTREE, buds, keybranch, ITEM_IDS);
    }
    export_json(ITEMTREE, filename);
}

function JSON_itemtree_trimmed(filename: string = "itemtree_trimmed") {
    // Remove all leaf items in the ITEMTREE
    // To be implemented
}

function JSON_handbook(filename: string = "book") {
    // Generate KeyName:ID pairing table from already processed BOOK_REL record
    for (const e in BOOK_REL) {
        HANDBOOK[e] = BOOK_REL[e].ID;
    }
    HANDBOOK = Object.fromEntries(Object.entries(HANDBOOK).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(HANDBOOK);
    export_json(HANDBOOK, filename);
}

function JSON_bookmarks(filename: string = "bookmarks") {
    // Take into account existing shortcuts
    try {
        const bookmarks = require(`../../aki/${filename}_extra.json`);
        for (let e in bookmarks) {
            BOOKMARKS[e] = bookmarks[e];
        }
    } catch (err) {
        console.log(`[SoftCoreLite]: Handbook Bookmark loading failed.  A new one will be created.`);
    }
    // Generate variations of Name(without spaces):KeyName pairing table for extra shortcuts (to ease the pain of typo or whatever)
    for (const e in BOOK_REL) {
        BOOKMARKS[e.replace(/[\s-]+/g, "").toLowerCase()] = e;
    }
    for (let e in BOOKMARKS) {
        BOOKMARKS[e.replace(/s$/g, "").toLowerCase()] = BOOKMARKS[e];
        BOOKMARKS[e.replace(/([^s])$/g, "$1s").toLowerCase()] = BOOKMARKS[e];
    }
    // Sort shortcuts by value than key.
    BOOKMARKS = Object.fromEntries(Object.entries(BOOKMARKS).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    BOOKMARKS = Object.fromEntries(Object.entries(BOOKMARKS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    // console.log(BOOKMARKS);
    export_json(BOOKMARKS, filename);
}

function JSON_traders(filename:string = "traders", _TRADERS = AKI_TRADERS) {
    // Generate KeyName:ID pairing table for traders from default SPT-AKI database
    for (const e in _TRADERS) {
        TRADERS[_TRADERS[e].nickname] = e;
    }
    TRADERS = Object.fromEntries(Object.entries(TRADERS).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(TRADERS);
    export_json(TRADERS, filename);
}

function JSON_nicknames(filename:string = "nicknames") {
    // Take into account existing nicknames
    try {
        const nicknames = require(`../../aki/${filename}_extra.json`);
        for (let e in nicknames) {
            NICKNAMES[e] = nicknames[e];
        }
    } catch (err) {
        console.log(`[SoftCoreLite]: Trader Nickname loading failed.  A new one will be created.`);
    }
    // Generate additional Name(without spaces):KeyName pairing table for extra nicknames (to ease the pain of typo or whatever)
    for (const e in TRADERS) {
        NICKNAMES[e.replace(/s$/g, "").toLowerCase()] = e;
    }
    NICKNAMES = Object.fromEntries(Object.entries(NICKNAMES).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    NICKNAMES = Object.fromEntries(Object.entries(NICKNAMES).sort(([k1, v1], [k2, v2]) => NICKNAMES[k1].localeCompare(NICKNAMES[k2])));
    // console.log(NICKNAMES);
    export_json(NICKNAMES, filename);
}