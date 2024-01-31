# SoftCoreLite

This is a personal mod project for SPT, configuring/trimming/modifying/adding things from the projects listed at the end of this README.

A project that helps me learn Typescript:

I ask anyone who's an awesome fellow coder to interject before I do something utterly unacceptable.

Like... loop for one unnecessary more time than I had to, or I should just go learn Rust instead of this Overzealous Javascript Guardian of a language.

---

## What this mod does

### The small collection of things I fine-tuned for my own amusement:
Everything can be turned-off using the config.json

*   My own implementation of [Health Per Level]

    HP of body parts does not increase per level, rather:
    *   Body part gets bonus HP per set amount of levels
    *   Each body part gets a set amount of bonus HP to balance it out over the levels

*   Features of [ODT-Softcore]

    *   Reconfigured stash sizes
    *   Re-discover all items (Unexamine all items)

*   Filter the special slots to hold 1-slot med kits and etc. [SpecialSlots]

    Plan to update this to a generative function that scans the entire post-mod-database for 1-slot med items so this can work for meds added by other mods

*   Make Bot(Cultist) no longer silent or cold to thermals(Experimental) [HotCultists]

    They are no longer silent for sure, but whether they are cold to thermal scopes requires testing

### But most importantly:

*   Skeleton code of a more-automated item cloning feature driven by data

    Modified item cloning functionalities of [SPT-Realism] to add 3 Extended Mags for 3 beginner guns as a proof of concept.

    Currently only deals with individual items/weapon mods.

    Since item cloning ultimately is only done once at the server load, performance implication of this is going to be ignored.  I also do not have an excess of knowledge to write performant code.  I only know to perform massive loops or recursions as few times as possible.

*   Skeleton code of post-mod-database item-property rebalancing feature

    Currently, only the Ammo Load/Unload speed of all magazines are being rebalanced.

    The negative effect is "LERPed" to max out at about 20%, and positive effect is unaffected.

*   Database debugging utilities

    These functions in db.ts helps modder make sense of SPT's JSON data structure and provides basics for debugging/automating/simplifying some database related activities such as the two features described above

    I'm personally proud of the names I've given to the grow() function and I will hear no alternatives.

    This is likely to be heavily affected when SPT's database-structure changes

## Credits

This project uses, modifies and takes inspiration from following SPT-Mods/github repositories:
*   HotCultists by Echo55
*   https://github.com/odt1/ODT-Softcore
*   https://github.com/Capataina/HealthPerLevel
*   https://github.com/jbs4bmx/SpecialSlots
*   https://github.com/space-commits/SPT-Realism-Mod-Server

Credits to the authors of these mods/repositories