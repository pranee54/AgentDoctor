/**
 * Path Resolution Engine — shared path reference preparation/resolution.
 * Stage 1 exports preparation only; later stages extend this surface.
 */

export {
  isConcretePathReference,
  normalizePathReference,
  preparePathReference,
  type PathConcreteRejectReason,
  type PreparedPathReference,
} from "./prepare.js";
