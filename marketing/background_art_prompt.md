# Image-gen prompts: full level background art (replaces tiled textures)

Scrapped the tiled-texture approach - visible tile seams looked bad. New
plan: one large, hand-painted-feeling background image per zone, used as a
single non-repeating image stretched to cover the whole play area, instead
of a small texture repeated many times.

Two images needed, not three - Loop Forest can keep reusing Print Forest's
background with a blue tint applied in code (same trick as before), unless
you'd rather have a fully distinct one for it. Say the word if so.

## Size
Each zone's play area is exactly 2560x1440 pixels (16:9). If your tool
supports a custom size or aspect ratio, request 2560x1440 (or any 16:9
ratio, like 1920x1080) directly - that needs the least stretching to fill
the play area. If it only does square images, that's fine too, just
mention it and I'll scale/crop to fit; a square source will need more
stretching and may look softer once it's stretched to fill a 16:9 area.

## Where to generate
Same as before.

## Shared style block (use for both, only "Subject:" changes)

"16-bit pixel art game level background, 2560x1440 pixels, 16:9 widescreen
aspect ratio, SNES JRPG top-down overworld art, hard pixel edges, no
anti-aliasing, no blur, limited color palette, flat color blocks with
simple hard-edged shading (2-3 shades per color, no gradients), wide
top-down view of a full explorable area, no characters."

## Subject lines

**Print Forest / Loop Forest background:**
"A screenshot from a 16-bit JRPG's overworld map editor, showing one full
irregularly-shaped outdoor level, top-down view, filling the entire frame
edge to edge. This is a full level map, NOT a repeating texture, NOT a
seamless tile, NOT a centered/symmetric composition, NOT a vignette, NOT a
single clearing surrounded evenly by a circular tree border - the layout
should be irregular and asymmetric, like a real hand-designed game level.

Grass ground in at least three tonal shades of green (lighter yellow-green
in sunlit patches, deeper green in shadowed areas) covers most of the
frame, but the map should NOT look uniform - divide it into several
visually distinct sub-areas so a large map doesn't read as one repeated
pattern stretched out. For example: one region with noticeably taller,
denser grass; another region with patchy, worn-down ground closer to bare
dirt; a region scattered with small rock clusters and boulders; a region
with a cluster of flowers and lighter, healthier-looking grass. These
regions should blend into each other naturally rather than having hard
geometric boundaries. Two or three dirt paths in warm tan/brown wind across
the map at different angles, connecting some of these different regions -
not radiating from a center point, but crossing the frame off-center,
entering and exiting at different edges like a path that continues beyond
the frame. Scatter small rocks, pebbles, and flower clusters (white and
pale yellow) throughout for texture and variety, but leave meaningful open
space clean in each region since game characters get placed there
separately. Trees and denser foliage appear only along some edges and in a
few irregular clusters/corners of the map - NOT as an even ring or border
around the whole frame - so large parts of the map edge still show open
ground continuing to the frame boundary. Soft flat daytime lighting, no
strong shadows or gradients, flat pixel-art shading, warm and inviting
rather than dark."

**Conditional Caverns background:**
"a top-down cave level background - cracked gray stone floor with scattered
boulders and small crystal/mineral deposits, rough dark rock walls forming
a natural border around the edges of the cavern so it reads as a
self-contained explorable area."

## Important: leave room for gameplay objects
Enemies, collectible keys, and some obstacles are placed by the game code on
top of this background, not painted into it - it just needs to work as a
sensible floor/wall backdrop underneath. Having some scenery in the painting
(rocks, patches, foliage) is good for atmosphere, just don't make it so busy
that a code-placed enemy sprite would be hard to see against it.

## After generating
Send the image(s) back (or drop them in aiart/ and tell me the filenames).
I'll scale/crop them to fit each zone's 2560x1440 play area, and switch
PrintForestScene, LoopForestScene, and ConditionalCavernsScene from tiled
ground textures to a single background image each. I'll also need to make
the existing invisible boundary walls line up with wherever the art shows
the edge of the playable area, so tell me if the composition leaves that
ambiguous once I see it.
