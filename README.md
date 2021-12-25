# godsarmy-export-plugin
GodsArmy Website plugin for Summoners War Exporter (SWEX)

# How to "install"
1. Download the latest version release (asar file) - https://github.com/ga-rude/godsarmy-export-plugin/releases/latest
2. Put the plugin asar file in {SWEX Files Path}/plugins
3. Restart SWEX and activate GodsArmy-Export Plugin in SWEX's Settings

# Updating profiles
Profiles will be added to the import queue on the webserver, so it might take ~15 minutes for them to appear on the website. Also, scanned monsters will be locked for 24 hours after each scan to prevent spamming and help reduce server load - but maybe I'll remove this limiter if performance stays in green area.

![image](https://user-images.githubusercontent.com/44115138/147391900-6528b327-fc88-4bdc-aaf9-10df99109801.png)

# Restriction
Only monsters level 40 are updated in the profile. Monsters below max-level will not be listed to reduce database-size.

# Score
Score indicates a value similar to the "rune efficiency" a lot of you guys will already know when you used SW Optimizer with the JSON generated from SWEX. The difference is, that it is based on the monsters main stats and evaluates these stats that can theoretically be achieved in runes slot 1-6.

# To-Do List
## Open Slot
Well. Not much to say. Either a rune or an artefact is missing. :)

## Not maxxed
And this one is also pretty straightforward. Everything thats not +15 will be marked as todo here.

## Easy Grind / Easy Re-Gem
Easy grind indicates that a rune with hp%, atk% or def% that is either ungrinded or has less then a 4% roll, so improvement is guaranteed when a hero grind is used. Same for gems.

## Hard Grind / Hard Re-Gem
Hard grind indicates runes that have grindable substats that didnt reach the hero grind maxroll value yet, so i.e. 7% for hp%, atk% or def%.

## Gem Target
Shows you that there might be a rune on this monster that is still ungemmed and has low rolls or flat substats.

## Low Efficiency
Shows that a rune has significantly less efficiency then the other runes on this monster. Monster might achieve a decent strenght boost if rune is replaced.
