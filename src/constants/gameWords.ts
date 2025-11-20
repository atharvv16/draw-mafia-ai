export const GAME_WORDS = [
  "Butterfly",
  "Elephant",
  "Rainbow",
  "Pizza",
  "Guitar",
  "Mountain",
  "Ocean",
  "Sunrise",
  "Castle",
  "Robot",
  "Dragon",
  "Flower",
  "Rocket",
  "Crown",
  "Lightning",
  "Volcano",
  "Dinosaur",
  "Pirate",
  "Wizard",
  "Phoenix",
  "Unicorn",
  "Mermaid",
  "Spaceship",
  "Treasure",
  "Ninja",
  "Lighthouse",
  "Waterfall",
  "Snowflake",
  "Campfire",
  "Telescope"
];

export const getRandomWord = () => {
  return GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)];
};