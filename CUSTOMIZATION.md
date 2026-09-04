# Customizing this profile

The profile is designed around one source of truth: `profile.config.json`.
`README.md` and every file in `assets/generated/` are generated. Do not edit
those generated files directly.

## The normal editing workflow

1. Edit `profile.config.json`.
2. Run `npm run build` locally if you want an immediate preview.
3. Open `README.md` in GitHub's or your editor's Markdown preview.
4. Commit the configuration change.

On GitHub, the **Regenerate profile** workflow runs whenever the configuration
or generator changes. It rebuilds the README and commits generated files only
when the output actually differs.

Node.js 20 or newer is the only local requirement. There are no npm
dependencies to install.

## Change your name, bio or hero text

Edit the `profile` object:

```json
"profile": {
  "name": "Spring",
  "heroTitle": "Hey, I'm Spring.",
  "headline": "A short line beneath the hero title.",
  "bio": [
    "First paragraph.",
    "Second paragraph."
  ]
}
```

`location` is intentionally blank. Set it only if you want that information to
be public. Set `availableForWork` to `true` to show the availability callout.

## Change the animated titles

Edit `profile.typingLines`. Keep the list short enough to scan easily:

```json
"typingLines": [
  "Minecraft Mod Developer",
  "Web Developer",
  "Game Developer"
]
```

Set `theme.animations` to `false` to disable hero, footer and card motion. The
first typing line becomes the static title.

## Change colors or the theme

Choose one of these presets in `theme.preset`:

- `neon`
- `cyberpunk`
- `purple`
- `blue`
- `minimal`
- `terminal`
- `minecraft`

The four color values override the preset. Remove an override if you want to
use the preset's value:

```json
"theme": {
  "preset": "cyberpunk",
  "primaryColor": "#8B5CF6",
  "secondaryColor": "#06B6D4",
  "accentColor": "#EC4899",
  "highlightColor": "#A3FF12",
  "animations": true
}
```

Colors must use six-digit hex format.

## Change technologies

Skills are explicit so the public profile never needs access to private
repositories. Edit `skills.groups` to add, remove, rename or reorder groups and
items:

```json
{
  "name": "Languages",
  "items": ["Java", "TypeScript", "JavaScript"]
}
```

You can temporarily suppress an item without deleting it by adding its exact
name to `skills.hidden`. You can also append a skill without editing the main
groups by adding it to `skills.manual`:

```json
"manual": [
  { "group": "Languages", "name": "Python" },
  { "group": "Tools", "name": "Blender" }
]
```

A missing group is created automatically. The generator treats `groups` plus
`manual` as the resolved public list.

Only list tools you are comfortable claiming publicly.

## Change featured projects

Projects render in the order used by `projects.featured`. Each entry supports:

- `visible`: hide or show the card;
- `owner` and `repo`: optional repository identity;
- `name` and `icon`: public display values;
- `logoPath`: optional SVG logo inside the repository;
- `description`: custom card copy;
- `primaryUrl` and `primaryLabel`: the main card link;
- `repositoryUrl` and `repositoryLabel`: optional source-code link;
- `role` and `status`;
- `detail` and `tags`.

Example:

```json
{
  "visible": true,
  "name": "My Project",
  "icon": "MP",
  "logoPath": "assets/logos/my-project.svg",
  "description": "A concise, accurate description.",
  "primaryUrl": "https://example.com/",
  "primaryLabel": "Visit website",
  "repositoryUrl": "https://github.com/SpringK1801/my-public-project",
  "repositoryLabel": "Source",
  "role": "Creator",
  "status": "Live",
  "detail": "Web app",
  "tags": ["Next.js", "Supabase"]
}
```

Use `visible: false` for a temporary hide. You can also add a public repo name
or URL to `projects.hidden`; either form suppresses the matching card. Do not
add private repository names, URLs, descriptions or artwork: the configuration
itself is public.

Set `projects.automatic.enabled` to `false` when you want to choose the cards
yourself.

## Change the current direction section

Edit `activity.title` and `activity.items`. Keep these statements general if
the work behind them is private.

## Contact links and email visibility

Every contact provider has a `show` switch. For example:

```json
"website": {
  "show": true,
  "label": "Portfolio",
  "url": "https://example.com/"
}
```

GitHub is enabled by default. Website, Discord, LinkedIn, X/Twitter, YouTube,
CurseForge and Modrinth are ready to configure. Add less common links to
`contact.other` using the same `show`, `label` and `url` fields.

Email defaults to hidden and its address is intentionally not stored in this
public repository. To publish it, add the address and enable the switch:

```json
"email": {
  "show": true,
  "address": "name@example.com"
}
```

Remember: setting `show` back to `false` removes the email from the README, but
the address remains visible in the public Git history. If privacy matters, use
a GitHub no-reply address or a public contact page instead.

## Show, hide or reorder sections

Use `sections.visibility` to toggle sections. Reorder the names in
`sections.order` to change the page flow. Supported names are:

- `about`
- `skills`
- `projects`
- `activity`
- `stats`
- `snake`
- `contact`

## Statistics

Statistics are disabled by default. Most public card services count repository
bytes rather than actual skill and add an external uptime dependency. That can
be misleading when much of your work is private.

If you later choose a provider, set `stats.enabled` to `true`, enable the
`stats` section, and add HTTPS image objects to `stats.customImages`:

```json
"customImages": [
  {
    "alt": "GitHub activity summary",
    "url": "https://trusted.example/card.svg"
  }
]
```

## Contribution snake

The snake workflow runs daily, on manual dispatch, and whenever its workflow
file changes. It publishes only generated SVG files to the `output` branch.

To hide the section without deleting automation, set
`sections.visibility.snake` to `false`. To stop generation too, set
`snake.enabled` to `false` and disable the workflow from the Actions page.

The generator job receives only `contents: read`. A separate publishing job
gets `contents: write` after generation is complete. All actions are pinned to
reviewed commit SHAs, and the workflow does not require repository secrets.

## Validate before pushing

Run:

```bash
npm run build
npm run check
```

`npm run check` exits with an error if any generated file is stale. Also inspect
the Markdown preview in both light and dark editor themes after major visual
changes.
