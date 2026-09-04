import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = path.join(ROOT, "profile.config.json");
const GENERATED_DIR = path.join(ROOT, "assets", "generated");
const CHECK_ONLY = process.argv.includes("--check");

const PRESETS = {
  neon: { primary: "#7C3AED", secondary: "#22D3EE", accent: "#F472B6", highlight: "#BEF264" },
  cyberpunk: { primary: "#8B5CF6", secondary: "#06B6D4", accent: "#EC4899", highlight: "#A3FF12" },
  purple: { primary: "#7C3AED", secondary: "#A78BFA", accent: "#F0ABFC", highlight: "#C4B5FD" },
  blue: { primary: "#2563EB", secondary: "#06B6D4", accent: "#60A5FA", highlight: "#67E8F9" },
  minimal: { primary: "#52525B", secondary: "#71717A", accent: "#A1A1AA", highlight: "#D4D4D8" },
  terminal: { primary: "#22C55E", secondary: "#4ADE80", accent: "#14B8A6", highlight: "#D9F99D" },
  minecraft: { primary: "#65A30D", secondary: "#16A34A", accent: "#A16207", highlight: "#BEF264" }
};

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
validateConfig(config);

const preset = PRESETS[config.theme.preset] ?? PRESETS.cyberpunk;
const theme = {
  primary: config.theme.primaryColor || preset.primary,
  secondary: config.theme.secondaryColor || preset.secondary,
  accent: config.theme.accentColor || preset.accent,
  highlight: config.theme.highlightColor || preset.highlight,
  animations: config.theme.animations !== false
};

const outputs = new Map();
outputs.set("README.md", renderReadme(config, theme));
outputs.set("assets/generated/header-dark.svg", renderHeader(config, theme, "dark"));
outputs.set("assets/generated/header-light.svg", renderHeader(config, theme, "light"));
outputs.set("assets/generated/stack-dark.svg", renderStack(config, theme, "dark"));
outputs.set("assets/generated/stack-light.svg", renderStack(config, theme, "light"));
outputs.set("assets/generated/footer-dark.svg", renderFooter(config, theme, "dark"));
outputs.set("assets/generated/footer-light.svg", renderFooter(config, theme, "light"));

config.projects.featured
  .filter((project) => project.visible !== false)
  .forEach((project, index) => {
    outputs.set(`assets/generated/project-${index + 1}-dark.svg`, renderProject(project, theme, "dark"));
    outputs.set(`assets/generated/project-${index + 1}-light.svg`, renderProject(project, theme, "light"));
  });

if (CHECK_ONLY) {
  const changed = [];
  for (const [relativePath, content] of outputs) {
    const target = path.join(ROOT, relativePath);
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) changed.push(relativePath);
  }
  if (changed.length) {
    console.error(`Generated files are out of date:\n${changed.map((file) => `- ${file}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Profile is current (${outputs.size} generated files checked).`);
} else {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  for (const [relativePath, content] of outputs) {
    const target = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  console.log(`Generated ${outputs.size} profile files.`);
}

function validateConfig(value) {
  const fail = (message) => {
    throw new Error(`Invalid profile.config.json: ${message}`);
  };
  if (!value?.profile?.username) fail("profile.username is required");
  if (!value?.profile?.name) fail("profile.name is required");
  if (!Array.isArray(value?.profile?.typingLines) || value.profile.typingLines.length === 0) fail("add at least one typing line");
  if (!Array.isArray(value?.sections?.order)) fail("sections.order must be an array");
  if (!value?.sections?.visibility) fail("sections.visibility is required");
  if (!Array.isArray(value?.skills?.groups)) fail("skills.groups must be an array");
  if (!Array.isArray(value?.projects?.featured)) fail("projects.featured must be an array");
  for (const colorKey of ["primaryColor", "secondaryColor", "accentColor", "highlightColor"]) {
    const color = value.theme?.[colorKey];
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) fail(`theme.${colorKey} must be a six-digit hex color`);
  }
  for (const project of value.projects.featured) {
    if (!project.name || !project.repositoryUrl || !project.description) fail("each featured project needs name, repositoryUrl and description");
    assertSafeUrl(project.repositoryUrl, "project repositoryUrl");
    if (project.websiteUrl) assertSafeUrl(project.websiteUrl, "project websiteUrl");
  }
}

function assertSafeUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} must use https`);
}

