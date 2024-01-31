import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger"
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { IQuest } from "@spt-aki/models/eft/common/tables/IQuest";
import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";

import { HANDBOOK, NICKNAMES, BOOKMARKS, export_json } from "./db";

const modName = `SoftCoreLite`;
const MODITEMS: ITemplateItem = require("../../db/items.json");
const MODCLONE: CloneRelation = {};

for (const key in MODITEMS) {
    try {
        MODCLONE[MODITEMS[key].CloneOf].push(key)
    } catch {
        MODCLONE[MODITEMS[key].CloneOf] = [];
        MODCLONE[MODITEMS[key].CloneOf].push(key)
    }
}
export_json(MODCLONE, "items_ids_mod");

type CloneRelation = {
    [key: string] : string[]
}

type Procurement = {
    Trader?: string;
    Loyalty?: number;
    Currency?: string;
    Price?: number;
    Stock?: number;
}

type Locales = {
    Name?: string;
    ShortName?: string;
    Description?: string;
}

type ModItem = {
    CloneOf: string;
    Type: string;
    Procurement?: Procurement;
    Locales?: Locales;
    [key: string]: any;
};

type PROPERTIES = {
    Accuracy: number; //Barrels
    AimSensitivity: Array<number[]>; //Sights
    AnimationVariantsNumber: number;
    BackgroundColor: string;
    BeltMagazineRefreshCount: number; //Mags
    BlocksCollapsible: boolean;
    BlocksFolding: boolean; //Barrels
    CalibrationDistances: Array<number[]>; //Sights
    CanAdmin: boolean; //Mags
    CanFast: boolean; //Mags
    Canhit: boolean; //Mags
    CenterOfImpact: number; //Barrel
    CheckOverride: number; //Mags
    CheckTimeModifier: number; //Mags
    ConflictingItems: string[];
    CoolFactor: number; //Barrels
    CustomAimPlane: string;
    DeviationCurve: number;
    DeviationMax: number;
    DoubleActionAccuracyPenaltyMult: number;
    DurabilityBurnModificator: number;
    EffectiveDistance: number;
    Ergonomics: number;
    ExtraSizeDown: number;
    ExtraSizeForceAdd: number;
    ExtraSizeLeft: number;
    ExtraSizeRight: number;
    ExtraSizeUp: number;
    Foldable: boolean; //Stocks
    HeatFactor: number; //Barrels
    Height: number;
    IsMagazineForStationaryWeapon: boolean; //Mags
    IsSilencer: boolean; //Barrels
    LoadUnloadModifier: number; //Mags
    Loudness: number;
    magAnimationIndex: number; //Mags
    MalfunctionChance: number;
    ModesCount: Array<number[]>; //Sights
    Recoil: number;
    RelaodMagType: string;
    Retractable: boolean; //Stocks
    ScopesCount: number; //Sights
    ShotgunDispersion: number;
    SightingRange: number;
    sightModType: string; //Sights
    SizeReduceRight:number; //Stocks
    Velocity: number;//Barrels
    VisibleAmmoRangesString: string; //Mags
    Weight: number;
    Width: number;
    Zooms: Array<number[]>; //Sights
}


import * as DB from "./db"
const SPTRM = DB.SPTRM

export class Items {
    constructor(private logger: ILogger, private tables: IDatabaseTables, private modConfig, private jsonUtil: JsonUtil) {}

    itemDB(): Record<string, ITemplateItem> {
        return this.tables.templates.items;
    }
    questDB(): Record<string, IQuest>{
        return this.tables.templates.quests;
    }


    public balanceMagLoadSpeed() {
    }

