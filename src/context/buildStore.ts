/**
 * Globaler Zustand für das Gemmen-System (Zustand).
 *
 * Speichert bis zu 6 gesockelte Gemmen-ID (Slot 0 = aktive Gemme,
 * Slots 1-5 = Support-Gemmen) und erlaubt das Setzen/Leeren einzelner Slots.
 *
 * Erweitert um characterClass (Klasse), selectedPassives (aktive Talente),
 * Build-Metadaten (Name, Autor, Ascendancy, Beschreibung) und Skills-nach-Akt.
 *
 * === Storage-Strategie ===
 * Equipment-Items werden nur als IDs gespeichert, nicht als vollständige Objekte.
 * Bei der Hydration werden die IDs per getItemById() in die Datenbank aufgelöst.
 * Das verhindert Schema-Brüche bei Änderungen an items.ts.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItemById } from "@/data/items";
import type { Item } from "../data/items";
import type { BuildSkill } from "../types/parser";

export type SocketData = string | null;

/**
 * Typ für einen Ausrüstungs-Slot.
 * Jeder Slot kann ein Item oder null (leer) sein.
 */
export type EquipmentSlot = Item | null;

/**
 * Alle verfügbaren Ausrüstungs-Slots eines PoE 2 Charakters.
 */
export type EquipmentSlots = {
  mainHand: EquipmentSlot;
  weapon2: EquipmentSlot;
  offHand: EquipmentSlot;
  chest: EquipmentSlot;
  helmet: EquipmentSlot;
  gloves: EquipmentSlot;
  belt: EquipmentSlot;
  boots: EquipmentSlot;
  ring1: EquipmentSlot;
  ring2: EquipmentSlot;
  amulet: EquipmentSlot;
};

/**
 * Slim-Version von EquipmentSlots mit nur IDs (für localStorage).
 */
export type StoredEquipmentIds = {
  [K in keyof EquipmentSlots]: string | null;
};

export interface SavedBuildData {
  sockets: SocketData[];
  characterClass: string | null;
  selectedPassives: string[];
  equipment: StoredEquipmentIds;
  level?: number;
  buildName?: string;
  author?: string;
  ascendancy?: string;
  description?: string;
  skillsByAct?: BuildSkill[];
}

export interface BuildState {
  /** Array mit 6 Einträgen (null = leer, string = gemId) */
  sockets: SocketData[];
  /** Setzt alle Slots auf einmal */
  setSockets: (sockets: SocketData[]) => void;
  /** Setzt einen einzelnen Slot */
  setSocket: (index: number, gemId: SocketData) => void;
  /** Leert alle Slots */
  clearSockets: () => void;

  // ============ Charakter-Level ============

  /** Charakter-Level (1–100) */
  level: number;
  /** Setzt das Level (wird auf 1–100 geclampt) */
  setLevel: (level: number) => void;

  // ============ Skilltree / Klassen ============

  /** Die gewählte Charakterklasse (null = keine Auswahl) */
  characterClass: string | null;
  /** Setzt die Charakterklasse */
  setClass: (className: string | null) => void;

  /** Array von IDs der aktivierten passiven Talente */
  selectedPassives: string[];
  /** Schaltet ein passives Talent an/aus (toggle) */
  togglePassive: (passiveId: string) => void;
  /** Überschreibt alle passiven Talente auf einmal (für Import) */
  setPassives: (passiveIds: string[]) => void;

  // ============ Ausrüstung / Items ============

  /** Alle Ausrüstungs-Slots (mainHand, offHand, chest, ring1, ring2, amulet) */
  equipment: EquipmentSlots;
  /** Setzt ein Item in einen bestimmten Slot (null zum Leeren) */
  setEquipment: (slot: keyof EquipmentSlots, item: EquipmentSlot) => void;
  /** Leert alle Ausrüstungs-Slots */
  clearEquipment: () => void;
  /** Setzt alle Ausrüstungs-Slots auf einmal (für Import/URL-Load) */
  setAllEquipment: (equipment: EquipmentSlots) => void;

  // ============ Build-Metadaten ============

  /** Build-Name (z. B. "Frostblink Sorc") */
  buildName: string;
  /** Setzt den Build-Namen */
  setBuildName: (name: string) => void;
  /** Autor des Builds */
  author: string;
  /** Setzt den Autor */
  setAuthor: (author: string) => void;
  /** Ascendancy-Klasse (englisch, z. B. "Stormweaver") */
  ascendancy: string;
  /** Setzt die Ascendancy */
  setAscendancy: (ascendancy: string) => void;
  /** Kurzbeschreibung des Builds */
  description: string;
  /** Setzt die Beschreibung */
  setDescription: (description: string) => void;