function palette(mode) {
  return mode === "dark"
    ? {
        background: "#070816",
        surface: "#101329",
        surfaceAlt: "#161A36",
        text: "#F8FAFF",
        muted: "#B8BCE1",
        faint: "#6F739D",
        grid: "#2A2E55"
      }
    : {
        background: "#F7F5FF",
        surface: "#FFFFFF",
        surfaceAlt: "#F0ECFF",
        text: "#18152B",
        muted: "#5E607B",
        faint: "#8A89A5",
        grid: "#DCD6F7"
      };
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function markdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function wrap(value, maxCharacters, maxLines = 3) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || line.length === 0) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = `${lines.at(-1).replace(/[.,;:]?$/, "")}…`;
  }
  return lines;
}

function svgDocument({ width, height, label, body, styles = "", defs = "" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${xml(label)}</title>
  <desc id="desc">${xml(label)}</desc>
  <defs>
    ${defs}
  </defs>
  <style>
    text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    ${styles}
  </style>
  ${body}
</svg>
`;
}

function commonDefs(theme, mode) {
  const colors = palette(mode);
  return `
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.primary}"/>
      <stop offset="0.48" stop-color="${theme.secondary}"/>
      <stop offset="1" stop-color="${theme.accent}"/>
    </linearGradient>
    <linearGradient id="neon-soft" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.primary}" stop-opacity="0.25"/>
      <stop offset="0.5" stop-color="${theme.secondary}" stop-opacity="0.1"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0.25"/>
    </linearGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="${colors.grid}" stroke-width="1" opacity="0.38"/>
    </pattern>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
}

