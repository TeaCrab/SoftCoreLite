import { DependencyContainer } from "tsyringe"

import { DatabaseServer } from "@spt-aki/servers/DatabaseServer"
import { ILogger } from "@spt-aki/models/spt/utils/ILogger"
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { IPostAkiLoadModAsync } from "@spt-aki/models/external/IPostAkiLoadModAsync";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor"

import { Items } from "./_func/items";
import { DB_UTIL} from './_func/db';
// Importing other helper functions from db.ts
import { MAG_LOADUNLOAD_BALANCER } from "./_func/db";

const modName = `SoftCoreLite`
const modConfig = require("../config/config.json");

export class SoftCoreLite implements IPreAkiLoadMod, IPostDBLoadMod, IPostAkiLoadMod, IPostAkiLoadModAsync {
    private pkg;
    private MileStone = {
        //The number of player levels before each Health Point Level Up.
        Chest: 5,
        Head: 7,
        LeftArm: 3,
        LeftLeg: 5,
        RightArm: 3,
        RightLeg: 5,
        Stomach: 7,
    };
    private Increments = {
        //The HP amount per Health Point Level Up.
        Chest: 3,
        Head: 5,
        LeftArm: 2,
        LeftLeg: 3,
        RightArm: 2,
        RightLeg: 3,
        Stomach: 5,
    };
    private BaseHealth = {
        //Change the numbers here to set the base health per body part.
        Chest: 90,
        Head: 30,
        LeftArm: 60,
        LeftLeg: 75,
        RightArm: 60,
        RightLeg: 75,
        Stomach: 90,
    };
    private PMC_HP;
    private PMC_LV : number;
    private SCAV_HP;
    // private SCAV_LV : number;

    private calcPMCHealth(bodyPart, accountLevel, preset) {
        for (let key in this.BaseHealth) {
            var premax = bodyPart[key].Health.Maximum
            var precur = bodyPart[key].Health.Current
            bodyPart[key].Health.Maximum = preset[key] + ~~(accountLevel / this.MileStone[key]) * this.Increments[key];
            bodyPart[key].Health.Current = (precur / premax) * bodyPart[key].Health.Maximum
        }
    }

    private calcSCAVHealth(bodyPart, accountLevel, preset) {
        for (let key in this.BaseHealth) {
            bodyPart[key].Health.Maximum = preset[key] + ~~(accountLevel / this.MileStone[key]) * this.Increments[key];
            bodyPart[key].Health.Current = bodyPart[key].Health.Maximum
        }
    }

    public preAkiLoad(container: DependencyContainer): void {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const staticRMS = container.resolve("StaticRouterModService");
        const profileHelper = container.resolve("ProfileHelper");
        // Health per level changes.
        if (modConfig.health_per_level === true) {
            staticRMS.registerStaticRouter(
                "CheckProfile",
                [
                    {
                        url: "/client/game/version/validate",
                        action: (url, info, sessionID, output) => {
                            try {
                                this.PMC_HP = profileHelper.getPmcProfile(sessionID).Health.BodyParts;
                                this.PMC_LV = profileHelper.getPmcProfile(sessionID).Info.Level;
                                this.calcPMCHealth(this.PMC_HP, this.PMC_LV, this.BaseHealth);
                                this.SCAV_HP = profileHelper.getScavProfile(sessionID).Health.BodyParts;
                                // this.SCAV_LV = profileHelper.getScavProfile(sessionID).Info.Level;
                                // this.calcSCAVHealth(this.SCAV_HP, this.SCAV_LV, this.BaseHealth);
                                this.calcSCAVHealth(this.SCAV_HP, this.PMC_LV, this.BaseHealth); // Player Scav gets bonus from PMC level.
                                logger.logWithColor(`[${modName}] : Player health change applied.`, LogTextColor.GREEN)
                            }
                            catch (error) {
                                logger.logWithColor(`[${modName}] : Player health change failed.`, LogTextColor.RED)
                            }
                            return output;
                        },
                    },
                    {
                        url: "/client/items",
                        action: (url, info, sessionID, output) => {
                            try {
                                this.PMC_HP = profileHelper.getPmcProfile(sessionID).Health.BodyParts;
                                this.PMC_LV = profileHelper.getPmcProfile(sessionID).Info.Level;
                                this.calcPMCHealth(this.PMC_HP, this.PMC_LV, this.BaseHealth);
                                this.SCAV_HP = profileHelper.getScavProfile(sessionID).Health.BodyParts;
                                // this.SCAV_LV = profileHelper.getScavProfile(sessionID).Info.Level;
                                // this.calcSCAVHealth(this.SCAV_HP, this.SCAV_LV, this.BaseHealth);
                                this.calcSCAVHealth(this.SCAV_HP, this.PMC_LV, this.BaseHealth); // Player Scav gets bonus from PMC level.
                                logger.logWithColor(`[${modName}] : Player health change applied.`, LogTextColor.GREEN)
                            }
                            catch (error) {
                                logger.logWithColor(`[${modName}] : Player health change failed.`, LogTextColor.RED)
                            }
                            return output;
                        },
                    },
                ],
                "aki"
            );
        } else {
            logger.logWithColor(`[${modName}] : Player health change failed.`, LogTextColor.WHITE);
        }
    }