  // ============ Skills nach Akt ============

  /** Skills gruppiert nach Akt (Act I–IV) */
  skillsByAct: BuildSkill[];
  /** Setzt alle Skills-nach-Akt (für Import) */
  setSkillsByAct: (skills: BuildSkill[]) => void;

  // ============ Build zurücksetzen ============

  /** Setzt den gesamten Build zurück (Sockets, Ausrüstung, Talente, Klasse, Metadaten) */
  resetBuild: () => void;

  // ============ Lokale Build-Slots (Browser-Speicher) ============

  /** Gespeicherte Builds (Name -> Build-Daten) */
  savedBuilds: Record<string, SavedBuildData>;
  /** Speichert den aktuellen Build unter einem Namen */
  saveLocalBuild: (name: string) => void;
  /** Lädt einen gespeicherten Build */
  loadLocalBuild: (name: string) => void;
  /** Löscht einen gespeicherten Build */
  deleteLocalBuild: (name: string) => void;
}

const EMPTY_SOCKETS: SocketData[] = [null, null, null, null, null, null];

const EMPTY_EQUIPMENT: EquipmentSlots = {
  mainHand: null,
  weapon2: null,
  offHand: null,
  chest: null,
  helmet: null,
  gloves: null,
  belt: null,
  boots: null,
  ring1: null,
  ring2: null,
  amulet: null,
};

/**
 * Hilfsfunktion: Wandelt EquipmentSlots in ein schlankes StoredEquipmentIds-Objekt um.
 * (nur Item-IDs, keine vollständigen Objekte)
 */
function equipmentToStoredIds(eq: EquipmentSlots): StoredEquipmentIds {
  return {
    mainHand: eq.mainHand?.id ?? null,
    weapon2: eq.weapon2?.id ?? null,
    offHand: eq.offHand?.id ?? null,
    chest: eq.chest?.id ?? null,
    helmet: eq.helmet?.id ?? null,
    gloves: eq.gloves?.id ?? null,
    belt: eq.belt?.id ?? null,
    boots: eq.boots?.id ?? null,
    ring1: eq.ring1?.id ?? null,
    ring2: eq.ring2?.id ?? null,
    amulet: eq.amulet?.id ?? null,
  };
}

/**
 * Hilfsfunktion: Löst ein StoredEquipmentIds-Objekt zurück in EquipmentSlots auf.
 * Unbekannte IDs werden als null behandelt (Schema-Sicherheit).
 */
function storedIdsToEquipment(ids: StoredEquipmentIds): EquipmentSlots {
  const lookup = (id: string | null) => (id ? getItemById(id) ?? null : null);
  return {
    mainHand: lookup(ids.mainHand),
    weapon2: lookup(ids.weapon2),
    offHand: lookup(ids.offHand),
    chest: lookup(ids.chest),
    helmet: lookup(ids.helmet),
    gloves: lookup(ids.gloves),
    belt: lookup(ids.belt),
    boots: lookup(ids.boots),
    ring1: lookup(ids.ring1),
    ring2: lookup(ids.ring2),
    amulet: lookup(ids.amulet),
  };
}

/**
 * Validiert und bereinigt savedBuilds rekursiv, damit wirklich nur
 * Item-IDs (StoredEquipmentIds) und keine vollen Item-Objekte
 * persistiert werden. Verhindert Korruption des LocalStorage
 * bei zukünftigen Schema-Änderungen.
 */
function sanitizeSavedBuilds(
  savedBuilds: Record<string, SavedBuildData>
): Record<string, SavedBuildData> {
  const sanitized: Record<string, SavedBuildData> = {};
  for (const [name, build] of Object.entries(savedBuilds)) {
    if (!build || typeof build !== "object") continue;
    sanitized[name] = {
      sockets: Array.isArray(build.sockets)
        ? build.sockets.map((s) => (typeof s === "string" ? s : null))
        : [],
      characterClass:
        typeof build.characterClass === "string" ? build.characterClass : null,
      selectedPassives: Array.isArray(build.selectedPassives)
        ? build.selectedPassives.filter(
            (id: unknown): id is string => typeof id === "string"
          )
        : [],
      equipment: sanitizeEquipmentIds(build.equipment),
      level:
        typeof build.level === "number" && build.level >= 1 && build.level <= 100
          ? build.level
          : undefined,
      buildName: typeof build.buildName === "string" ? build.buildName : undefined,
      author: typeof build.author === "string" ? build.author : undefined,
      ascendancy: typeof build.ascendancy === "string" ? build.ascendancy : undefined,
      description: typeof build.description === "string" ? build.description : undefined,
      skillsByAct: Array.isArray(build.skillsByAct)
        ? build.skillsByAct.filter(
            (s): s is BuildSkill =>
              typeof s === "object" && s !== null &&
              typeof s.activeGemId === "string" &&
              Array.isArray(s.supportGemIds)
          )
        : undefined,
    };
  }
  return sanitized;
}

