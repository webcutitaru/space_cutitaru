export { analyzeEtsyHtml } from "./parser/analyze";
export type { ListingReport } from "./types/listing";
export type {
  DiscoveredSignal,
  KeywordCandidate,
  KnownSignals,
} from "./types/listing";
export {
  buildBenchmarkInsight,
  scoreListing,
  strengthLabelRo,
} from "./insight";
export type {
  BenchmarkInsight,
  BenchmarkRange,
  ListingScore,
  StrengthLabel,
} from "./insight";
