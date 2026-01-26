/**
 * Meme Prompt Bank v2
 * CINEMATIC, CREATIVE prompts for CC mascot meme generation
 *
 * Philosophy: The mascot is an INANIMATE ceramic figurine - humor comes from
 * placing it in absurd, epic, or surreal situations. Think Beeple meets dev Twitter.
 */

export const MEME_PROMPTS = [
  // === EPIC SCALE ===
  "Massive CC mascot statue towering over a cyberpunk cityscape at golden hour, neon signs in the background read 'DEPLOY TO PROD', flying cars zooming past, Blade Runner inspired atmosphere, dramatic clouds",
  "Tiny CC mascot sitting on the edge of a massive Grand Canyon-like gorge, looking out at a sunset that paints the sky in code-green and orange, birds flying in formation spelling 'git push'",
  "Giant CC mascot head emerging from the ocean like a mysterious island, tiny boats circling it, lighthouse beam sweeping across, dramatic storm clouds gathering",
  "CC mascot monument being unveiled in a town square, crowd of tiny people cheering, confetti and balloons, bronze plaque reads 'In Honor of Those Who Shipped On Friday'",
  "Colossal CC mascot statue half-buried in desert sand, ancient ruins around it, archaeologists with brushes carefully excavating, hieroglyphics show terminal commands",

  // === SURREAL/ARTISTIC ===
  "CC mascot floating in a vaporwave void surrounded by floating Windows 95 error dialogs, Greek statues, and palm trees, everything bathed in pink and cyan light",
  "CC mascot sitting on a giant melting clock in a Dali-esque desert landscape, the clock face shows 'NaN:undefined', surreal orange sky with floating semicolons",
  "Tiny CC mascot walking through an infinite library (like the one in Interstellar), bookshelves stretching into darkness, books are all titled 'README.md'",
  "CC mascot in a liminal backrooms-style office space, fluorescent lights buzzing, wet carpet, endless cubicles fading into fog, unsettling and empty",
  "CC mascot reflected infinitely in facing mirrors creating a Droste effect, each reflection slightly glitchier than the last, vaporwave grid floor",

  // === CINEMATIC/DRAMATIC ===
  "CC mascot silhouetted against a massive explosion, walking away in slow motion like an action hero, debris flying, text 'rm -rf /' visible in the flames",
  "Film noir scene: CC mascot in a dark alley, rain pouring down, neon sign flickering 'STACK OVERFLOW', dramatic shadows, black and white with orange mascot",
  "CC mascot standing alone in an apocalyptic wasteland, rusted server racks everywhere, red sky, tattered banner reads 'We Should Have Written Tests'",
  "Epic battle scene: Army of CC mascots facing off against giant bug creatures across a binary battlefield, dramatic sunrise, flags waving",
  "CC mascot as the subject of a Renaissance painting, sitting on a throne surrounded by cherubs holding laptops, dramatic lighting through stained glass showing a terminal",

  // === NATURE/ENVIRONMENT ===
  "CC mascot sitting peacefully on a mountain summit at sunrise, clouds below, majestic eagles circling, American flag planted nearby but it's made of code",
  "Tiny CC mascot on a lily pad in a serene Japanese garden, koi fish swimming below, cherry blossoms falling, stone lanterns, perfectly zen atmosphere",
  "CC mascot standing in a field of sunflowers at golden hour, each sunflower head is a different programming language logo, butterflies made of brackets",
  "CC mascot on an iceberg in the Arctic, aurora borealis in the sky spelling out 'LEGACY CODE', penguins (Linux mascots) gathered around",
  "CC mascot in a redwood forest, tiny among massive trees, shafts of golden light breaking through, mushrooms around it are error message red",

  // === POP CULTURE/ART MASHUPS ===
  "CC mascot recreating 'The Creation of Adam' painting - mascot reaching out to touch a giant floating cursor hand, Sistine Chapel style",
  "CC mascot in the style of a Wes Anderson scene - perfectly symmetrical pastel room, vintage computer equipment, other mascots in matching outfits",
  "CC mascot as the figure in Munch's 'The Scream' - but the swirling background is made of Stack Overflow error pages, bridge over a river of coffee",
  "CC mascot in a Banksy-style street art scene - stenciled on a crumbling wall, spray paint cans nearby, political message about 'Technical Debt'",
  "CC mascot as the little astronaut in a Kurzgesagt-style space scene, cute and minimal, floating among colorful planets made of app icons",

  // === DEV HUMOR (VISUAL) ===
  "Server room that looks like a gothic cathedral, CC mascot as a tiny monk praying at an altar of blinking server racks, stained glass shows the AWS logo",
  "CC mascot standing before a massive physical 'tree' where branches are actual git branches with commits as glowing fruits, forest setting",
  "Courtroom scene: CC mascot on trial, jury of rubber ducks, judge is a giant semicolon, evidence board shows a git blame output",
  "CC mascot in a medieval blacksmith forge, but instead of swords they're forging API endpoints, sparks flying, dramatic orange glow",
  "CC mascot floating in actual clouds (the sky kind) surrounded by floating server racks, ladder leading up from earth, dreamy atmosphere",

  // === META/ABSURDIST ===
  "Museum exhibit: CC mascot behind glass with a plaque reading 'Early 21st Century Developer, c. 2024', other museum visitors taking photos",
  "Factory assembly line producing CC mascots, conveyor belts, robotic arms, quality control station rejecting ones with syntax errors",
  "CC mascot graveyard at twilight, tombstones have epitaphs like 'Deprecated v2.0' and 'Killed by Breaking Change', fog rolling in",
  "Inception-style scene: CC mascot looking at a snow globe containing another CC mascot looking at a snow globe, infinite recursion",
  "CC mascot as a product on a grocery store shelf, other competing mascots nearby, price tag shows 'FREE (with hidden costs)'",

  // === WHOLESOME/COZY ===
  "Tiny CC mascot in a miniature cozy cabin scene, fireplace crackling, tiny mug of hot cocoa, snow falling outside window, warm orange glow",
  "CC mascot having a picnic in a meadow with other tech mascots (legally distinct versions), checkered blanket, basket of snacks",
  "CC mascot astronaut floating in a space station cupola, Earth visible below, peaceful and contemplative, stars twinkling",
  "CC mascot tending a small garden, each plant is labeled with a different project name, sunrise light, peaceful morning vibes",

  // === RETRO/NOSTALGIC ===
  "CC mascot in an 80s arcade, surrounded by cabinet games with names like 'BUG HUNTER' and 'MERGE CONFLICT', neon lights, pizza nearby",
  "CC mascot in a 90s bedroom scene, CRT monitor, dial-up modem, 'You've Got Mail' on screen, posters of early internet memes",
  "CC mascot as a pixel art sprite in a 16-bit video game scene, health bar showing 'COFFEE: LOW', retro platformer aesthetic",
  "VHS tape cover design featuring CC mascot as an 80s action hero, cheesy tagline, scan lines, 'Be Kind Rewind' sticker",

  // === SEASONAL/TIMELY ===
  "CC mascot building a snowman that looks like a bug creature, winter wonderland, other mascots having a snowball fight in background",
  "CC mascot at a summer beach, sandcastle shaped like a server rack, seagulls trying to steal code snippets, sunset",
  "CC mascot in a spooky Halloween scene, carved pumpkins with error faces, cobwebs on old monitors, full moon, not-too-scary vibes",
  "CC mascot at a New Year's party, confetti falling, champagne glasses, banner reads '// TODO: Fix in 2025', fireworks outside window",
];

// Get a random prompt that hasn't been used recently
export function getRandomPrompt(recentPrompts: string[] = []): string {
  const available = MEME_PROMPTS.filter((p) => !recentPrompts.includes(p));
  if (available.length === 0) {
    // All used, just pick random
    return MEME_PROMPTS[Math.floor(Math.random() * MEME_PROMPTS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
