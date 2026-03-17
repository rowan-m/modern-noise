import sonarjs from "eslint-plugin-sonarjs";
import baseConfig from "./eslint.config.js";

export default [
  ...baseConfig,
  {
    ...sonarjs.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      ...sonarjs.configs.recommended.rules,
      "sonarjs/pseudo-random": "off",
    },
  },
];
