# Image-gen prompt: SNES-style pixel art dragon boss

Earlier version of this file targeted hero.png's painterly style. This
version instead asks for genuine pixel art, since the painterly result
didn't give a real pixel grid (general image models render "pixel-art
flavored" paintings, not true low-res sprites, even when asked).

## Where to generate it
- Retro Diffusion (retrodiffusion.ai) - purpose-built for authentic pixel
  art, most likely to give a real pixel grid. Try this first.
- PixelLab (pixellab.ai) - also purpose-built, has character/sprite modes.
- Midjourney / DALL-E / Leonardo.Ai will work too but tend to soften the
  pixel grid even when asked - use the strongest pixel-art keywords below
  and expect to need a regenerate or two.

## Prompt to run

"16-bit pixel art sprite of a fantasy dragon boss character, SNES JRPG
style, front-facing 3/4 pose, centered composition, hard pixel edges, no
anti-aliasing, no blur, limited 32-color palette, flat color blocks with
simple hard-edged shading (2-3 shades per color, no gradients), crisp
pixel grid, retro game sprite sheet look, plain flat solid-color background
for easy cutout, no scenery, square canvas.

Subject: a bold, vividly orange fire dragon with a cream-colored underbelly,
small expressive eyes, short curved horns, compact bat-like wings, and a
bright flame burning at the tip of its tail. Confident, slightly mischievous
expression rather than pure menace - reads as a powerful but charismatic
mascot-style dragon, iconic and easy to recognize at a glance."

## If the result still looks too smooth/painterly
Add: "low resolution native pixel art, not upscaled, visible square pixels,
NES/SNES sprite, pixel art style only - not digital painting, not concept
art, not illustration" - naming what to avoid helps as much as naming what
to include.

## After generating
Send the PNG back (or drop it in this marketing/ folder and tell me the
filename) and I'll clean up the background, scale it to match the other
key-art assets, and drop it into marketing/key_art.png in place of the
current dragon.
