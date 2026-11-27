const lines = {
  home: '<path d="m3 10 9-7 9 7v10H5V9"/><path d="M9 20v-7h6v7"/>',
  shop: '<path d="M3 10 5 4h14l2 6M4 10v10h16V10M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M8 20v-6h4v6"/>',
  book: '<path d="M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zM12 6v14"/>',
  heart:
    '<path d="M20.7 5.4c-2.5-2.6-6.2-1.5-8.7 1.3-2.4-2.9-6.4-3.7-8.7-1.3-3.3 3.4-.8 7.1 2 9.8l6.7 6 6.7-6c3-2.9 5.2-6.6 2-9.8z"/>',
  next: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  upRight: '<path d="M5 18 18 5M7 5h11v11"/>',
  prev: '<path d="m14 5-7 7 7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 8 7 7 7-7"/>',
  sound:
    '<path d="M3 9v6h4l5 4V5L7 9H3m13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M3 9v6h4l5 4V5L7 9H3m13 1 5 5m0-5-5 5"/>',
  music:
    '<path d="M8 17V6l11-2v11M8 9l11-2"/><ellipse cx="5.5" cy="18" rx="2.5" ry="2"/><ellipse cx="16.5" cy="16" rx="2.5" ry="2"/>',
  pipe: '<path d="M4 20l2-6 8-10 6 6-10 8-6 2ZM7 13l4 4M14 4l3-2 5 5-2 3M4 20l-2 2"/>',
  cake: '<path d="M4 12q0-2 2-2h12q2 0 2 2v7H4zM4 13q2 3 4 0 2 3 4 0 2 3 4 0 2 3 4 0M2 20h20M12 7V4"/><path d="M12 2q2 2 0 3-2-1 0-3"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  undo: '<path d="m9 4-6 5 6 5M3 9h11c8 0 8 11 0 11"/>',
  redo: '<path d="m15 4 6 5-6 5m6-5H10c-8 0-8 11 0 11"/>',
  rotate: '<path d="M20 9a8 8 0 1 0 .2 6M20 3v6h-6"/>',
  move: '<path d="M12 2v20M2 12h20m-13-7 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1zm3 0v7h10V3M7 21v-7h10v7"/>',
  eye: '<path d="M2 12q10-14 20 0-10 14-20 0z"/><circle cx="12" cy="12" r="3"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M3 6h1m-1 6h1m-1 6h1"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  box: '<path d="m3 8 9-5 9 5v11l-9 4-9-4zM3 8l9 5 9-5M12 13v10M7 5l10 6"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  layers: '<path d="m2 8 10-5 10 5-10 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  hands:
    '<path d="m5 15 1-5q1-2 2 0v3-8q1-2 2 0v7-9q1-2 2 0v9-8q1-2 2 0v9-5q2-2 2 0v7l3-3q2-1 2 1l-4 7q-5 5-10-1z"/>',
  leaf: '<path d="M4 19C1 9 9 3 21 3c-1 12-7 18-17 16Zm0 1L16 8"/>',
  whisk:
    '<path d="m3 21 6-8m-1 1c-1-4 1-8 5-11 4-3 9 1 7 5-2 5-6 8-11 7Zm2-2c4-6 6-8 9-9M10 14c6-3 8-6 10-9"/>',
  star: '<path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10z"/>',
  palette:
    '<path d="M20 9c0-5-5-7-10-6C3 4 0 13 5 18c4 4 10 3 9 0-2-3-1-4 2-4 3 0 4-2 4-5z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="16" cy="7" r="1"/>',
  pen: '<path d="m4 16 12-12 4 4L8 20l-5 1zM14 6l4 4"/>',
  slice: '<path d="m3 12 8-9 10 9v8H3zM3 12h18M3 16h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
};
export function icon(name, size = 18) {
  return (
    '<svg class="icon" width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (lines[name] || "") +
    "</svg>"
  );
}
export const cherries =
  '<svg viewBox="0 0 53 52" class="cherries" fill="none" aria-hidden="true"><path d="M13 33C13 23 27 18 29 7c-.5 12 5 15 7 22" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path d="M29 8C23 1 17 4 15 4c3 6 8 8 14 4Z" stroke="currentColor" stroke-width="1.55"/><path d="M13 30c-7-2-12 4-10 10 1 5 7 9 10 7 4 2 10-2 11-8 1-7-5-11-11-9ZM36 26c-6-2-11 2-11 8 0 6 6 12 10 10 4 2 10-2 11-8 2-7-4-12-10-10Z" fill="currentColor"/><path d="M7 36c0-2 2-3 4-3m19-1c0-2 2-3 4-3" stroke="#fff5e8" stroke-width="1.7" stroke-linecap="round"/></svg>';
export function esc(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function asset(name) {
  return window.SWEETIE_ASSETS?.[name] || "./assets/" + name;
}
export const stepNames = [
  "蛋糕胚",
  "内部夹心",
  "奶油抹面",
  "奶油调色",
  "手作裱花",
  "摆放装饰",
  "写下祝福",
  "包装作品",
];
export const stepIcons = [
  "cake",
  "layers",
  "whisk",
  "palette",
  "pipe",
  "star",
  "pen",
  "box",
];
export const stepEnglish = [
  "Sponge",
  "Filling",
  "Frosting",
  "Mixing",
  "Piping",
  "Toppings",
  "Lettering",
  "Wrapping",
];
export const colors = [
  ["奶油白", "#fff0d6"],
  ["草莓牛奶", "#eda9b5"],
  ["香芋紫", "#c8b4d7"],
  ["伯爵奶茶", "#ccaa8c"],
  ["开心果", "#aaba88"],
  ["樱桃红", "#a34756"],
  ["海盐蓝", "#a8cbd6"],
];
export const stepsTips = [
  "选一个形状，决定这块蛋糕的尺寸和口味。",
  "揭开一层蛋糕胚，铺奶油，挑选切好的果肉。",
  "蘸取一刀奶油，在胚面慢慢抹开，再用「收平」理顺刀痕。",
  "选一碗底色，调好深浅，再把不同颜色叠在一起。",
  "轻点挤出一朵奶油花，沿表面拖动可以连续裱花。",
  "选好材料和切法，点蛋糕摆放；拖动已放好的材料调整位置。",
  "把名字或一句悄悄话，写在蛋糕上。",
  "搭配底托、缎带和贺卡，准备拍一张成品照。",
];
