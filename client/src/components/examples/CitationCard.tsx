import CitationCard from '../CitationCard';

export default function CitationCardExample() {
  return (
    <div className="space-y-4 p-6">
      <CitationCard
        citationNumber="1"
        wikipediaClaim="The Great Wall of China is approximately 21,196 kilometers long."
        sourceExcerpt="the total length of the Great Wall, including all branches and sections, measures 21,196.18 km (13,170.70 mi)"
        verdict="SUPPORTED"
        supportScore={95}
        reasoning="The source states the same figure the claim gives."
      />
      <CitationCard
        citationNumber="2"
        wikipediaClaim="Construction began in the 7th century BC."
        sourceExcerpt="Early wall segments were built by various states during the Warring States period."
        verdict="PARTIALLY SUPPORTED"
        supportScore={65}
        reasoning="The source confirms early construction but does not give the 7th century BC."
      />
      <CitationCard
        citationNumber="3"
        wikipediaClaim="The wall is visible from the Moon with the naked eye."
        sourceExcerpt="No human-made structure is visible from the Moon without magnification."
        verdict="NOT SUPPORTED"
        supportScore={5}
        reasoning="The source directly contradicts the claim."
      />
      <CitationCard
        citationNumber="4"
        wikipediaClaim="The wall was restored in 1957."
        // An unlocated quote renders nothing rather than showing model prose.
        sourceExcerpt=""
        verdict="SOURCE UNAVAILABLE"
        supportScore={0}
        reasoning="The page returned a login wall rather than article content."
      />
    </div>
  );
}
