import pluginSecurity from "eslint-plugin-security";
import pluginNoUnsanitized from "eslint-plugin-no-unsanitized";
import baseConfig from "./eslint.config.js";

export default [
  ...baseConfig,
  {
    ...pluginSecurity.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
  },
  {
    ...pluginNoUnsanitized.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
  },
];
