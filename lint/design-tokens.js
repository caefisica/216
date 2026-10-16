const arbitraryPrefixes =
  "text|bg|border|ring|fill|stroke|decoration|outline|divide|from|via|to|shadow|rounded|font|leading|tracking|duration|ease|size|gap|p[xytrbl]?|m[xytrbl]?|w|h|min-w|min-h|max-w|max-h";

// A grid template names track sizes, which are layout and not a token.
const gridTemplate = /(?<![\w-])(?:[a-z-]+:)*grid-(?:cols|rows)-\[[^\]]*\]/g;

const rules = [
  {
    name: "a colour literal",
    pattern: /#[0-9a-fA-F]{3,8}\b(?!-)|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/,
  },
  { name: "a font family", pattern: /font-family\s*:|\bfont-\[/ },
  { name: "a shadow", pattern: /box-shadow\s*:|\bshadow-\[/ },
  { name: "an arbitrary pixel value", pattern: /-\[[^\]]*\d\s*px\b/ },
  {
    name: "an arbitrary size, type, radius or curve",
    pattern: new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:${arbitraryPrefixes})-\\[(?![^\\]]*var\\(--)`),
  },
];

const styleKeys = { fontFamily: "a font family", boxShadow: "a shadow" };

/** Reports each raw visual value in a string. `globals.css` is the only place that defines one. */
const noRawValues = {
  meta: {
    type: "problem",
    docs: { description: "Colours, fonts, shadows and sizes are tokens in globals.css." },
  },
  create(context) {
    const check = (node, text) => {
      const rest = text.replace(gridTemplate, "");
      for (const { name, pattern } of rules) {
        if (pattern.test(rest)) {
          context.report({ node, message: `${name} belongs in globals.css as a token` });
        }
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      Property(node) {
        const name = node.key.type === "Identifier" ? node.key.name : node.key.value;
        if (name in styleKeys) {
          context.report({ node, message: `${styleKeys[name]} belongs in globals.css as a token` });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "design-tokens" },
  rules: { "no-raw-values": noRawValues },
};

export default plugin;