/**
 * Stellt sicher, dass ein equipment-Objekt nur string | null enthält.
 */
function sanitizeEquipmentIds(eq: unknown): StoredEquipmentIds {
  const slots: (keyof EquipmentSlots)[] = [
    "mainHand",
    "weapon2",
    "offHand",
    "chest",
    "helmet",
    "gloves",
    "belt",
    "boots",
    "ring1",
    "ring2",
    "amulet",
  ];
  const result = {} as StoredEquipmentIds;

  if (eq && typeof eq === "object") {
    const obj = eq as Record<string, unknown>;
    for (const slot of slots) {
      const val = obj[slot];
      if (typeof val === "string") {
        result[slot] = val;
      } else if (
        val &&
        typeof val === "object" &&
        typeof (val as Record<string, unknown>).id === "string"
      ) {
        // Volles Item-Objekt → ID extrahieren
        result[slot] = (val as Record<string, unknown>).id as string;
      } else {
        result[slot] = null;
      }
    }
  } else {
    for (const slot of slots) {
      result[slot] = null;
    }
  }

  return result;
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      sockets: [...EMPTY_SOCKETS],

      setSockets: (sockets) =>
        set({
          sockets: sockets.length === 6 ? sockets : [...sockets, ...EMPTY_SOCKETS.slice(sockets.length)],
        }),

      setSocket: (index, gemId) =>
        set((state) => {
          const next = [...state.sockets];
          if (index >= 0 && index < 6) {
            next[index] = gemId;
          }
          return { sockets: next };
        }),

      clearSockets: () => set({ sockets: [...EMPTY_SOCKETS] }),

      // ============ Charakter-Level ============

      level: 1,

      setLevel: (level) => set({ level: Math.min(100, Math.max(1, Math.round(level))) }),

      // ============ Skilltree / Klassen ============

      characterClass: null,

      setClass: (className) => set({ characterClass: className }),

      selectedPassives: [],

      togglePassive: (passiveId) =>
        set((state) => {
          const alreadySelected = state.selectedPassives.includes(passiveId);
          if (alreadySelected) {
            return {
              selectedPassives: state.selectedPassives.filter((id) => id !== passiveId),
            };
          }
          return {
            selectedPassives: [...state.selectedPassives, passiveId],
          };
        }),

      setPassives: (passiveIds) => set({ selectedPassives: passiveIds }),

      // ============ Ausrüstung / Items ============

      equipment: { ...EMPTY_EQUIPMENT },

      setEquipment: (slot, item) =>
        set((state) => ({
          equipment: { ...state.equipment, [slot]: item },
        })),

      clearEquipment: () => set({ equipment: { ...EMPTY_EQUIPMENT } }),

      setAllEquipment: (equipment: EquipmentSlots) => set({ equipment: { ...equipment } }),

      // ============ Build-Metadaten ============

      buildName: "",
      setBuildName: (name) => set({ buildName: name }),

      author: "",
      setAuthor: (author) => set({ author }),

      ascendancy: "",
      setAscendancy: (ascendancy) => set({ ascendancy }),

      description: "",
      setDescription: (description) => set({ description }),

      // ============ Skills nach Akt ============

      skillsByAct: [],
      setSkillsByAct: (skills) => set({ skillsByAct: skills }),

      // ============ Build zurücksetzen ============

      resetBuild: () =>
        set({
          sockets: [...EMPTY_SOCKETS],
          characterClass: null,
          selectedPassives: [],
          equipment: { ...EMPTY_EQUIPMENT },
          level: 1,
          buildName: "",
          author: "",
          ascendancy: "",
          description: "",
          skillsByAct: [],
        }),

      // ============ Lokale Build-Slots ============

      savedBuilds: {},

      saveLocalBuild: (name) =>
        set((state) => {
          const data: SavedBuildData = {
            sockets: [...state.sockets],
            characterClass: state.characterClass,
            selectedPassives: [...state.selectedPassives],
            equipment: equipmentToStoredIds(state.equipment),
            level: state.level,
            buildName: state.buildName,
            author: state.author,
            ascendancy: state.ascendancy,
            description: state.description,
            skillsByAct: [...state.skillsByAct],
          };
          const next = { ...state.savedBuilds, [name]: data };
          // Enforce maximal 5 Build-Slots (defensiv, UI zeigt 3)
          const entries = Object.entries(next);
          if (entries.length > 5) {
            delete next[entries[0][0]];
          }
          return { savedBuilds: next };
        }),

      loadLocalBuild: (name) =>
        set((state) => {
          const data = state.savedBuilds[name];
          if (!data) return state;
          return {
            sockets: [...data.sockets, ...EMPTY_SOCKETS].slice(0, 6),
            characterClass: data.characterClass,
            selectedPassives: [...data.selectedPassives],
            equipment: storedIdsToEquipment(data.equipment),
            level: data.level ?? state.level,
            buildName: data.buildName ?? "",
            author: data.author ?? "",
            ascendancy: data.ascendancy ?? "",
            description: data.description ?? "",
            skillsByAct: data.skillsByAct ?? [],
          };
        }),

      deleteLocalBuild: (name) =>
        set((state) => {
          const next = { ...state.savedBuilds };
          delete next[name];
          return { savedBuilds: next };
        }),
    }),

    {
      name: "poe2-build-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 4,

      /**
       * partialize: Wird VOR dem Speichern aufgerufen.
       * Wandelt die komplettem Item-Objekte in schlanke ID-Strukturen um.
       */
      partialize: (state) => ({
        sockets: state.sockets,
        characterClass: state.characterClass,
        selectedPassives: state.selectedPassives,
        equipment: equipmentToStoredIds(state.equipment),
        savedBuilds: sanitizeSavedBuilds(state.savedBuilds),
        level: state.level,
        buildName: state.buildName,
        author: state.author,
        ascendancy: state.ascendancy,
        description: state.description,
        skillsByAct: state.skillsByAct,
      }),

      /**
       * merge: Wird NACH dem Laden aus localStorage aufgerufen.
       * Löst die gespeicherten Item-IDs wieder zu vollständigen Item-Objekten auf.
       * Handhabt sowohl das neue Format (v3, IDs) als auch das alte Format (v2, Objekte).
       */
      merge: (persisted: unknown, current: Partial<BuildState>): BuildState => {
        const stored = persisted as Record<string, unknown>;

        // Neue Standard-Werte aus der Store-Definition übernehmen
        const result = { ...current } as BuildState;

        // Einfache Felder direkt übernehmen
        if (typeof stored.characterClass === "string" || stored.characterClass === null) {
          result.characterClass = stored.characterClass;
        }
        if (Array.isArray(stored.sockets)) {
          // Auf 6 Slots begrenzen
          result.sockets = [...stored.sockets.slice(0, 6), ...EMPTY_SOCKETS].slice(0, 6);
        }
        if (Array.isArray(stored.selectedPassives)) {
          result.selectedPassives = stored.selectedPassives.filter(
            (id: unknown): id is string => typeof id === "string"
          );
        }

        // Build-Metadaten wiederherstellen
        if (typeof stored.buildName === "string") result.buildName = stored.buildName;
        if (typeof stored.author === "string") result.author = stored.author;
        if (typeof stored.ascendancy === "string") result.ascendancy = stored.ascendancy;
        if (typeof stored.description === "string") result.description = stored.description;

        // SkillsByAct wiederherstellen
        if (Array.isArray(stored.skillsByAct)) {
          result.skillsByAct = stored.skillsByAct.filter(
            (s: unknown): s is BuildSkill =>
              typeof s === "object" && s !== null &&
              typeof (s as BuildSkill).activeGemId === "string" &&
              Array.isArray((s as BuildSkill).supportGemIds)
          );
        }

        // Equipment auflösen – verschiedene Formate unterstützen
        const storedEquipment = stored.equipment as Record<string, unknown> | undefined;
        if (storedEquipment) {
          const resolved: EquipmentSlots = { ...EMPTY_EQUIPMENT };

          for (const [slot, value] of Object.entries(storedEquipment)) {
            const slotKey = slot as keyof EquipmentSlots;
            if (value === null || value === undefined) continue;

            if (typeof value === "string") {
              // Neues Format (v3): Item-ID
              const item = getItemById(value);
              if (item) resolved[slotKey] = item;
            } else if (typeof value === "object") {
              // Altes Format (v2): Vollständiges Item-Objekt – nach ID auflösen
              const obj = value as Record<string, unknown>;
              const id = typeof obj.id === "string" ? obj.id : null;
              if (id) {
                const item = getItemById(id);
                if (item) resolved[slotKey] = item;
              }
            }
          }

          result.equipment = resolved;
        }

        // Level wiederherstellen
        if (typeof stored.level === "number" && stored.level >= 1 && stored.level <= 100) {
          result.level = stored.level;
        }

        // savedBuilds wiederherstellen
        if (stored.savedBuilds && typeof stored.savedBuilds === "object") {
          result.savedBuilds = stored.savedBuilds as Record<string, SavedBuildData>;
        }

        return result;
      },

    },
  ),
);