function renderHeader(config, theme, mode) {
  const colors = palette(mode);
  const lines = theme.animations ? config.profile.typingLines : [config.profile.typingLines[0]];
  const cycle = Math.max(3, lines.length * 3);
  const motionStyles = theme.animations
    ? `
      .orb-a { animation: drift-a 8s ease-in-out infinite; transform-origin: center; }
      .orb-b { animation: drift-b 11s ease-in-out infinite; transform-origin: center; }
      .signal { animation: signal 2.2s ease-in-out infinite; }
      .type-line { opacity: 0; animation: type-cycle ${cycle}s ease-in-out infinite; }
      ${lines.map((_, index) => `.type-${index} { animation-delay: ${index * 3}s; }`).join("\n")}
      @keyframes drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(18px,-12px) scale(1.08); } }
      @keyframes drift-b { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-22px,14px); } }
      @keyframes signal { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
      @keyframes type-cycle { 0%,20% { opacity: 1; transform: translateY(0); } 24%,96% { opacity: 0; transform: translateY(5px); } 100% { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        .orb-a,.orb-b,.signal,.type-line { animation: none !important; }
        .type-line { opacity: 0; }
        .type-0 { opacity: 1; }
      }`
    : `.type-line { opacity: 1; }`;

  const typing = lines
    .map((line, index) => `<text class="type-line type-${index}" x="600" y="294" text-anchor="middle" fill="${theme.secondary}" font-size="24" font-weight="700" letter-spacing="1.3">${xml(line)}</text>`)
    .join("\n");
  const headlineLines = wrap(config.profile.headline, 78, 2);
  const headline = headlineLines
    .map((line, index) => `<text x="600" y="${220 + index * 26}" text-anchor="middle" fill="${colors.muted}" font-size="18" font-weight="500">${xml(line)}</text>`)
    .join("\n");

  return svgDocument({
    width: 1200,
    height: 380,
    label: `${config.profile.name} — developer profile header`,
    defs: commonDefs(theme, mode),
    styles: motionStyles,
    body: `
      <rect x="1.5" y="1.5" width="1197" height="377" rx="28" fill="${colors.background}" stroke="url(#neon)" stroke-width="3"/>
      <rect x="2" y="2" width="1196" height="376" rx="27" fill="url(#grid)"/>
      <path d="M0 310 C180 270 300 360 490 322 S810 270 1200 326 V380 H0Z" fill="url(#neon-soft)" opacity="0.6"/>
      <circle class="orb-a" cx="164" cy="90" r="72" fill="${theme.primary}" opacity="0.13" filter="url(#glow)"/>
      <circle class="orb-b" cx="1040" cy="245" r="86" fill="${theme.accent}" opacity="0.11" filter="url(#glow)"/>
      <g opacity="0.85">
        <rect x="70" y="62" width="13" height="13" fill="${theme.secondary}"/>
        <rect x="87" y="62" width="7" height="7" fill="${theme.primary}"/>
        <rect x="1106" y="68" width="12" height="12" fill="${theme.accent}"/>
        <rect x="1122" y="84" width="6" height="6" fill="${theme.secondary}"/>
      </g>
      <text x="72" y="46" fill="${colors.faint}" font-size="12" font-weight="800" letter-spacing="3">${xml(config.profile.eyebrow)}</text>
      <text x="1128" y="46" text-anchor="end" fill="${colors.faint}" font-size="12" font-weight="700" letter-spacing="1.5">github.com/${xml(config.profile.username)}</text>
      <text x="600" y="152" text-anchor="middle" fill="${colors.text}" font-size="64" font-weight="850" letter-spacing="-2.4">${xml(config.profile.heroTitle)}</text>
      <rect x="443" y="174" width="314" height="4" rx="2" fill="url(#neon)" filter="url(#glow)"/>
      ${headline}
      ${typing}
      <g class="signal">
        <circle cx="542" cy="335" r="3" fill="${theme.primary}"/>
        <circle cx="565" cy="335" r="3" fill="${theme.secondary}"/>
        <rect x="585" y="332" width="30" height="6" rx="3" fill="url(#neon)"/>
        <circle cx="635" cy="335" r="3" fill="${theme.accent}"/>
        <circle cx="658" cy="335" r="3" fill="${theme.highlight}"/>
      </g>`
  });
}

