

export enum Realm {
  PhamNhan = "Phàm Nhân",
  LuanHai = "Luân Hải Bí Cảnh",
  DaoCung = "Đạo Cung Bí Cảnh",
  TuCuc = "Tứ Cực Bí Cảnh",
  HoaLong = "Hóa Long Bí Cảnh",
  TienDai = "Tiên Đài Bí Cảnh",
  ChuanDe = "Chuẩn Đế",
  DaiDeHongTranTien = "Đại Đế / Hồng Trần Tiên",
}

export const RealmStages: Record<Realm, string[]> = {
  [Realm.PhamNhan]: ["Người Thường"],
  [Realm.LuanHai]: ["Khổ Hải", "Mệnh Tuyền", "Thần Kiều", "Bỉ Ngạn"],
  [Realm.DaoCung]: ["Tu Luyện Tâm", "Tu Luyện Can", "Tu Luyện Tỳ", "Tu Luyện Phế", "Tu Luyện Thận"],
  [Realm.TuCuc]: ["Tu Luyện Tứ Chi - Đông", "Tu Luyện Tứ Chi - Tây", "Tu Luyện Tứ Chi - Nam", "Tu Luyện Tứ Chi - Bắc"],
  [Realm.HoaLong]: Array.from({ length: 9 }, (_, i) => `Hóa Long Biến ${i + 1}`),
  [Realm.TienDai]: Array.from({ length: 6 }, (_, i) => `Tiên Đài Tầng ${i + 1}`),
  [Realm.ChuanDe]: Array.from({ length: 9 }, (_, i) => `Chuẩn Đế Cửu Trọng Thiên ${i + 1}`),
  [Realm.DaiDeHongTranTien]: ["Đại Đế", "Hồng Trần Tiên"],
};

export const OrderedRealms: Realm[] = [
  Realm.PhamNhan,
  Realm.LuanHai,
  Realm.DaoCung,
  Realm.TuCuc,
  Realm.HoaLong,
  Realm.TienDai,
  Realm.ChuanDe,
  Realm.DaiDeHongTranTien,
];

export enum Faction {
  ChuaGiaNhap = "Chưa Gia Nhập",
  // Simplified initial factions - more can be discovered.
  TanTu = "Tán Tu", // Default if not part of anything significant.
  ThonLangDiaPhuong = "Thôn Làng/Địa Phương Nhỏ", // For very early game interactions.
  // Major factions from lore to be discovered much later.
  KimHaDongThien = "Kim Hà Động Thiên",
  NgocDinhDongThien = "Ngọc Đỉnh Động Thiên",
  YenHaDongThien = "Yên Hà Động Thiên",
  TuDuongDongThien = "Tử Dương Động Thiên",
  TichNguyetDongThien = "Tịch Nguyệt Động Thiên",
  LinhKhuDongThien = "Linh Khư Động Thiên",
  CoGia = "Cơ Gia",
  KhuongGia = "Khương Gia",
  // Factions for the "Post-Heavenly Emperor Era"
  ThienDinh = "Thiên Đình",
  ThienDeThanhDia = "Thiên Đế Thánh Địa",
  LienMinhVuTru = "Liên Minh Vũ Trụ",
}

export const AllFactions: Faction[] = Object.values(Faction);


export interface Character {
  name: string;
  age: number;
  personality: string;
  interests: string;
  realm: Realm;
  stage: string;
  faction: Faction;
  location: string;
}

export interface StoryChapter {
  chapterNumber: number;
  title: string; // AI will generate this, so it's mandatory
  content: string;
}

export enum GamePhase {
  ApiKeyInput, 
  SettingsSetup, 
  Playing,
  Ended,
}

export interface CharacterSettings {
  name: string;
  age: number;
  initialLocation: string;
  personality: string;
  interests: string;
}

// Represents a short description of a key plot point
export type KeyStoryEvent = string;