# Image-gen prompts: dedicated battle-scene backgrounds

Different asset category from the overworld level backgrounds
(background_art_prompt.md) - those are top-down ground textures for walking
around. These are classic JRPG battle-screen backdrops: an illustrated
environmental scene behind the combatants, similar in spirit to how Final
Fantasy/Dragon Quest show a distinct painted backdrop during battle instead
of just the overworld map tile. NOT a top-down view, NOT the same ground
texture stretched - a proper scene with depth (horizon, sky, background
elements receding into the distance).

Want a few variants per zone (2-3) so the game can pick one at random each
time a battle starts, instead of always showing the identical backdrop.

## Size
Same as the level backgrounds - 2560x1440 or any 16:9 ratio if your tool
supports custom sizes. Square is fine too, I'll scale/crop to fit.

## Shared style block (use for all variants, only "Subject:" changes)

"16-bit pixel art JRPG battle background, SNES-era turn-based RPG battle
screen backdrop, hard pixel edges, no anti-aliasing, no blur, limited color
palette, flat color blocks with simple hard-edged shading (2-3 shades per
color, no gradients), scene viewed from a slightly elevated angle with a
clear horizon line and sense of depth - NOT top-down, NOT a texture, NOT a
tile. No characters or creatures in the scene - they get placed on top of
this backdrop separately."

## Subject lines (generate 2-3 per zone for variety)

**Print Forest / Loop Forest battle background:**
"a sunlit forest clearing battle scene, tall trees framing both sides of
the view, dappled light through leaves, soft rolling grass in the
foreground, a hint of distant forest and sky at the horizon. Warm, inviting
color palette."

Variant ideas to mix in across the 2-3: a forest edge near a rocky outcrop,
a clearing with a fallen log, a spot near tall wildflowers.

**Conditional Caverns battle background:**
"a dim cave interior battle scene, rough rock walls and stalactites framing
both sides of the view, a cracked stone floor in the foreground, faint
glowing mineral veins in the rock, deep shadowed darkness receding into the
background. Moody, cool-toned color palette."

Variant ideas to mix in: a cavern with a small underground pool, one with a
cluster of glowing crystals, one with a collapsed rock formation.

## After generating
Send the images back (or drop them in aiart/ and tell me the filenames,
one per file so I know which zone/variant is which). I'll wire up
BattleScene.js to randomly pick one of the matching zone's variants each
time a battle starts, replacing the current stand-in (which just stretches
the overworld ground texture - exactly the "zoomed in" look you didn't
want).