    public createCustomItems() {
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

    private setItemFilters(item:ITemplateItem) {
        // Push all item ID from MODITEMS which are cloned from the same source into the filter of where the source ID are present
        for (const slot in item._props.Slots) {
            const SLOT = item._props.Slots[slot];
            // DEBUG
            // if (SLOT._props?.filters !== undefined && Object.keys(MODCLONE).some(key => SLOT._props.filters[0].Filter.includes(key))) {
            //     export_json(item, `items/${item._name}${item._id.slice(-4)}`)
            // }
            if (SLOT._props?.filters !== undefined) {
                SLOT._props.filters[0].Filter.push(...Object.entries(MODCLONE).filter(([key,]) => SLOT._props.filters[0].Filter.includes(key)).flatMap(([,value]) => value));
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

    private updateItemProperties(ID: string) {
        const subject = this.itemDB()[ID]
        // this.logger.info(subject)
        this.setProperties(subject, MODITEMS[ID]._Properties);
        this.setRealism(subject, MODITEMS[ID]._Properties);
    }

    public setRealism(subject: ITemplateItem, moddb:Record<string, any>) {
        subject._props.ConflictingItems.push(...["SPTRM", ...Object.entries(SPTRM).map(([k,]) => moddb[k] ?? SPTRM[k])]);
    }

    private setProperties(subject: ITemplateItem, moddb:Record<string, any>) {
        for (const key in moddb) {
            switch (key) {
                case "MagSize":
                    subject._props.Cartridges[0]._max_count = moddb[key];
                    break;
                default:
                    if (key in subject._props) {
                        subject._props[key] = moddb[key]
                    } else {
                        this.logger.info(`[${modName}] item ${subject._id}'s property - ${key} is not handled.`)
                    }
                    break;
            }
        }
    }

    private addToMastering(id: string, masteringCat: string) {
        // Plan to make this feature capable of generating the full-weapon preset picture
        // Currently this function only makes the Skill Mastering UI to show the core component of a newly added weapon
        let mastering = this.tables.globals.config.Mastering;
        for (let cat in mastering) {
            if (mastering[cat].Name === masteringCat) {
                mastering[cat].Templates.push(id);
            }
        }
    }

    private addCustomWeapsToQuests(targetWeap: string, weapToAdd: string) {
        for (let quest in this.questDB) {
            let conditions = this.questDB[quest].conditions.AvailableForFinish[0];
            if (conditions._parent === "CounterCreator") {
                let killConditions = conditions._props.counter.conditions[0]
                if (killConditions._parent === "Kills" && killConditions._props?.weapon !== undefined) {
                    if (killConditions._props.weapon.includes(targetWeap)) {
                        killConditions._props.weapon.push(weapToAdd);
                    }
                }
            }
        }
    }

    private addItem(CloneOf: string, NewID: string, Rarity: string) {
        this.cloneItem(CloneOf, NewID);
        let NewItem = this.itemDB()[NewID];
        NewItem._props.BackgroundColor = Rarity;
        if (this.modConfig.debug == true) {
            this.logger.info("Item " + NewItem._id + " Added");
        }
    }

    private cloneItem(CloneOf: string, NewID: string) {
        this.itemDB()[NewID] = this.jsonUtil.clone(this.itemDB()[CloneOf])
        this.itemDB()[NewID]._id = NewID;
        this.itemDB()[NewID]._name = NewID;
        if (this.modConfig.debug == true) {
            this.logger.info(this.itemDB()[CloneOf]._name + " cloned");
        }
    }

    private addToHandbook(id: string, record: ModItem) {
        this.tables.templates.handbook.Items.push(
            {
                "Id": id,
                "ParentId": HANDBOOK[BOOKMARKS[record.Type]],
                "Price": record._Procurement?.Price
            }
        );
    }

    public addToLocale(id: string, item: ModItem) {
        const locales = this.tables.locales.global;

        for (let lang in locales) {
            locales[lang][`${id} Name`] = item._Locales?.Name;
            locales[lang][`${id} ShortName`] = item._Locales?.ShortName;
            locales[lang][`${id} Description`] = item._Locales?.Description;
        }
    }
}