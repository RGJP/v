The game bundles these fonts so canvas text works offline and looks consistent:

- Nunito Sans: [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/nunitosans), used for game text at weight 800. License: NunitoSans-OFL.txt.
- Fredoka: [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/fredoka), used for the title at weight 700. License: Fredoka-OFL.txt.

The game itself loads trimmed copies embedded in `src/fonts.js` (each face fixed at its one weight, Latin
characters only, woff2), because a page opened straight from disk (file://) is not allowed to fetch font files.
The .ttf files here are the unmodified originals they were made from.
