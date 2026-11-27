import { quote, materials, spongeFlavors } from "./recipes.js";
// Quantities and surface coordinates are retained for conversion to a baker's own SKUs.
export function customization(design) {
  const d = structuredClone(design),
    lines = new Map();
  for (const item of d.items) {
    const key = item.type + "|" + item.color;
    let row = lines.get(key);
    if (!row) {
      row = { type: item.type, color: item.color, quantity: 0, placements: [] };
      lines.set(key, row);
    }
    row.quantity++;
    row.placements.push({
      position: item.point,
      rotation: item.rotation || 0,
      scale: item.scale ?? 1,
    });
  }
  return {
    schemaVersion: 1,
    unit: "normalized-cake-surface",
    occasion: d.occasion || "",
    base: {
      shape: d.shape,
      inches: d.size,
      height: d.height,
      layers: d.layers,
      flavors: spongeFlavors(d),
    },
    fillings: d.fillings,
    cream: {
      finish: d.finish,
      colors: [d.color, d.color2, d.color3].filter(Boolean),
      coverage: d.coverage,
    },
    components: [...lines.values()],
    lettering: {
      text: d.text,
      name: d.letterName || "",
      date: d.letterDate || "",
      style: d.textStyle,
      placement: d.textPlacement || "surface",
      size: d.textSize,
      color: d.textColor,
    },
    packaging: {
      board: d.board,
      box: d.box,
      ribbon: d.ribbon,
      card: d.card,
      sticker: !!d.sticker,
    },
    materialList: materials(d),
    pricing: { currency: "CNY", type: "illustrative", total: quote(d) },
    productionNotes: d.notes || "",
    merchantCatalogId: null,
    orderId: null,
  };
}
