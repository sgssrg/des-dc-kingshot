import type { Config } from "robo.js";

export default <Config>{
  clientOptions: {
    intents: [
      'Guilds',
      'GuildMessages',
      'MessageContent',
    ],
  },
  copyIgnore: [".git"],
  plugins: [],
  type: "robo",
};