function renderStack(config, theme, mode) {
  const colors = palette(mode);
  const resolvedGroups = config.skills.groups.map((group) => ({ ...group, items: [...group.items] }));
  for (const manual of config.skills.manual || []) {
    const item = typeof manual === "string" ? { name: manual, group: "More" } : manual;
    if (!item?.name) continue;
    let group = resolvedGroups.find((candidate) => candidate.name === (item.group || "More"));
    if (!group) {
      group = { name: item.group || "More", items: [] };
      resolvedGroups.push(group);
    }
    if (!group.items.includes(item.name)) group.items.push(item.name);
  }
  const visibleGroups = resolvedGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !config.skills.hidden.includes(item)) }))
    .filter((group) => group.items.length);
  const columns = 2;
  const cardWidth = 556;
  const cardHeight = 250;
  const gap = 24;
  const rows = Math.ceil(visibleGroups.length / columns);
  const height = 76 + rows * cardHeight + Math.max(0, rows - 1) * gap + 34;
  const cards = visibleGroups.map((group, groupIndex) => {
    const col = groupIndex % columns;
    const row = Math.floor(groupIndex / columns);
    const x = 32 + col * (cardWidth + gap);
    const y = 76 + row * (cardHeight + gap);
    let pillX = x + 24;
    let pillY = y + 78;
    const pills = [];
    group.items.forEach((item, itemIndex) => {
      const width = Math.max(98, Math.min(242, 48 + item.length * 8.1));
      if (pillX + width > x + cardWidth - 24) {
        pillX = x + 24;
        pillY += 54;
      }
      const color = [theme.primary, theme.secondary, theme.accent, theme.highlight][itemIndex % 4];
      pills.push(`
        <g>
          <rect x="${pillX}" y="${pillY}" width="${width}" height="38" rx="12" fill="${colors.surfaceAlt}" stroke="${colors.grid}"/>
          <rect x="${pillX + 12}" y="${pillY + 12}" width="14" height="14" rx="3" fill="${color}" opacity="0.9"/>
          <text x="${pillX + 35}" y="${pillY + 25}" fill="${colors.text}" font-size="14" font-weight="650">${xml(item)}</text>
        </g>`);
      pillX += width + 12;
    });
    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="22" fill="${colors.surface}" stroke="${colors.grid}"/>
        <rect x="${x}" y="${y}" width="5" height="${cardHeight}" rx="2.5" fill="url(#neon)"/>
        <text x="${x + 24}" y="${y + 38}" fill="${colors.text}" font-size="20" font-weight="800">${xml(group.name)}</text>
        <text x="${x + cardWidth - 24}" y="${y + 37}" text-anchor="end" fill="${colors.faint}" font-size="12" font-weight="700">0${groupIndex + 1}</text>
        ${pills.join("\n")}
      </g>`;
  }).join("\n");

  return svgDocument({
    width: 1200,
    height,
    label: "Spring's evidence-backed technology stack",
    defs: commonDefs(theme, mode),
    body: `
      <rect width="1200" height="${height}" rx="26" fill="${colors.background}"/>
      <rect width="1200" height="${height}" rx="26" fill="url(#grid)" opacity="0.5"/>
      <text x="32" y="46" fill="${colors.faint}" font-size="12" font-weight="800" letter-spacing="3">EVIDENCE-BACKED STACK · EDITABLE IN PROFILE.CONFIG.JSON</text>
      <rect x="963" y="28" width="205" height="3" rx="2" fill="url(#neon)"/>
      ${cards}`
  });
}

function renderProject(project, theme, mode) {
  const colors = palette(mode);
  const descriptionLines = wrap(project.description, 86, 3);
  const description = descriptionLines.map((line, index) => `<text x="198" y="${135 + index * 25}" fill="${colors.muted}" font-size="16">${xml(line)}</text>`).join("\n");
  let tagX = 198;
  const tags = (project.tags || []).slice(0, 5).map((tag, index) => {
    const width = Math.max(88, 30 + tag.length * 7.3);
    const color = [theme.primary, theme.secondary, theme.accent, theme.highlight][index % 4];
    const pill = `<g><rect x="${tagX}" y="232" width="${width}" height="34" rx="11" fill="${color}" opacity="0.14" stroke="${color}" stroke-opacity="0.6"/><text x="${tagX + width / 2}" y="254" text-anchor="middle" fill="${colors.text}" font-size="12" font-weight="700">${xml(tag)}</text></g>`;
    tagX += width + 10;
    return pill;
  }).join("\n");
  return svgDocument({
    width: 1100,
    height: 304,
    label: `${project.name} featured project`,
    defs: commonDefs(theme, mode),
    styles: theme.animations ? `.project-arrow { animation: nudge 2.4s ease-in-out infinite; } @keyframes nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(7px); } } @media (prefers-reduced-motion: reduce) { .project-arrow { animation: none; } }` : "",
    body: `
      <rect x="1.5" y="1.5" width="1097" height="301" rx="25" fill="${colors.background}" stroke="url(#neon)" stroke-width="3"/>
      <rect x="2" y="2" width="1096" height="300" rx="24" fill="url(#grid)" opacity="0.45"/>
      <rect x="34" y="42" width="126" height="126" rx="28" fill="${colors.surface}" stroke="${theme.secondary}" stroke-opacity="0.65"/>
      <rect x="51" y="59" width="92" height="92" rx="20" fill="url(#neon)" opacity="0.15"/>
      <text x="97" y="123" text-anchor="middle" fill="${colors.text}" font-size="38" font-weight="900" letter-spacing="-2">${xml(project.icon || project.name.slice(0, 2).toUpperCase())}</text>
      <text x="198" y="61" fill="${theme.secondary}" font-size="12" font-weight="800" letter-spacing="2.2">FEATURED PUBLIC BUILD</text>
      <text x="198" y="104" fill="${colors.text}" font-size="32" font-weight="850">${xml(project.name)}</text>
      ${description}
      ${tags}
      <g transform="translate(867,44)">
        <rect width="196" height="42" rx="13" fill="${colors.surface}" stroke="${colors.grid}"/>
        <circle cx="20" cy="21" r="5" fill="${theme.highlight}"/>
        <text x="36" y="26" fill="${colors.text}" font-size="13" font-weight="750">${xml(project.status || "Public")}</text>
        <text x="177" y="26" text-anchor="end" fill="${colors.faint}" font-size="12">${xml(project.role || "")}</text>
      </g>
      <text x="867" y="236" fill="${colors.faint}" font-size="12" font-weight="700" letter-spacing="1.2">PRIMARY LANGUAGE</text>
      <text x="867" y="262" fill="${colors.text}" font-size="17" font-weight="750">${xml(project.language || "Mixed")}</text>
      <text class="project-arrow" x="1038" y="266" text-anchor="middle" fill="${theme.accent}" font-size="30" font-weight="800">→</text>`
  });
}

function renderFooter(config, theme, mode) {
  const colors = palette(mode);
  const motion = theme.animations
    ? `.scan { animation: scan 5s ease-in-out infinite; } @keyframes scan { 0%,100% { transform: translateX(-180px); opacity: .2; } 50% { transform: translateX(1080px); opacity: .8; } } @media (prefers-reduced-motion: reduce) { .scan { animation: none; opacity: .45; } }`
    : "";
  return svgDocument({
    width: 1100,
    height: 132,
    label: `${config.profile.name} profile footer`,
    defs: commonDefs(theme, mode),
    styles: motion,
    body: `
      <rect x="1" y="1" width="1098" height="130" rx="24" fill="${colors.background}" stroke="${colors.grid}"/>
      <path d="M28 71 H240 L260 49 L280 91 L303 62 L325 71 H506 L525 56 L545 84 L566 71 H760 L778 53 L798 87 L818 71 H1072" fill="none" stroke="url(#neon)" stroke-width="3" opacity="0.8"/>
      <rect class="scan" x="0" y="28" width="150" height="76" rx="38" fill="url(#neon-soft)"/>
      <rect x="414" y="42" width="272" height="58" rx="18" fill="${colors.surface}" stroke="${colors.grid}"/>
      <text x="550" y="66" text-anchor="middle" fill="${colors.text}" font-size="14" font-weight="800" letter-spacing="2">BUILD · BREAK · LEARN</text>
      <text x="550" y="86" text-anchor="middle" fill="${colors.faint}" font-size="12" font-weight="650">THEN BUILD IT BETTER</text>`
  });
}

function renderReadme(config, theme) {
  const sections = {
    about: renderAbout(config),
    skills: renderSkills(),
    projects: renderProjects(config),
    activity: renderActivity(config),
    stats: renderStats(config),
    snake: renderSnake(config),
    contact: renderContact(config)
  };
  const orderedSections = config.sections.order
    .filter((name) => config.sections.visibility[name] !== false)
    .map((name) => sections[name] || "")
    .filter(Boolean)
    .map((section, index) => section.replace(/^## \d{2} \/ /, `## ${String(index + 1).padStart(2, "0")} / `));
  const content = orderedSections
    .join("\n\n");
  return `<!--
THIS FILE IS AUTOMATICALLY GENERATED.
Edit profile.config.json, then run: npm run build
See CUSTOMIZATION.md for the complete guide.
-->

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/header-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/generated/header-light.svg">
    <img alt="${markdown(config.profile.name)} — developer, builder and creator" src="./assets/generated/header-dark.svg" width="100%">
  </picture>
</div>

${content}

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/footer-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/generated/footer-light.svg">
    <img alt="Build, break, learn, then build it better" src="./assets/generated/footer-dark.svg" width="100%">
  </picture>
</div>
`;
}

