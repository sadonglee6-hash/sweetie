import { create } from "zustand";
import { readLocal, writeLocal } from "../src/storage.js";
export type Room = "street" | "lobby" | "gallery" | "workshop" | "album";
export const art = (path: string) => "./assets/" + path + ".webp";
export const scenes = {
  street: "storefront",
  lobby: "interior",
  gallery: "cake-gallery",
  workshop: "workshop",
  album: "interior",
};
const aliases: Record<string, Room> = {
  home: "street",
  edit: "workshop",
  library: "album",
  journal: "gallery",
};
export function route(): Room {
  const part = location.hash.slice(1).split("/")[0];
  return Object.hasOwn(scenes, part)
    ? (part as Room)
    : aliases[part] || "street";
}
export function go(s: Room) {
  location.hash = s;
}
export const occasions = [
  {
    name: "送给自己的小礼物",
    line: "那就做一个只属于你的蛋糕吧。生活不一定要有什么特别的理由，才值得被庆祝呀。",
    look: "温柔心形",
    shape: "heart",
    tint: "奶油白与玫瑰粉",
    color: "#f0c2c3",
    size: 4,
    decor: "一朵小雏菊",
    wish: "亲爱的我，今天也很棒",
    face: "serene",
  },
  {
    name: "送给朋友的生日蛋糕",
    line: "那我来帮你留一块插蜡烛的地方。朋友许愿的时候，你一定也会笑吧！",
    look: "鲜果庆生",
    shape: "round",
    tint: "草莓红与香草白",
    color: "#fff1dd",
    size: 6,
    decor: "草莓和数字插牌",
    wish: "生日快乐，好朋友",
    face: "happy",
  },
  {
    name: "送给喜欢的人",
    line: "原来是这样呀。把想说的话藏进蛋糕里，切开的时候就会被发现。",
    look: "复古爱心",
    shape: "heart",
    tint: "豆沙粉与酒红",
    color: "#dfabb1",
    size: 6,
    decor: "缎带蝴蝶结",
    wish: "遇见你，真好",
    face: "shy",
  },
  {
    name: "庆祝某个特别的日子",
    line: "这样的日子值得认真记下来。把日期写在蛋糕上，以后看到照片也能想起来。",
    look: "花园庆典",
    shape: "flower",
    tint: "象牙白与叶绿",
    color: "#f7e7c9",
    size: 8,
    decor: "奶油花冠",
    wish: "纪念这一天",
    face: "surprise",
  },
  {
    name: "没有特别的理由，只想做个漂亮蛋糕",
    line: "我喜欢这个理由！今天的配方就跟着你的心情走，好不好？",
    look: "自由花园",
    shape: "oval",
    tint: "浅紫与海盐蓝",
    color: "#cab4d4",
    size: 6,
    decor: "紫罗兰与糖珠",
    wish: "给平凡的一天，加一点甜",
    face: "smile",
  },
];
type History = { who: string; text: string };
interface Memory {
  visited: boolean;
  occasion: number | null;
  companion: boolean;
  read: string[];
  history: History[];
  favorites: number[];
}
const seed: Memory = {
  visited: false,
  occasion: null,
  companion: true,
  read: [],
  history: [],
  favorites: [],
};
const memory: Memory = { ...seed, ...readLocal("letter.v1", {}) };
export const useGame = create<
  Memory & {
    patch: (v: Partial<Memory>) => void;
    note: (id: string, text: string, who?: string) => void;
  }
>((set, get) => ({
  ...memory,
  patch(v) {
    Object.assign(memory, v);
    writeLocal("letter.v1", memory);
    set(v);
  },
  note(id, text, who = "Mia") {
    const s = get();
    s.patch({
      read: [...new Set([...s.read, id])],
      history: [...s.history, { who, text }].slice(-120),
    });
  },
}));
export const workPayload = { value: null as any };
export function startWork(data: any) {
  workPayload.value = data;
  go("workshop");
}
