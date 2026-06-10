/**
 * Barrel-Export für alle Build-Parser.
 *
 * Importiere aus diesem Modul, um die Parser-Registry,
 * das BuildParser-Interface und alle Parser-Instanzen zu erhalten.
 */

// Registry (zentraler Einstiegspunkt)
export {
  findParser,
  parseBuild,
  getAllParsers,
  isAnyBuildInput,
  isBuildUrl,
} from "./registry";

// Einzelne Parser (für direkten Zugriff, z. B. in Tests)
export { textBuildParser } from "./textBuild";
export { pobCodeParser } from "./pobCode";
export { pobXmlParser } from "./pobXml";
export { maxrollParser } from "./maxroll";
export { mobalyticsParser } from "./mobalytics";
export { genericUrlParser } from "./genericUrl";

// Typen re-exportieren
export type { BuildParser, ParsedBuildResult } from "@/types/parser";
export { emptyBuildResult } from "@/types/parser";