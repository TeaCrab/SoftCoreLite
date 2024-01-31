"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SoftCoreLite {
    constructor() {
        this.MileStone = {
            //Change the numbers here to change the increase in health per level.
            Chest: 5,
            Head: 7,
            LeftArm: 3,
            LeftLeg: 5,
            RightArm: 3,
            RightLeg: 5,
            Stomach: 7,
        };
        this.Increments = {
            //Change the numbers here to change the increase in health per level.
            Chest: 3,
            Head: 5,
            LeftArm: 2,
            LeftLeg: 3,
            RightArm: 2,
            RightLeg: 3,
            Stomach: 5,
        };
        this.BaseHealth = {
            //Change the numbers here to set the base health per body part.
            Chest: 90,
            Head: 30,
            LeftArm: 60,
            LeftLeg: 75,
            RightArm: 60,
            RightLeg: 75,
            Stomach: 90,
        };
    }
    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const databaseServer = container.resolve("DatabaseServer")
        const tables = databaseServer.getTables();
		const locales = tables.locales.global;
        const items = tables.templates.items;
        // Stash Size Re-Balance
        try {
            items["566abbc34bdc2d92178b4576"]._props.Grids[0]._props.cellsV = 64;
            items["5811ce572459770cba1a34ea"]._props.Grids[0]._props.cellsV = 96;
            items["5811ce662459770f6f490f32"]._props.Grids[0]._props.cellsV = 128;
            items["5811ce772459770e9e5f9532"]._props.Grids[0]._props.cellsV = 160;
        }
        catch (error) {
            logger.warning(`\nHideoutOptions.StashOptions.BiggerStash failed because of another mod. Send bug report. Continue safely.`);
            log(error);
        }
        // Examine All Items Again
        try {
            for (const itemID in items) {
                const item = items[itemID];
                if (item?._props?.ExaminedByDefault == true) {
                    item._props.ExaminedByDefault = false;
                }
            }
        }
        catch (error) {
            logger.warning(`\nOtherTweaks.Unexamined_Items_Are_Back_and_Faster_Examine_Time failed because of the other mod. Send bug report. Continue safely.`);
            log(error);
        }
        // Body Part Health Level Up
        this.GlobalBodyParts = databaseServer.config.Health.ProfileHealthSettings.BodyPartsSettings;
    }

    preAkiLoad(container) {
        const staticRMS = container.resolve("StaticRouterModService");
        const pHelp = container.resolve("ProfileHelper");
        this.logger = container.resolve("WinstonLogger");
        staticRMS.registerStaticRouter("Mod", [
            {
                url: "/client/game/start",
                action: (url, info, sessionID, output) => {
                    try {
                        this.PMCBodyParts =
                            pHelp.getPmcProfile(sessionID).Health.BodyParts;
                        this.PMCLevel = pHelp.getPmcProfile(sessionID).Info.Level;
                        this.SCAVBodyParts =
                            pHelp.getScavProfile(sessionID).Health.BodyParts;
                        this.SCAVLevel = pHelp.getScavProfile(sessionID).Info.Level;
                        this.calcPMCHealth(this.PMCBodyParts, this.PMCLevel, this.BaseHealth);
                        this.calcSCAVHealth(this.SCAVBodyParts, this.SCAVLevel, this.BaseHealth);
                    }
                    catch (error) {
                        this.logger.error(error.message);
                    }
                    return output;
                },
            },
            {
                url: "/client/items",
                action: (url, info, sessionID, output) => {
                    try {
                        this.PMCBodyParts =
                            pHelp.getPmcProfile(sessionID).Health.BodyParts;
                        this.PMCLevel = pHelp.getPmcProfile(sessionID).Info.Level;
                        this.SCAVBodyParts =
                            pHelp.getScavProfile(sessionID).Health.BodyParts;
                        this.SCAVLevel = pHelp.getScavProfile(sessionID).Info.Level;
                        this.calcPMCHealth(this.PMCBodyParts, this.PMCLevel, this.BaseHealth);
                        this.calcSCAVHealth(this.SCAVBodyParts, this.SCAVLevel, this.BaseHealth);
                    }
                    catch (error) {
                        this.logger.error(error.message);
                    }
                    return output;
                },
            },
        ], "aki");
    }
    calcPMCHealth(bodyPart, accountLevel, preset) {
        for (let key in this.Increments) {
            bodyPart[key].Health.Maximum =
                preset[key] + ~~(accountLevel / this.MileStone[key]) * this.Increments[key];
        }
    }
    calcSCAVHealth(bodyPart, accountLevel, preset) {
        for (let key in this.Increments) {
            bodyPart[key].Health.Maximum =
                preset[key] + ~~(accountLevel / this.MileStone[key]) * this.Increments[key];
        }
        for (let key in this.Increments) {
            bodyPart[key].Health.Current =
                preset[key] + ~~(accountLevel / this.MileStone[key]) * this.Increments[key];
        }
    }
}
const log = (i) => {
    console.log(i);
};
module.exports = { mod: new Mod() };
//# sourceMappingURL=mod.js.map