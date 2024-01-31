"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.export_json = exports.DB_UTIL = exports.MAG_LOADUNLOAD_BALANCER = exports.BOOKMARKS = exports.NICKNAMES = exports.HANDBOOK = exports.TRADERS = exports.ITEMTREE = exports.ITEM_IDS = exports.ITEM_REL = exports.BOOKTREE = exports.BOOK_IDS = exports.BOOK_REL = exports.SPTRM = void 0;
const fs = require("fs");
const path = require("path");
const modName = `SoftCoreLite`;
const traderPath = path.resolve(__dirname, "../../../../../Aki_Data/Server/database/traders");
const traderPaths = fs.readdirSync(traderPath);
let traders = {};
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
exports.SPTRM = {
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
};
exports.BOOK_REL = {};
exports.BOOK_IDS = {};
exports.BOOKTREE = {};
exports.ITEM_REL = {};
exports.ITEM_IDS = {};
exports.ITEMTREE = {};
exports.TRADERS = {};
exports.HANDBOOK = {};
exports.NICKNAMES = {};
exports.BOOKMARKS = {};
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
const SPTRM_KEYS = Object.keys(exports.SPTRM);
const SPTRM_VALS = Object.values(exports.SPTRM);
function RMIDX(key) {
    return SPTRM_KEYS.indexOf(key) + 1;
}
function date() {
    const _ = new Date;
    return `${JSON.stringify(_).slice(1, 11).replace(/-/g, "")}`;
}
function hasProperties(subject, properties) {
    return properties.some(key => checkProp(key, subject));
}
function checkProp(prop, subject) {
    if (prop in subject) {
        if (subject[prop] !== 0 ?? false)
            return true;
    }
    else if (SPTRM_KEYS.includes(prop) && subject?.ConflictingItems !== undefined && subject.ConflictingItems[0] === "SPTRM") {
        if (subject.ConflictingItems[RMIDX(prop)] !== exports.SPTRM[prop])
            return true;
    }
    else {
        switch (prop) {
            case "MagSize":
                if (subject.Cartridges !== undefined ?? false)
                    return true;
            default:
                return false;
        }
    }
    return false;
}
function MAG_LOADUNLOAD_BALANCER(dividend) {
    if (dividend > 0) {
        return Math.ceil((~~(dividend / 5)) / 5) * 5;
    }
    else {
        return dividend;
    }
}
exports.MAG_LOADUNLOAD_BALANCER = MAG_LOADUNLOAD_BALANCER;
function returnProp(subject, properties) {
    let record = {};
    for (const prop of properties) {
        if (SPTRM_KEYS.includes(prop)) {
            record[prop] = subject.ConflictingItems[RMIDX(prop)];
            // console.log(prop, record[prop])
        }
        else if (prop in subject) {
            record[prop] = subject[prop];
        }
        else {
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
function setProp(subject, properties, functions) {
    const functable = Object.fromEntries(properties.map((e, i) => [e, functions[i]]));
    for (const prop in functable) {
        if (SPTRM_KEYS.includes(prop)) {
            subject.ConflictingItems[RMIDX(prop)] = functable[prop](subject.ConflictingItems[RMIDX(prop)]);
        }
        else if (prop in subject) {
            subject[prop] = functable[prop](subject[prop]);
        }
        else {
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
class DB_UTIL {
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
    globals() {
        return this.tables.globals;
    }
    //The size of Callable Functions must match the size of properties - functions are mapped to the properties
    set_prop(categories, properties, functions) {
        for (const entry of Object.entries(this.itemDB()).filter(([, v]) => categories.includes(v._parent) && hasProperties(v._props, properties))) {
            // console.log(entry);
            setProp(this.itemDB()[entry[1]._id]._props, properties, functions);
        }
    }
    dump_prop(categories, properties) {
        const targets = Object.entries(this.itemDB()).filter(([k, v]) => categories.includes(v._parent) && hasProperties(v._props, properties));
        const result = Object.fromEntries(targets.map(([k, v]) => [k, returnProp(v._props, properties)]));
        export_json(result, `item_stat_${date()}`);
    }
    dump_individual_itemDB() {
        for (let item in this.itemDB()) {
            export_json(this.itemDB()[item], `items_loose_${date()}/${this.itemDB()[item]._name}${this.itemDB()[item]._id.slice(-4)}`);
        }
    }
    dump_itemDB(mode = 0) {
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
    dump_mastering_category() {
        export_json(AKI_GLOBALS.config.Mastering, `globals_${date()}/mastering_preDB`);
        export_json(this.globals().config.Mastering, `globals_${date()}/mastering_postDB`);
    }
}
exports.DB_UTIL = DB_UTIL;
function export_json(object, filename = "db_debug") {
    // Export object as JSON file
    const filepath = `./user/mods/SoftCoreLite/aki/${filename}.json`;
    if (fs.existsSync(path.dirname(`${filepath}`)) === false) {
        fs.mkdirSync(path.dirname(`${filepath}`), { recursive: true });
    }
    fs.writeFileSync(`${filepath}`, JSON.stringify(object), function (err) {
        if (err)
            throw err;
        console.log(`[SoftCoreLite]\\aki\\${filename}.json`);
    });
}
exports.export_json = export_json;
function grow(tree, buds, branch, _ID_REFERENCE) {
    // Recursively assign child items to their parents on a given Relation Record & matching ID:KeyName table
    for (const bud in Object.fromEntries(Object.entries(buds).filter(([k, v]) => _ID_REFERENCE[v.ParentID] === branch))) {
        // console.log(bud, branch, buds[bud].parent);
        try {
            tree[branch][bud] = {};
        }
        catch {
            tree[branch] = {};
            tree[branch][bud] = {};
        }
    }
    tree[branch] = Object.fromEntries(Object.entries(tree[branch]).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    for (const subbranch in tree[branch]) {
        grow(tree[branch], buds, subbranch, _ID_REFERENCE);
    }
    return tree;
}
function trim(tree, level = -1) {
    // Remove leaves or branches
    for (let i = 0; i > level && i + age(tree) >= 0; i--) {
        // To be implemented
    }
}
function age(tree, level = 0) {
    const branches = Object.entries(tree).filter(([k, v]) => v !== undefined);
    return Math.max(age(Object.fromEntries(branches), level + 1));
}
function JSON_book_rel(filename = "book_rel", _HANDBOOK = AKI_HANDBOOK, _LOCALES = AKI_LOCALES) {
    // Generate KeyName:{ID, ParentID} Relation Record for handbook entries from default SPT-AKI json files
    for (let i = 0; i < _HANDBOOK.Categories.length; i++) {
        let entry = _HANDBOOK.Categories[i];
        exports.BOOK_REL[_LOCALES[entry.Id]] = { "ID": entry.Id, "ParentID": entry.ParentId };
    }
    exports.BOOK_REL = Object.fromEntries(Object.entries(exports.BOOK_REL).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(BOOK_REL);
    export_json(exports.BOOK_REL, filename);
}
function JSON_book_ids(filename = "book_ids") {
    // Generate ID:KeyName pairing table from already processed BOOK_REL record
    for (const e in exports.BOOK_REL) {
        exports.BOOK_IDS[exports.BOOK_REL[e].ID] = e;
    }
    // Use book ID as key and their name as value for easier reference.
    exports.BOOK_IDS = Object.fromEntries(Object.entries(exports.BOOK_IDS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    export_json(exports.BOOK_IDS, filename);
}
function JSON_booktree(filename = "booktree") {
    // Create tree hierarchy - BOOKTREE based on already processed BOOK_REL and BOOK_IDS record
    const rootnode = Object.fromEntries(Object.entries(exports.BOOK_REL).filter(([k, v]) => v.ParentID === null));
    const buds = Object.fromEntries(Object.entries(exports.BOOK_REL).filter(([k, v]) => v.ParentID !== null));
    for (let keybranch of Object.keys(rootnode)) {
        exports.BOOKTREE[keybranch] = {};
        grow(exports.BOOKTREE, buds, keybranch, exports.BOOK_IDS);
    }
    export_json(exports.BOOKTREE, filename);
}
function JSON_item_rel(filename = "item_rel", _ITEMS = AKI_ITEMS, _LOCALES = AKI_LOCALES) {
    // Generate KeyName:{ID, ParentID} Relation Record for all items from default SPT-AKI json files
    for (const e in _ITEMS) {
        if (_ITEMS[e]._name in exports.ITEM_REL) {
            const _entry = _LOCALES[e + " Name"];
            // const _entry:string = _LOCALES[e + " Name"];
            if (_entry in exports.ITEM_REL) {
                console.log(`Duplicate item name ${_ITEMS[e]._name} - ${e} Found!`);
                console.log(`Locale of ${e}: ${_LOCALES[e + " Name"]}`);
            }
            else {
                exports.ITEM_REL[_LOCALES[e + " Name"]] = { "ID": e, "ParentID": _ITEMS[e]._parent };
            }
        }
        else {
            exports.ITEM_REL[_ITEMS[e]._name] = { "ID": e, "ParentID": _ITEMS[e]._parent };
        }
    }
    exports.ITEM_REL = Object.fromEntries(Object.entries(exports.ITEM_REL).sort(([k1, v1], [k2, v2]) => v1.ParentID.localeCompare(v2.ParentID)));
    export_json(exports.ITEM_REL, filename);
}
function JSON_item_ids(filename = "item_ids") {
    // Generate ID:KeyName pairing table from already processed ITEM_REL record
    for (const e in exports.ITEM_REL) {
        exports.ITEM_IDS[exports.ITEM_REL[e].ID] = e;
    }
    // Use item ID as key and their name as value for easier reference.
    exports.ITEM_IDS = Object.fromEntries(Object.entries(exports.ITEM_IDS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    export_json(exports.ITEM_IDS, filename);
}
function JSON_itemtree(filename = "itemtree") {
    // Create tree hierarchy - ITEMTREE based on already processed ITEM_REL and ITEM_IDS record
    const rootnode = Object.fromEntries(Object.entries(exports.ITEM_REL).filter(([k, v]) => v.ParentID === ""));
    const buds = Object.fromEntries(Object.entries(exports.ITEM_REL).filter(([k, v]) => v.ParentID !== ""));
    for (let keybranch of Object.keys(rootnode)) {
        exports.ITEMTREE[keybranch] = {};
        grow(exports.ITEMTREE, buds, keybranch, exports.ITEM_IDS);
    }
    export_json(exports.ITEMTREE, filename);
}
function JSON_itemtree_trimmed(filename = "itemtree_trimmed") {
    // Remove all leaf items in the ITEMTREE
    // To be implemented
}
function JSON_handbook(filename = "book") {
    // Generate KeyName:ID pairing table from already processed BOOK_REL record
    for (const e in exports.BOOK_REL) {
        exports.HANDBOOK[e] = exports.BOOK_REL[e].ID;
    }
    exports.HANDBOOK = Object.fromEntries(Object.entries(exports.HANDBOOK).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(HANDBOOK);
    export_json(exports.HANDBOOK, filename);
}
function JSON_bookmarks(filename = "bookmarks") {
    // Take into account existing shortcuts
    try {
        const bookmarks = require(`../../aki/${filename}_extra.json`);
        for (let e in bookmarks) {
            exports.BOOKMARKS[e] = bookmarks[e];
        }
    }
    catch (err) {
        console.log(`[SoftCoreLite]: Handbook Bookmark loading failed.  A new one will be created.`);
    }
    // Generate variations of Name(without spaces):KeyName pairing table for extra shortcuts (to ease the pain of typo or whatever)
    for (const e in exports.BOOK_REL) {
        exports.BOOKMARKS[e.replace(/[\s-]+/g, "").toLowerCase()] = e;
    }
    for (let e in exports.BOOKMARKS) {
        exports.BOOKMARKS[e.replace(/s$/g, "").toLowerCase()] = exports.BOOKMARKS[e];
        exports.BOOKMARKS[e.replace(/([^s])$/g, "$1s").toLowerCase()] = exports.BOOKMARKS[e];
    }
    // Sort shortcuts by value than key.
    exports.BOOKMARKS = Object.fromEntries(Object.entries(exports.BOOKMARKS).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    exports.BOOKMARKS = Object.fromEntries(Object.entries(exports.BOOKMARKS).sort(([k1, v1], [k2, v2]) => v1.localeCompare(v2)));
    // console.log(BOOKMARKS);
    export_json(exports.BOOKMARKS, filename);
}
function JSON_traders(filename = "traders", _TRADERS = AKI_TRADERS) {
    // Generate KeyName:ID pairing table for traders from default SPT-AKI database
    for (const e in _TRADERS) {
        exports.TRADERS[_TRADERS[e].nickname] = e;
    }
    exports.TRADERS = Object.fromEntries(Object.entries(exports.TRADERS).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    // console.log(TRADERS);
    export_json(exports.TRADERS, filename);
}
function JSON_nicknames(filename = "nicknames") {
    // Take into account existing nicknames
    try {
        const nicknames = require(`../../aki/${filename}_extra.json`);
        for (let e in nicknames) {
            exports.NICKNAMES[e] = nicknames[e];
        }
    }
    catch (err) {
        console.log(`[SoftCoreLite]: Trader Nickname loading failed.  A new one will be created.`);
    }
    // Generate additional Name(without spaces):KeyName pairing table for extra nicknames (to ease the pain of typo or whatever)
    for (const e in exports.TRADERS) {
        exports.NICKNAMES[e.replace(/s$/g, "").toLowerCase()] = e;
    }
    exports.NICKNAMES = Object.fromEntries(Object.entries(exports.NICKNAMES).sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2)));
    exports.NICKNAMES = Object.fromEntries(Object.entries(exports.NICKNAMES).sort(([k1, v1], [k2, v2]) => exports.NICKNAMES[k1].localeCompare(exports.NICKNAMES[k2])));
    // console.log(NICKNAMES);
    export_json(exports.NICKNAMES, filename);
}
//# sourceMappingURL=db.js.map