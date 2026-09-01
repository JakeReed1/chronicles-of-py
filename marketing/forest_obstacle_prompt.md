# Image-gen prompt: single tree sprite (attempt 4 - dedicated pixel art tool)

Three attempts with a general image tool have failed - two came out too
painterly/side-view, the third was a fully-rendered photoreal 3D tree with
a ground shadow, ignoring the pixel-art and top-down instructions entirely.
That's a sign of a tool limitation, not a wording problem, so this attempt
should be run on a tool actually built for pixel art.

## Where to generate
Use Retro Diffusion (retrodiffusion.ai) or PixelLab (pixellab.ai) - not
whatever generated the last three attempts. Both are purpose-built for
real pixel grids, and PixelLab in particular has explicit
top-down/isometric view options in its UI (use those controls directly if
available, rather than relying only on the text prompt to set the angle).

## Prompt to run

"A single JRPG overworld tree sprite, genuine 16-bit pixel art, SNES-era
style. Hard, visible square pixels - NOT a smooth painting, NOT airbrushed,
NOT anti-aliased, NOT a digital illustration. Flat color blocks only, 2-3
distinct shades per color with hard-edged shading (no gradients, no
blending between shades). Low, blocky effective resolution - the kind of
chunky pixel grid you'd see in an actual SNES or Game Boy Advance game,
scaled up without smoothing.

Subject: a single round, puffy, cloud-like blob shape made of clustered
green pixel blocks, mostly circular in outline, filling almost the entire
frame. A tiny brown rectangular nub pokes out from the very bottom edge of
the blob. The overall silhouette is a simple circle/blob sitting on top of
that small brown nub - like looking straight down at a bush from above.
This blob represents the leafy top of a forest tree, seen from directly
overhead, as a game map icon (the style used for tree icons in Stardew
Valley or top-down Zelda games).

The image should be dominated by the round green blob shape - it should
NOT look like an illustration of a whole tree standing in a landscape.
There is no ground, no grass, no horizon, no sky, and no tall trunk in this
image - just the round green blob icon on a flat background.

Composition: exactly one tree, centered, filling most of the frame. Plain
solid flat background in a single bright color that won't appear anywhere
in the tree itself (e.g. bright magenta or cyan) so it's easy to cut out
cleanly. No text, no labels, no watermark, no caption of any kind anywhere
in the image - image only."

## Why the background color matters
Ask explicitly for a bright, unusual flat background color (magenta or
cyan) rather than a neutral tan/beige - a color that's clearly never going
to appear in tree foliage, bark, or shading makes it trivial for me to cut
out cleanly without risking eating into the actual tree detail (a real
problem last time, when the background and the shadow were too close in
color to the leaf highlights).

## After generating
Save it as aiart/tree_new.png and let me know - I'll cut it out, scale it,
and swap it in for the current two-tree setup so every placed tree uses
this one consistent sprite.