function renderAbout(config) {
  const bio = config.profile.bio.map((paragraph) => markdown(paragraph)).join("\n\n");
  const focusCells = config.focus.map((item) => `<td width="33%" valign="top">
<sub>${markdown(item.label)}</sub><br>
<strong>${markdown(item.title)}</strong><br><br>
${markdown(item.description)}
</td>`).join("\n");
  const availability = config.profile.availableForWork ? "\n\n> 🟢 Open to interesting collaborations and opportunities." : "";
  return `## 01 / About

${bio}${availability}

<table>
<tr>
${focusCells}
</tr>
</table>`;
}

function renderSkills() {
  return `## 02 / Tech stack

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/stack-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/generated/stack-light.svg">
  <img alt="Languages, Minecraft and game development, web stack, and development tooling" src="./assets/generated/stack-dark.svg" width="100%">
</picture>

<sub>Only tools supported by repository evidence are shown. The list is explicitly editable in <a href="./profile.config.json">profile.config.json</a>.</sub>`;
}

function renderProjects(config) {
  const hidden = new Set(config.projects.hidden || []);
  const projects = config.projects.featured.filter((project) =>
    project.visible !== false &&
    !hidden.has(project.repo) &&
    !hidden.has(project.repositoryUrl)
  );
  if (!projects.length) return "";
  const cards = projects.map((project, index) => {
    const live = project.websiteUrl ? ` · **[Live site ↗](${project.websiteUrl})**` : "";
    return `<a href="${project.repositoryUrl}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/generated/project-${index + 1}-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/generated/project-${index + 1}-light.svg">
    <img alt="${markdown(project.name)} — ${markdown(project.description)}" src="./assets/generated/project-${index + 1}-dark.svg" width="100%">
  </picture>
</a>

**[Repository →](${project.repositoryUrl})**${live}`;
  }).join("\n\n<br>\n\n");
  return `## 03 / Featured project${projects.length === 1 ? "" : "s"}

${cards}`;
}

