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
  {
    files: ["public/js/dsp.js"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },
  {
    files: ["tests/**/*.js"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
    },
  },
];
