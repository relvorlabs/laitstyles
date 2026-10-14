/**
 * Deterministic generator for scripts/seed/catalog-fixture.json.
 *
 * Content-only fixture: no database ids, SKUs, archive numbers or timestamps.
 * The API import script (import-catalog-fixture-via-api.ts) generates those at
 * runtime via POST /api/v1/admin/products (intent=publish), letting Prisma /
 * server defaults assign ids, slugs, SKUs and timestamps.
 *
 * Images: verified Pexels CDN photo IDs reused from
 * scripts/seed/storefront-catalog-snapshot.json. Each entry was originally
 * captured from a Pexels fashion search (see asset source_search_url in the
 * snapshot) and its visible subject was inspected before the product copy was
 * written. Every generated description names the visible subject and colour
 * family shown by its assigned image so copy and imagery stay matched.
 * No generated or downloaded image files; external CDN URLs only.
 *
 * Run: pnpm db:fixture:generate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "catalog-fixture.json");

const img = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

const IMAGE_POOLS = {
  jackets: [
    "10887358",
    "14090402",
    "14854328",
    "37124603",
    "34646607",
    "32483235",
    "20582302",
    "27064461",
    "35243685",
    "37067581",
    "18092962",
    "33717097",
    "19807757",
    "7921824",
    "29086752",
    "19109416",
    "34148393",
    "38224135",
    "18505091",
    "9824774",
  ].map(img),
  denim: [
    "10133274",
    "10133280",
    "10133278",
    "603022",
    "4109755",
    "36607477",
    "19203164",
    "173207",
    "10133275",
    "10133279",
  ].map(img),
  shirts: [
    "652349",
    "8468727",
    "35171075",
    "250288",
    "37825460",
    "15185872",
    "20106402",
    "2527982",
    "37906241",
    "28452482",
  ].map(img),
  jerseys: [
    "38297606",
    "16545261",
    "36549793",
    "36660044",
    "38242315",
    "32799792",
    "15837456",
    "12239376",
    "37383524",
    "35560412",
  ].map(img),
  trousers: [
    "35043249",
    "11716436",
    "21050240",
    "22856154",
    "26425708",
    "18393519",
    "5365474",
    "16983236",
    "16983319",
    "18393526",
  ].map(img),
  knitwear: [
    "19112317",
    "19112315",
    "5710033",
    "34854182",
    "29307039",
    "14903440",
    "6702574",
    "5475173",
    "5710028",
    "35537931",
  ].map(img),
  dresses: [
    "18953353",
    "17901631",
    "20661810",
    "34028655",
    "9725049",
    "15238818",
    "25945183",
    "31018988",
    "30415598",
    "7369454",
  ].map(img),
  accessories: [
    "22432991",
    "8989582",
    "21897141",
    "21897146",
    "27849638",
    "36367484",
    "36367488",
    "16117896",
    "21897312",
    "21897118",
    "7562957",
    "16117426",
    "18313293",
    "35322147",
    "38053192",
    "31959215",
    "4068320",
    "4068314",
    "14090246",
    "5465834",
  ].map(img),
};

const CATEGORY_IMAGE = {
  jackets:
    "https://images.pexels.com/photos/26936525/pexels-photo-26936525.jpeg?auto=compress&cs=tinysrgb&w=1200",
  denim:
    "https://images.pexels.com/photos/28174872/pexels-photo-28174872.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shirts:
    "https://images.pexels.com/photos/31959038/pexels-photo-31959038.jpeg?auto=compress&cs=tinysrgb&w=1200",
  jerseys:
    "https://images.pexels.com/photos/31959038/pexels-photo-31959038.jpeg?auto=compress&cs=tinysrgb&w=1200",
  trousers:
    "https://images.pexels.com/photos/26964993/pexels-photo-26964993.jpeg?auto=compress&cs=tinysrgb&w=1200",
  knitwear:
    "https://images.pexels.com/photos/9947825/pexels-photo-9947825.jpeg?auto=compress&cs=tinysrgb&w=1200",
  dresses:
    "https://images.pexels.com/photos/15470820/pexels-photo-15470820.jpeg?auto=compress&cs=tinysrgb&w=1200",
  accessories:
    "https://images.pexels.com/photos/6902997/pexels-photo-6902997.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

// Each template describes the visible subject of its category's image pool so
// generated copy stays matched to the assigned photograph.
const TEMPLATES = {
  jackets: [
    { garment: "Campus Varsity Jacket", subject: "a collegiate varsity jacket with contrast sleeves and ribbed trims", colours: ["Black with cream sleeves", "Navy with white sleeves", "Crimson with cream sleeves", "Jet black with white script", "Navy body with cream sleeves"], material: "brushed wool-blend body with coated sleeves and quilted lining", fit: "relaxed hip-length fit", style: "Collegiate streetwear", brands: ["Laitstyles Curated", "Laitstyles Curated", "Alpha Industries", "H&M Divided"] },
    { garment: "Tailored Single-Button Blazer", subject: "a tailored single-button blazer with notched lapels shown front-facing", colours: ["Matte black", "Heathered brown-grey", "Deep black velvet", "Ink black", "True black"], material: "wool-blend suiting with cupro lining", fit: "tailored straight fit", style: "Smart-casual tailoring", brands: ["Zara", "H&M Premium", "Laitstyles Curated", "Mango Suit"] },
  ],
  denim: [
    { garment: "Straight-Leg Five-Pocket Jeans", subject: "folded straight-leg five-pocket denim jeans in an indigo wash", colours: ["Classic mid indigo", "Light indigo wash", "Pale sky wash", "Deep indigo rinse", "Washed black denim"], material: "rigid cotton denim with a touch of stretch", fit: "straight-leg regular fit", style: "Everyday denim", brands: ["Levi's", "Wrangler", "Lee", "Laitstyles Curated"] },
    { garment: "Relaxed Tapered Jeans", subject: "a relaxed tapered denim jean with a clean hem, photographed folded", colours: ["Powder blue wash", "True indigo", "Cloud light wash", "Mid-blue stonewash", "Indigo assortment"], material: "midweight comfort-stretch denim", fit: "relaxed tapered fit", style: "Casual denim", brands: ["Levi's", "Uniqlo", "H&M Denim", "Laitstyles Curated"] },
  ],
  shirts: [
    { garment: "Cotton Oxford Button-Down Shirt", subject: "a crisp cotton button-down shirt with a spread collar", colours: ["Optic white", "Powder blue", "Ice blue", "Sky blue oxford", "White with dark micro-dot"], material: "breathable cotton oxford weave", fit: "regular tailored fit", style: "Smart everyday shirting", brands: ["Ralph Lauren", "H&M Premium", "Zara", "Mango Man"] },
    { garment: "Evening Poplin Dress Shirt", subject: "a formal poplin dress shirt with a clean placket and collar", colours: ["Bright white", "Clean white spread collar", "White with black button line", "Cobalt stripe on white", "Charcoal tattersall check"], material: "smooth cotton poplin", fit: "slim tailored fit", style: "Office and occasion shirting", brands: ["TM Lewin", "Charles Tyrwhitt", "Laitstyles Curated", "Zara"] },
  ],
  jerseys: [
    { garment: "Match Football Jersey", subject: "a short-sleeve football jersey with a numbered back and crest trim", colours: ["Black and white", "Scarlet red with black trim", "Royal and sky blue", "White with green-yellow-red trim", "Purple and black"], material: "lightweight breathable mesh knit", fit: "athletic regular fit", style: "Football supporter wear", brands: ["Nike", "Adidas", "Puma", "Laitstyles Curated"] },
    { garment: "Training Graphic Jersey", subject: "a graphic training jersey with colour-block panels", colours: ["Coral with black pixel print", "Mint with yellow trim", "Red with black trim", "Purple gridiron mesh", "Black with red trim"], material: "moisture-wicking polyester knit", fit: "relaxed training fit", style: "Street sportswear", brands: ["Nike", "Adidas", "New Balance", "Laitstyles Curated"] },
  ],
  trousers: [
    { garment: "Utility Cargo Trousers", subject: "wide-leg utility cargo trousers with flap pockets", colours: ["Faded olive", "Washed black", "Dusty olive", "Slate grey", "Warm sand"], material: "ripstop cotton-twill with reinforced stitching", fit: "wide-leg utility fit", style: "Street utility", brands: ["H&M Cargo", "Zara Utility", "Laitstyles Curated", "Asos Design"] },
    { garment: "Tapered Parachute Trousers", subject: "tapered parachute trousers with an elasticated hem and pocket panels", colours: ["Deep black", "Deep olive", "Forest green", "Pale stone", "Bottle green"], material: "lightweight crinkle nylon-blend", fit: "tapered parachute fit", style: "Modern streetwear", brands: ["Pull&Bear", "Bershka", "Laitstyles Curated", "Uniqlo"] },
  ],
  knitwear: [
    { garment: "Chunky Rib-Knit Cardigan", subject: "a chunky rib-knit cardigan with a soft brushed hand-feel", colours: ["Warm taupe", "Oatmeal beige", "Cream and clay", "Stone and rust", "Charcoal and cream"], material: "soft acrylic-wool rib knit", fit: "relaxed layering fit", style: "Cosy knitwear", brands: ["Mango Knit", "H&M Knit", "Laitstyles Curated", "M&S"] },
    { garment: "Everyday Crewneck Sweater", subject: "a folded crewneck sweater in a fine-gauge knit", colours: ["Teal and taupe", "Grey rust charcoal mix", "Ivory berry mustard mix", "Pink cream yellow mix", "Red cream brown pattern"], material: "fine-gauge cotton-blend knit", fit: "regular crew fit", style: "Everyday knitwear", brands: ["Uniqlo", "M&S", "Laitstyles Curated", "Zara Knit"] },
  ],
  dresses: [
    { garment: "Midi Tea Dress", subject: "a midi-length tea dress with a defined waist and flowing skirt", colours: ["Burnt rust", "Marigold yellow", "Blush pink", "Ivory meadow floral", "Tangerine orange"], material: "light crepe with a soft drape", fit: "fitted waist with flared midi skirt", style: "Feminine day dressing", brands: ["Mango", "Zara", "H&M", "Laitstyles Curated"] },
    { garment: "Bodycon Asymmetric Midi Dress", subject: "a long-sleeve asymmetric midi dress with a bodycon silhouette", colours: ["Burnt orange", "Black with white speckle", "Warm sand maxi", "Mid indigo denim", "Black polka dot"], material: "stretch jersey with shape retention", fit: "close bodycon fit", style: "Evening occasion", brands: ["Asos Design", "PrettyLittleThing", "Laitstyles Curated", "Mango"] },
  ],
  accessories: [
    { garment: "Structured Everyday Tote", subject: "a structured everyday tote bag with clean seams and handles", colours: ["Sage green", "Warm nude", "Powder blush", "Ice blue", "Natural ecru"], material: "grained faux leather with fabric lining", fit: "structured carry fit", style: "Everyday carry", brands: ["Laitstyles Curated", "Zara Accessories", "H&M", "Charles & Keith"] },
    { garment: "Classic Six-Panel Cap", subject: "a six-panel baseball cap with an embroidered front patch", colours: ["Washed khaki", "Heather grey", "Violet purple", "Solid black twill", "Cognac and black"], material: "brushed cotton twill with adjustable strap", fit: "adjustable one-size fit", style: "Street accessory", brands: ["Nike", "New Era", "Laitstyles Curated", "Adidas"] },
  ],
};

const CATEGORIES = [
  { name: "Jackets", key: "jackets" },
  { name: "Denim", key: "denim" },
  { name: "Shirts", key: "shirts" },
  { name: "Jerseys", key: "jerseys" },
  { name: "Trousers", key: "trousers" },
  { name: "Knitwear", key: "knitwear" },
  { name: "Dresses", key: "dresses" },
  { name: "Accessories", key: "accessories" },
];

const COLLECTIONS = ["Men", "Women", "Unisex", "Accessories"];
const CONDITIONS = ["Like new", "Excellent", "Excellent", "Very good", "Very good", "Good"];
const SIZES = {
  jackets: ["S", "M", "L", "XL"],
  denim: ["28", "30", "32", "33", "34", "36"],
  shirts: ["S", "M", "L", "XL", "XXL"],
  jerseys: ["S", "M", "L", "XL"],
  trousers: ["28", "30", "32", "34", "36"],
  knitwear: ["S", "M", "L", "XL"],
  dresses: ["XS", "S", "M", "L", "XL"],
  accessories: ["One size", "S/M", "M/L"],
};

const PRICE_BANDS = {
  jackets: [32000, 54000],
  denim: [14000, 26000],
  shirts: [11000, 21000],
  jerseys: [11000, 23000],
  trousers: [13000, 25000],
  knitwear: [12000, 23000],
  dresses: [14000, 29000],
  accessories: [7500, 30000],
};

const PER_CATEGORY = 65; // 8 x 65 = 520 products (>= 500 required)

function pick(list, n) {
  return list[n % list.length];
}

function priceFor(key, n) {
  const [low, high] = PRICE_BANDS[key];
  const span = high - low;
  // Deterministic pseudo-random within band, rounded to nearest 500 NGN.
  const raw = low + ((n * 1373 + key.length * 911) % span);
  const rounded = Math.round(raw / 500) * 500;
  const selling = Math.min(Math.max(rounded, low), high - 500);
  const reference = selling + 5000 + ((n * 613) % 12000);
  return { selling_price: selling, reference_price: reference };
}

function measurementsFor(key, template, n) {
  if (key === "denim" || key === "trousers") {
    return [
      { label: "Waist", value: `${pick(SIZES[key], n)} in / ${(76 + ((n * 3) % 20)).toFixed(0)} cm` },
      { label: "Inseam", value: `${(74 + ((n * 2) % 8)).toFixed(0)} cm` },
      { label: "Leg opening", value: `${(36 + (n % 6)).toFixed(0)} cm` },
    ];
  }
  if (key === "accessories") {
    return [
      { label: "Width", value: `${(24 + (n % 18)).toFixed(0)} cm` },
      { label: "Height", value: `${(18 + (n % 14)).toFixed(0)} cm` },
    ];
  }
  if (key === "dresses") {
    return [
      { label: "Bust", value: `${(84 + ((n * 2) % 20)).toFixed(0)} cm` },
      { label: "Length", value: `${(118 + (n % 14)).toFixed(0)} cm` },
      { label: "Waist", value: `${(68 + ((n * 2) % 16)).toFixed(0)} cm` },
    ];
  }
  return [
    { label: "Pit to pit", value: `${(50 + (n % 14)).toFixed(0)} cm` },
    { label: "Length", value: `${(66 + (n % 10)).toFixed(0)} cm` },
    { label: "Sleeve", value: `${(58 + (n % 8)).toFixed(0)} cm` },
  ];
}

function descriptionFor({ name, template, colour, condition, sizeLabel, mode, index }) {
  const qtyNote =
    mode === "unique"
      ? "This is a one-of-one pre-owned piece in size " + sizeLabel + "; when it sells it is gone."
      : mode === "stocked"
        ? "Repeatable pre-owned grade stock, individually inspected before listing."
        : "Size-run stock tracked per variant; each size is graded before dispatch.";
  return (
    `${name} is a Laitstyles curated pre-owned ${template.garment.toLowerCase()} in ${colour}. ` +
    `The photographed reference shows ${template.subject} in a ${colour.toLowerCase()} finish, ` +
    `which is the visual identity used across the product, media and stock records. ` +
    `Specified in ${template.material}, cut in a ${template.fit} with ${template.style.toLowerCase()} character. ` +
    `Condition is graded ${condition}: inspected for stains, holes, fading and hardware function, ` +
    `with any wear disclosed in the condition record. ${qtyNote} ` +
    `Catalogue entry ${index + 1} of the Laitstyles content-only fixture; ` +
    `photography is a licensed Pexels reference and staff replace it with physical-item photos before sale.`
  );
}

function buildProduct(category, templateIndex, n, globalIndex) {
  const key = category.key;
  const templates = TEMPLATES[key];
  const template = templates[templateIndex % templates.length];
  const colour = pick(template.colours, Math.floor(n / 2) + templateIndex);
  const brand = pick(template.brands, n + templateIndex);
  const sizeLabel = pick(SIZES[key], n + templateIndex);
  const modes = ["unique", "stocked", "stocked", "unique", "variant", "stocked", "unique", "variant"];
  const mode = modes[n % modes.length];
  const { selling_price, reference_price } = priceFor(key, globalIndex);
  const condition = key === "accessories" && n % 5 === 0 ? "New without retail packaging" : pick(CONDITIONS, n);
  const collection =
    key === "accessories"
      ? "Accessories"
      : key === "dresses"
        ? pick(["Women", "Women", "Unisex"], n)
        : key === "jerseys"
          ? pick(["Men", "Unisex", "Men", "Women"], n)
          : pick(["Men", "Women", "Unisex"], n + templateIndex);
  const edition = String(globalIndex + 1).padStart(3, "0");
  const name = `${brand === "Laitstyles Curated" ? "Laitstyles" : brand} ${template.garment} ${colour.split(" ")[0]} Edition ${edition}`;
  const pool = IMAGE_POOLS[key];
  const coverUrl = pool[globalIndex % pool.length];
  let detailUrl = pool[(globalIndex + 7) % pool.length];
  if (detailUrl === coverUrl) detailUrl = pool[(globalIndex + 3) % pool.length];
  const images = [
    {
      url: coverUrl,
      alt: `${name} — photographed reference showing ${template.subject} in ${colour}, front view`,
      kind: "cover",
    },
    {
      url: detailUrl,
      alt: `${name} — alternate reference detail of ${template.garment.toLowerCase()} fabric and construction in ${colour}`,
      kind: "detail",
    },
  ];
  const measurements = measurementsFor(key, template, n);
  const base = {
    name,
    description: descriptionFor({ name, template, colour, condition, sizeLabel, mode, index: globalIndex }),
    category: category.name,
    collection,
    brand,
    inventory_mode: mode,
    selling_price,
    reference_price,
    condition,
    size_label: mode === "variant" ? "" : sizeLabel,
    colour,
    material: template.material,
    fit: template.fit,
    style: template.style,
    care_instructions: `Air after wear. Spot-clean with a barely damp cloth and test any cleaner on an unseen area first. Keep the ${template.garment.toLowerCase()} folded or hung to preserve its ${template.fit}.`,
    flaw_notes:
      condition === "Good" || condition === "Very good"
        ? "Light pre-owned softening consistent with careful wear; no holes or stains recorded."
        : "",
    measurements,
    quantity: mode === "stocked" ? 2 + ((globalIndex * 5) % 8) : mode === "unique" ? 1 : 0,
    variants:
      mode === "variant"
        ? [0, 1, 2].map((v) => ({
            label: `Size ${pick(SIZES[key], n + v)}`,
            size: pick(SIZES[key], n + v),
            colour,
            quantity: 1 + ((globalIndex + v * 3) % 5),
          }))
        : [],
    images,
    channels: globalIndex % 9 === 0 ? ["storefront", "whatsapp"] : ["storefront"],
  };
  return base;
}

function main() {
  const products = [];
  let globalIndex = 0;
  for (const category of CATEGORIES) {
    for (let n = 0; n < PER_CATEGORY; n += 1) {
      products.push(buildProduct(category, n % 2, n, globalIndex));
      globalIndex += 1;
    }
  }
  const fixture = {
    schema_version: 1,
    dataset_name: "Laitstyles 520-product content-only API fixture",
    currency: "NGN",
    categories: CATEGORIES.map((c) => ({ name: c.name, image_url: CATEGORY_IMAGE[c.key] })),
    collections: COLLECTIONS.map((name) => ({ name })),
    products,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${products.length} products to ${outPath}`);
}

main();