function renderActivity(config) {
  const items = config.activity.items.map((item) => `- ${markdown(item)}`).join("\n");
  return `## 04 / ${markdown(config.activity.title)}

${items}

> The through-line: make the system interesting, make the interface clear, then keep refining both.`;
}

function renderStats(config) {
  if (!config.stats.enabled || !config.stats.customImages.length) return "";
  const images = config.stats.customImages.map((item) => {
    assertSafeUrl(item.url, "stats.customImages.url");
    return `<img alt="${markdown(item.alt || "GitHub statistics")}" src="${item.url}" height="170">`;
  }).join("\n");
  return `## 05 / GitHub signal

<div align="center">
${images}
</div>`;
}

function renderSnake(config) {
  if (!config.snake.enabled) return "";
  const base = `https://raw.githubusercontent.com/${config.profile.username}/${config.profile.username}/${config.snake.branch}`;
  return `## 05 / Contribution trail

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${base}/${config.snake.darkFile}">
    <source media="(prefers-color-scheme: light)" srcset="${base}/${config.snake.lightFile}">
    <img alt="Animated contribution graph snake" src="${base}/${config.snake.lightFile}" width="100%">
  </picture>
</div>

<sub>Generated daily from public contribution data by a least-privilege GitHub Actions workflow.</sub>`;
}

function renderContact(config) {
  const links = [];
  for (const [key, entry] of Object.entries(config.contact)) {
    if (key === "other") continue;
    if (!entry?.show) continue;
    if (key === "email" && entry.address) {
      const address = encodeURIComponent(entry.address.trim()).replaceAll("%40", "@");
      links.push(`[Email](mailto:${address})`);
    } else if (entry.url) {
      assertSafeUrl(entry.url, `contact.${key}.url`);
      links.push(`[${markdown(entry.label || key)}](${entry.url})`);
    }
  }
  for (const entry of config.contact.other || []) {
    if (entry.show && entry.url) {
      assertSafeUrl(entry.url, "contact.other.url");
      links.push(`[${markdown(entry.label)}](${entry.url})`);
    }
  }
  if (!links.length) return "";
  return `## 06 / Connect

<div align="center">

**${links.join(" &nbsp;·&nbsp; ")}**

<sub>Always building. Usually iterating.</sub>

</div>`;
}
