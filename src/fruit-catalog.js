const kinds = {
  strawberry: [
    ["", "整颗"],
    ["hulled", "去蒂整颗"],
    ["half", "对半"],
    ["slice", "薄片"],
    ["fan", "扇片"],
    ["dice", "切丁"],
  ],
  blueberry: [
    ["", "整颗"],
    ["half", "对半"],
    ["cluster", "一簇"],
    ["crush", "压碎"],
  ],
  cherry: [
    ["", "整颗"],
    ["bing", "黑樱桃"],
    ["glace", "糖渍"],
    ["half", "去核对半"],
    ["pair", "双樱桃"],
    ["crush", "切碎"],
  ],
  fig: [
    ["", "对半"],
    ["whole", "整颗"],
    ["quarter", "四分之一"],
    ["slice", "薄片"],
  ],
  lemon: [
    ["", "半月片"],
    ["whole", "整颗"],
    ["wheel", "轮片"],
    ["wedge", "角切"],
  ],
  mango: [
    ["", "整颗"],
    ["cheek", "花刀"],
    ["slice", "薄片"],
    ["fan", "扇片"],
    ["dice", "切丁"],
  ],
};
export const fruitCuts = Object.fromEntries(
  Object.entries(kinds).map(([fruit, cuts]) => [
    fruit,
    cuts.map(([cut, label]) => ({
      id: cut ? `${fruit}-${cut}` : fruit,
      label,
    })),
  ]),
);
const available = new Set(
  Object.values(fruitCuts)
    .flat()
    .map(({ id }) => id),
);

export const isFruitStamp = (id) => available.has(id);
