'use strict';
// Advance to the next campaign level.
class GameStory {
  advanceLevel() { this.levelIndex++; this.enterLevel(); }
}
mixin(Game, GameStory);
