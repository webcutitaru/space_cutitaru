export { analyzeEtsyHtml } from "./parser/analyze";
export type { ListingReport } from "./types/listing";
export type {
  DiscoveredSignal,
  KeywordCandidate,
  KnownSignals,
} from "./types/listing";
export {
  buildBenchmarkInsight,
  buildTagFrequency,
  scoreListing,
  strengthLabelRo,
} from "./insight";
export type {
  BenchmarkInsight,
  BenchmarkRange,
  FrequencyGroup,
  ListingScore,
  RangeBarItem,
  ScoreSeriesItem,
  StrengthLabel,
  TagFrequencyItem,
  TagPresenceItem,
  TagSuggestions,
} from "./insight";
