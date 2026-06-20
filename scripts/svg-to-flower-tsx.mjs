import fs from 'node:fs/promises';
import path from 'node:path';

const SVG_TAG_RE = /<svg\b[^>]*>([\s\S]*?)<\/svg>/i;
const VIEW_BOX_RE = /<svg\b[^>]*viewBox=(["'])([^"']+)\1/i;
const STYLE_TAG_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const EMPTY_DEFS_RE = /<defs\b[^>]*>\s*<\/defs>/gi;
const OPEN_TAG_RE = /<([A-Za-z][\w:.-]*)(\s[^<>]*?)?(\/?)>/g;
const ATTR_RE = /([:@\w.-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'))?/g;
const CSS_RULE_RE = /([^{}]+)\{([^{}]+)\}/g;
const NUMBER_RE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const PATH_TOKEN_RE = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const PATH_PARAM_COUNT = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
};

const ATTRIBUTE_NAME_MAP = {
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'font-weight': 'fontWeight',
  'mask-type': 'maskType',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor',
  'vector-effect': 'vectorEffect',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
};

const REMOVED_ATTRIBUTES = new Set([
  'class',
  'data-name',
  'version',
  'xmlns',
  'xmlns:xlink',
]);

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
};

const printUsageAndExit = () => {
  console.log(`Usage:
  node scripts/svg-to-flower-tsx.mjs --input <svg-path> --name <ComponentName> [--output <tsx-path>]

Examples:
  node scripts/svg-to-flower-tsx.mjs --input "E:\\稿子\\SVG\\bud.svg" --name FlowerBud --output "src/assets/flowers/bud.tsx"
  node scripts/svg-to-flower-tsx.mjs --input "E:\\稿子\\SVG\\stem.svg" --name FlowerStem`);
  process.exit(1);
};

const toCamelCase = (value) => value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

const normalizeAttributeName = (name) => {
  const lowered = name.toLowerCase();
  if (ATTRIBUTE_NAME_MAP[lowered]) {
    return ATTRIBUTE_NAME_MAP[lowered];
  }
  if (lowered === 'classname') {
    return 'className';
  }
  return name.includes('-') ? toCamelCase(lowered) : name;
};

const parseCssDeclarations = (body) => {
  const declarations = {};

  for (const rawDeclaration of body.split(';')) {
    const declaration = rawDeclaration.trim();
    if (!declaration) {
      continue;
    }

    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!property || !value) {
      continue;
    }

    declarations[normalizeAttributeName(property)] = value;
  }

  return declarations;
};

const extractClassStyleMap = (svgSource) => {
  const classStyleMap = {};

  for (const match of svgSource.matchAll(STYLE_TAG_RE)) {
    const cssBody = match[1]?.replace(/\/\*[\s\S]*?\*\//g, '') ?? '';

    for (const rule of cssBody.matchAll(CSS_RULE_RE)) {
      const selectors = rule[1]
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean);
      const declarations = parseCssDeclarations(rule[2] ?? '');

      for (const selector of selectors) {
        if (!selector.startsWith('.')) {
          continue;
        }

        const className = selector.slice(1);
        classStyleMap[className] = {
          ...(classStyleMap[className] ?? {}),
          ...declarations,
        };
      }
    }
  }

  return classStyleMap;
};

const numbersFromText = (text) => {
  return [...text.matchAll(NUMBER_RE)].map((match) => Number(match[0])).filter(Number.isFinite);
};

const tokenizePath = (pathData) => {
  return [...pathData.matchAll(PATH_TOKEN_RE)].map((match) => match[0]);
};

const isPathCommand = (token) => /^[a-zA-Z]$/.test(token);

const readPathNumber = (tokens, index) => {
  const value = Number(tokens[index]);
  return Number.isFinite(value) ? value : null;
};

const getPathPoints = (pathData) => {
  const tokens = tokenizePath(pathData);
  const points = [];
  let index = 0;
  let command = null;
  let x = 0;
  let y = 0;
  let subpathX = 0;
  let subpathY = 0;

  while (index < tokens.length) {
    if (isPathCommand(tokens[index])) {
      command = tokens[index];
      index += 1;
    }

    if (!command) {
      break;
    }

    const upperCommand = command.toUpperCase();
    const isRelative = command !== upperCommand;

    if (upperCommand === 'Z') {
      x = subpathX;
      y = subpathY;
      points.push([x, y]);
      command = null;
      continue;
    }

    const paramCount = PATH_PARAM_COUNT[upperCommand];
    if (!paramCount || index + paramCount > tokens.length) {
      break;
    }

    const params = [];
    for (let paramIndex = 0; paramIndex < paramCount; paramIndex += 1) {
      const value = readPathNumber(tokens, index + paramIndex);
      if (value === null) {
        command = null;
        break;
      }
      params.push(value);
    }
    if (!command || params.length !== paramCount) {
      break;
    }
    index += paramCount;

    if (upperCommand === 'M') {
      x = isRelative ? x + params[0] : params[0];
      y = isRelative ? y + params[1] : params[1];
      subpathX = x;
      subpathY = y;
      points.push([x, y]);
      command = isRelative ? 'l' : 'L';
      continue;
    }

    if (upperCommand === 'L') {
      x = isRelative ? x + params[0] : params[0];
      y = isRelative ? y + params[1] : params[1];
      points.push([x, y]);
      continue;
    }

    if (upperCommand === 'H') {
      x = isRelative ? x + params[0] : params[0];
      points.push([x, y]);
      continue;
    }

    if (upperCommand === 'V') {
      y = isRelative ? y + params[0] : params[0];
      points.push([x, y]);
      continue;
    }

    if (upperCommand === 'C') {
      const c1 = [isRelative ? x + params[0] : params[0], isRelative ? y + params[1] : params[1]];
      const c2 = [isRelative ? x + params[2] : params[2], isRelative ? y + params[3] : params[3]];
      x = isRelative ? x + params[4] : params[4];
      y = isRelative ? y + params[5] : params[5];
      points.push(c1, c2, [x, y]);
      continue;
    }

    if (upperCommand === 'S' || upperCommand === 'Q') {
      for (let pointIndex = 0; pointIndex < params.length; pointIndex += 2) {
        const px = isRelative ? x + params[pointIndex] : params[pointIndex];
        const py = isRelative ? y + params[pointIndex + 1] : params[pointIndex + 1];
        points.push([px, py]);
      }
      x = points[points.length - 1][0];
      y = points[points.length - 1][1];
      continue;
    }

    if (upperCommand === 'T') {
      x = isRelative ? x + params[0] : params[0];
      y = isRelative ? y + params[1] : params[1];
      points.push([x, y]);
      continue;
    }

    if (upperCommand === 'A') {
      x = isRelative ? x + params[5] : params[5];
      y = isRelative ? y + params[6] : params[6];
      const rx = Math.abs(params[0]);
      const ry = Math.abs(params[1]);
      points.push([x - rx, y - ry], [x + rx, y + ry], [x, y]);
    }
  }

  return points;
};

const addPoint = (bounds, x, y) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
};

