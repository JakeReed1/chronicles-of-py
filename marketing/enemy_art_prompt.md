# Image-gen prompts: SNES-style pixel art for the Conditional Caverns enemies

Same approach that worked for the dragon boss (marketing/dragon_art_prompt.md):
genuine pixel art from a dedicated/strong tool, not a painterly illustration.
These three replace the flat-cartoon Kenney "Monster Builder" enemies
currently used for If Golem, Elif Checker, and Else Wraith, so the whole
Conditional Caverns zone matches the new dragon boss.

## Where to generate
Whatever gave you the dragon result is the safest bet for a matching look -
Midjourney worked well last time. Retro Diffusion (retrodiffusion.ai) and
PixelLab (pixellab.ai) are the dedicated pixel-art alternatives if you want
to compare.

## Shared style block (use for all three, only "Subject:" changes)

"16-bit pixel art sprite of a fantasy cave monster, SNES JRPG style,
front-facing 3/4 pose, centered composition, hard pixel edges, no
anti-aliasing, no blur, limited 32-color palette, flat color blocks with
simple hard-edged shading (2-3 shades per color, no gradients), crisp pixel
grid, retro game sprite sheet look, plain flat solid-color background for
easy cutout, no scenery, square canvas."

## Subject lines

**If Golem** (easy enemy):
"a squat, sturdy rock golem made of stacked gray-brown boulders, glowing
faint amber cracks running through its body, small deep-set angry eyes,
stubby thick arms and legs, a wide grumpy stone mouth. Reads as slow and
tough."

**Elif Checker** (easy enemy):
"a small, quick lizard-like creature with sleek pale-green scales, large
alert yellow eyes, a thin whip-like tail, perched in a crouched, ready-to-dart
pose. Reads as nimble and watchful, like it's always checking something
before it decides to strike."

**Else Wraith** (easy enemy):
"a pale, translucent ghost with a wispy trailing lower body and no visible
legs, faint blue-white glow, drooping sad dark-ringed eyes, thin wisps of
mist drifting off it. Reads as a melancholy fallback creature - the one that
shows up when nothing else applies."

## Keep the boss distinct
The dragon boss is vivid orange/warm - keep these three in cooler/earthier
tones (grays, greens, pale blues) so the boss still visually stands out as
the biggest threat in the zone.

## After generating
Send the PNGs back (or drop them in this marketing/ folder and tell me the
filenames) and I'll clean up the backgrounds, scale them consistently, and
wire them into PreloadScene.js and ConditionalCavernsScene.js in place of
the current Kenney sprites - same process as the dragon.
