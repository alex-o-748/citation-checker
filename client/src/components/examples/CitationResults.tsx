import CitationResults, { type CitationResult } from '../CitationResults';

const mockResults: CitationResult[] = [
  {
    id: 1,
    citationNumber: "14",
    wikipediaClaim: "The Great Wall of China is approximately 21,196 kilometers long.",
    verdict: "SUPPORTED",
    supportScore: 95,
    reasoning: "The source states the same figure the claim gives.",
    sourceExcerpt: "the total length of the Great Wall, including all branches and sections, measures 21,196.18 km (13,170.70 mi)",
    quoteStatus: "normalized",
  },
  {
    id: 2,
    citationNumber: "15",
    wikipediaClaim: "Construction began in the 7th century BC.",
    verdict: "PARTIALLY SUPPORTED",
    supportScore: 65,
    reasoning: "The source confirms early construction but does not give the 7th century BC.",
    sourceExcerpt: "Early wall segments were built by various states during the Warring States period.",
    quoteStatus: "exact",
  },
  {
    id: 3,
    citationNumber: "16",
    wikipediaClaim: "The wall is visible from the Moon with the naked eye.",
    verdict: "NOT SUPPORTED",
    supportScore: 5,
    reasoning: "The source directly contradicts the claim.",
    sourceExcerpt: "No human-made structure is visible from the Moon without magnification.",
    quoteStatus: "exact",
  },
];

export default function CitationResultsExample() {
  return (
    <div className="p-6">
      <CitationResults results={mockResults} sourceIdentifier="great-wall-survey" />
    </div>
  );
}