    public postDBLoad(container: DependencyContainer): void {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const db = container.resolve<DatabaseServer>("DatabaseServer");
        const tables = db.getTables()
        const pockets = tables.templates.items["627a4e6b255f7527fb05a0f6"];
        const items = tables.templates.items
        const jsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const modItems = new Items(logger, tables, modConfig, jsonUtil);
        const dbutil = new DB_UTIL(logger, tables, modConfig, jsonUtil);

        this.pkg = require("../package.json");

        // Add custom items
        if (modConfig.custom_items === true) {
            // try {
                modItems.createCustomItems();
                logger.logWithColor(`[${modName}] : Custom items loaded.`, LogTextColor.GREEN);
            // } catch (error) {
            //     logger.logWithColor(`[${modName}] : Custom items failed to load.`, LogTextColor.RED);
            //     logger.log(error)
            // }
        } else {
            logger.logWithColor(`[${modName}] : Custom items disabled. (Be sure to remove the custom items from your profile.json)`, LogTextColor.WHITE);
        }

        // Globally reduce negative Load/Unload modifier of all magazines (to a maximum about 20%), doesn't touch positive modifiers
        if (modConfig.mag_loadunload_balancer) {
            dbutil.set_prop(["5448bc234bdc2d3c308b4569", "610720f290b75a49ff2e5e25"], ["LoadUnloadModifier"], [MAG_LOADUNLOAD_BALANCER]);
        }
        // Debug utility to verify above changes are actually effective
        if ( modConfig.debug_db ) {
            // Dumping magazine related stats (Including Realism Stats)
            dbutil.dump_prop(["5448bc234bdc2d3c308b4569", "610720f290b75a49ff2e5e25"], ["LoadUnloadModifier", "CheckTimeModifier", "MagSize", "ReloadSpeed"]);
            // dbutil.dump_itemDB(1);
            // dbutil.dump_individual_itemDB();
            // dbutil.dump_mastering_category();
        }

        // Stash Size Re-Balance
        if (modConfig.stash_size_rebalance === true) {
            try {
                items["566abbc34bdc2d92178b4576"]._props.Grids[0]._props.cellsV = 64;
                items["5811ce572459770cba1a34ea"]._props.Grids[0]._props.cellsV = 96;
                items["5811ce662459770f6f490f32"]._props.Grids[0]._props.cellsV = 128;
                items["5811ce772459770e9e5f9532"]._props.Grids[0]._props.cellsV = 160;
                logger.logWithColor(`[${modName}] : Custom stash size applied.`, LogTextColor.GREEN);
            } catch (error) {
                logger.logWithColor(`[${modName}] : Custom stash size change failed.`, LogTextColor.RED);
            }
        } else {
            logger.logWithColor(`[${modName}] : Custom stash size disabled. (Beware of stash item overflow)`, LogTextColor.WHITE);
        }

        // Discover all items again
        if (modConfig.item_rediscover === true) {
            try {
                for (const itemID in items) {
                    const item = items[itemID]
                    if (item?._props?.ExaminedByDefault == true) {
                        item._props.ExaminedByDefault = false
                    }
                }
                logger.logWithColor(`[${modName}] : All items undiscovered by default.`, LogTextColor.GREEN)
            } catch (error) {
                logger.logWithColor(`[${modName}] : Items discovery changes failed.`, LogTextColor.RED)
            }
        } else {
            logger.logWithColor(`[${modName}] : Item rediscover disabled.`, LogTextColor.WHITE);
        }

        // Bot Sound Debug & Changes
        const DB = container.resolve<DatabaseServer>("DatabaseServer").getTables();
        const botTypes = DB.bots.types;
        if (modConfig.debug) {
            for (const type in botTypes) {
                var msgFS = ``
                var msgRL = ``
                var msgTR = ``
                const title = `${type}:\n`
                try {
                    const TR_max = botTypes[type].health.Temperature.max
                    const TR_min = botTypes[type].health.Temperature.min
                    msgTR = `\tTemperature:\t${TR_min}, ${TR_max}\n`
                } catch (error) {
                }
                try {
                    const FS_max = botTypes[type].skills.Common.BotSound.max
                    const FS_min = botTypes[type].skills.Common.BotSound.min
                    msgFS = `\tBotSound:   \t${FS_min}, ${FS_max}\n`
                } catch (error) {
                }
                try {
                    const RL_max = botTypes[type].skills.Common.BotReload.max
                    const RL_min = botTypes[type].skills.Common.BotReload.min
                    msgRL = `\tBotReload:  \t${RL_min}, ${RL_max}\n`
                } catch (error) {
                }
                logger.logWithColor(`${title}${msgFS}${msgRL}${msgTR}`, LogTextColor.CYAN)
            }
        }

        // Bots are no longer perfectly silent or invisible to IR
        if (modConfig.bot_sound_rebalance === true) {
            try {
                for (const type in botTypes) {
                    var FS = false
                    var RL = false
                    var TR = false
                    try {
                        const FS_max = botTypes[type].skills.Common.BotSound.max
                        const FS_min = botTypes[type].skills.Common.BotSound.min
                        if (FS_max > 4999 || FS_min > 4999) {
                            FS = true
                        }
                    } catch (error) {
                        FS = false
                    }
                    try {
                        const RL_max = botTypes[type].skills.Common.BotReload.max
                        const RL_min = botTypes[type].skills.Common.BotReload.min
                        if (RL_max > 4999 || RL_min > 4999) {
                            RL = true
                        }
                    } catch (error) {
                        RL = false
                    }
                    try {
                        const TR_max = botTypes[type].health.Temperature.max
                        const TR_min = botTypes[type].health.Temperature.min
                        if (TR_max < 30 || TR_min < 30) {
                            TR = true
                        }
                    } catch (error) {
                        TR = false
                    }
                    if (TR) {
                        botTypes[type].health.Temperature.min = 30
                        botTypes[type].health.Temperature.max = 38
                    }
                    if (FS) {
                        botTypes[type].skills.Common.BotSound.min = 2500
                        botTypes[type].skills.Common.BotSound.max = 3500
                    }
                    if (RL) {
                        botTypes[type].skills.Common.BotReload.min = 2500
                        botTypes[type].skills.Common.BotReload.max = 3500
                    }
                }
                logger.logWithColor(`[${modName}] : Bots(Cultists) are no longer perfectly cold(Experimental) or silent.`, LogTextColor.GREEN)
            } catch (error) {
                logger.logWithColor(`[${modName}] : Bots(Cultists) changes Failed`, LogTextColor.RED)
            }
        } else {
            logger.logWithColor(`[${modName}] : Bots(Cultists) sound rebalance disabled.`, LogTextColor.WHITE);
        }

        // Special Slot Allowed Items
        if (modConfig.special_slot_filter === true) {
            const allowed_items = [
                //Vanilla Items:
                "5c99f98d86f7745c314214b3", // KeyMechanical
                "5c164d2286f774194c5e69fa", // KeyCard
                "59f32bb586f774757e1e8442", // Dogtag BEAR
                "59f32c3b86f77472a31742f0", // Dogtag USEC
                // "5485a8684bdc2da71d8b4567", // Ammo - somehow only allows 1 piece of the stackable item
                // "5661632d4bdc2d903d8b456b", // Stackable Item - somehow only allows 1 piece of the stackable item
                // All vanilla single slot health items:
                "590c678286f77426c9660122", // IFAK
                "60098ad7c2240c0fe85c570a", // AFAK
                "5755356824597772cb798962", // AI-2
                "544fb3364bdc2d34748b456a", // Immobilizing Splint
                "5af0454c86f7746bf20992e8", // Aluminium Splint
                "544fb25a4bdc2dfb738b4567", // Aseptic Bandage
                "5751a25924597722c463c472", // Army Bandage
                "60098af40accd37ef2175f27", // CAT Hemostatic Tourniquet
                "5e8488fa988a8701445df1e4", // CALOK-B hemostatic applicator
                "5e831507ea0a7c419c2f9bd9", // Esmarch tourniquet
                // Possible modded single slot health items:
                "5448f3a14bdc2d27728b4569", // Drugs (Pills) - Could include Modded Items.
                "5448f3a64bdc2d60728b456a", // Stimulator (Injectors) - Could include Modded Items.
                // Container items displays the inner slots right beside the special slot, looks buggy
                // "619cbf7d23893217ec30b689", // Injector Case
                // "59fafd4b86f7745ca07e1232", // Key Tool
                // "5c093e3486f77430cb02e593", // Dogtag Case
                // "619cbf9e0a7c3a1a2731940a", // Keycard Holder Case
                // "62a09d3bcf4a99369e262447", // Gingy Keychain

                //Modded Items:
                // "groovey_keychain",
                // "Golden_Keychain1",
                // "Golden_Keychain2",
                // "Golden_Keychain3",
                // "Golden_Keycard_Case",
            ]
            // Default Special Slot Pockets
            try {
                for (let i = 0; i<3; i++) {
                    for (const e of allowed_items) {
                        if (!pockets._props.Slots[i]._props.filters[0].Filter.includes(e)) {
                            pockets._props.Slots[i]._props.filters[0].Filter.push(e);
                        }
                    }
                }
                logger.logWithColor(`[${modName}] : Special Slot filter set.`, LogTextColor.GREEN)
            } catch {
                logger.logWithColor(`[${modName}] : Special Slot filter change failed.`, LogTextColor.RED)
            }

            // Compatibility for SVM Custom Special Slot Pockets.
            try {
                if ( typeof db.templates.items["CustomPocket"] !== "undefined" ) {
                    for (let i = 0; i<3; i++) {
                        for (const e of allowed_items) {
                            if (typeof db.templates.items["CustomPocket"]._props.Slots[i] !== "undefined" &&
                            !db.templates.items["CustomPocket"]._props.Slots[i]._props.filters[0].Filter.includes(e)) {
                                db.templates.items["CustomPocket"]._props.Slots[i]._props.filters[0].Filter.push(e);
                            }
                        }
                    }
                }
                logger.logWithColor(`[${modName}] : Custom Pocket filter set. (Not Required)`, LogTextColor.GREEN)
            } catch (error) {
                logger.logWithColor(`[${modName}] : Custom Pocket not found. (Not Required)`, LogTextColor.YELLOW)
            }
        } else {
            logger.logWithColor(`[${modName}] : Special slots filter change disabled.`, LogTextColor.WHITE);
        }

        logger.info(`${this.pkg.author}-${this.pkg.name} v${this.pkg.version}: Cached Successfully`);
    }


const log = (i: any) => {
    console.log(i)
}

module.exports = { mod: new SoftCoreLite() }