const addRect = (bounds, x, y, width, height) => {
  addPoint(bounds, x, y);
  addPoint(bounds, x + width, y + height);
};

const parseElementAttributes = (tagText) => {
  const attrs = {};
  for (const attribute of parseAttributes(tagText)) {
    attrs[attribute.name] = attribute.value;
  }
  return attrs;
};

const getNumericAttr = (attrs, name, fallback = 0) => {
  const value = attrs[name];
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const estimateSvgBounds = (svgContent, viewBox) => {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  for (const match of svgContent.matchAll(/<path\b[^>]*\bd=(["'])([\s\S]*?)\1[^>]*>/gi)) {
    const points = getPathPoints(match[2]);
    for (const [x, y] of points) {
      addPoint(bounds, x, y);
    }
  }

  for (const match of svgContent.matchAll(/<rect\b([^>]*)>/gi)) {
    const attrs = parseElementAttributes(match[1] ?? '');
    addRect(
      bounds,
      getNumericAttr(attrs, 'x'),
      getNumericAttr(attrs, 'y'),
      getNumericAttr(attrs, 'width'),
      getNumericAttr(attrs, 'height'),
    );
  }

  for (const match of svgContent.matchAll(/<circle\b([^>]*)>/gi)) {
    const attrs = parseElementAttributes(match[1] ?? '');
    const cx = getNumericAttr(attrs, 'cx');
    const cy = getNumericAttr(attrs, 'cy');
    const r = getNumericAttr(attrs, 'r');
    addRect(bounds, cx - r, cy - r, r * 2, r * 2);
  }

  for (const match of svgContent.matchAll(/<ellipse\b([^>]*)>/gi)) {
    const attrs = parseElementAttributes(match[1] ?? '');
    const cx = getNumericAttr(attrs, 'cx');
    const cy = getNumericAttr(attrs, 'cy');
    const rx = getNumericAttr(attrs, 'rx');
    const ry = getNumericAttr(attrs, 'ry');
    addRect(bounds, cx - rx, cy - ry, rx * 2, ry * 2);
  }

  for (const match of svgContent.matchAll(/<line\b([^>]*)>/gi)) {
    const attrs = parseElementAttributes(match[1] ?? '');
    addPoint(bounds, getNumericAttr(attrs, 'x1'), getNumericAttr(attrs, 'y1'));
    addPoint(bounds, getNumericAttr(attrs, 'x2'), getNumericAttr(attrs, 'y2'));
  }

  for (const match of svgContent.matchAll(/<(?:polyline|polygon)\b[^>]*\bpoints=(["'])([\s\S]*?)\1[^>]*>/gi)) {
    const values = numbersFromText(match[2]);
    for (let index = 0; index < values.length - 1; index += 2) {
      addPoint(bounds, values[index], values[index + 1]);
    }
  }

  if (Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY)) {
    return bounds;
  }

  const viewBoxValues = viewBox ? numbersFromText(viewBox) : [];
  if (viewBoxValues.length >= 4) {
    return {
      minX: viewBoxValues[0],
      minY: viewBoxValues[1],
      maxX: viewBoxValues[0] + viewBoxValues[2],
      maxY: viewBoxValues[1] + viewBoxValues[3],
    };
  }

  return {
    minX: 0,
    minY: 0,
    maxX: 60,
    maxY: 40,
  };
};

const formatBounds = (bounds) => {
  const round = (value) => Number(value.toFixed(3));
  return `{ minX: ${round(bounds.minX)}, minY: ${round(bounds.minY)}, maxX: ${round(bounds.maxX)}, maxY: ${round(bounds.maxY)} }`;
};

const parseStyleAttribute = (styleText) => {
  const parsed = parseCssDeclarations(styleText);
  return Object.keys(parsed).length === 0 ? undefined : parsed;
};

const parseAttributes = (attributeText) => {
  const attributes = [];

  for (const match of attributeText.matchAll(ATTR_RE)) {
    const rawName = match[1];
    const rawValue = match[3] ?? match[4];
    attributes.push({
      name: rawName,
      value: rawValue ?? true,
    });
  }

  return attributes;
};

const formatStyleObject = (styleObject) => {
  const entries = Object.entries(styleObject);
  if (entries.length === 0) {
    return undefined;
  }

  const body = entries
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(', ');

  return `{{ ${body} }}`;
};

const buildAttributeString = (attributes) => {
  const parts = [];

  for (const [name, value] of attributes) {
    if (value === true) {
      parts.push(name);
      continue;
    }

    if (name === 'style' && typeof value === 'object') {
      const formattedStyle = formatStyleObject(value);
      if (formattedStyle) {
        parts.push(`style=${formattedStyle}`);
      }
      continue;
    }

    parts.push(`${name}=${JSON.stringify(String(value))}`);
  }

  return parts.length === 0 ? '' : ` ${parts.join(' ')}`;
};

const transformOpeningTag = (fullMatch, tagName, rawAttributes = '', selfClosing = '') => {
  const parsedAttributes = parseAttributes(rawAttributes);
  const attributeMap = new Map();
  let inlineStyle;
  let classNames = [];

  for (const attribute of parsedAttributes) {
    const originalName = attribute.name;
    const normalizedName = normalizeAttributeName(originalName);

    if (normalizedName === 'style' && typeof attribute.value === 'string') {
      inlineStyle = {
        ...(inlineStyle ?? {}),
        ...(parseStyleAttribute(attribute.value) ?? {}),
      };
      continue;
    }

    if (originalName === 'class' || normalizedName === 'className') {
      if (typeof attribute.value === 'string') {
        classNames = attribute.value.split(/\s+/).filter(Boolean);
      }
      continue;
    }

    if (REMOVED_ATTRIBUTES.has(originalName)) {
      continue;
    }

    attributeMap.set(normalizedName, attribute.value);
  }

  for (const className of classNames) {
    const classStyles = transformOpeningTag.classStyleMap[className];
    if (!classStyles) {
      continue;
    }

    for (const [styleName, styleValue] of Object.entries(classStyles)) {
      if (!attributeMap.has(styleName)) {
        attributeMap.set(styleName, styleValue);
      }
    }
  }

  if (inlineStyle) {
    attributeMap.set('style', inlineStyle);
  }

  const rebuiltAttributes = buildAttributeString([...attributeMap.entries()]);
  return `<${tagName}${rebuiltAttributes}${selfClosing ? ' /' : ''}>`;
};

transformOpeningTag.classStyleMap = {};

const convertSvgToTsx = (svgSource, componentName) => {
  const viewBox = svgSource.match(VIEW_BOX_RE)?.[2] ?? null;
  const classStyleMap = extractClassStyleMap(svgSource);
  transformOpeningTag.classStyleMap = classStyleMap;

  const svgContentMatch = svgSource.match(SVG_TAG_RE);
  if (!svgContentMatch) {
    throw new Error('No <svg> root found in input file.');
  }

  const cleanedContent = svgContentMatch[1]
    .replace(STYLE_TAG_RE, '')
    .replace(EMPTY_DEFS_RE, '')
    .trim();

  const bounds = estimateSvgBounds(cleanedContent, viewBox);
  const jsxContent = cleanedContent.replace(OPEN_TAG_RE, transformOpeningTag).trim();
  const body = jsxContent
    .split(/\r?\n/)
    .map((line) => `    ${line}`)
    .join('\n');

  const code = `export const ${componentName}Bounds = ${formatBounds(bounds)} as const;

export const ${componentName} = () => (
  <>
${body}
  </>
);
`;

  return {
    code,
    viewBox,
    bounds,
  };
};

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.name) {
  printUsageAndExit();
}

const inputPath = path.resolve(args.input);
const outputPath = args.output ? path.resolve(args.output) : null;

const svgSource = await fs.readFile(inputPath, 'utf8');
const result = convertSvgToTsx(svgSource, args.name);

if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, result.code, 'utf8');
}

const summary = {
  component: args.name,
  input: inputPath,
  output: outputPath,
  viewBox: result.viewBox,
  bounds: result.bounds,
};

if (outputPath) {
  console.log(`Generated ${args.name} -> ${outputPath}`);
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(JSON.stringify(summary, null, 2));
  process.stdout.write('\n');
  process.stdout.write(result.code);
}
