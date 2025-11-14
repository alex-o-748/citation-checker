import CitationCard from '../CitationCard';

export default function CitationCardExample() {
  return (
    <div className="space-y-4 p-6">
      <CitationCard
        citationNumber={1}
        wikipediaClaim="The Great Wall of China is approximately 21,196 kilometers long."
        sourceExcerpt="Recent archaeological surveys have determined that the total length of the Great Wall, including all branches and sections, measures 21,196.18 km (13,170.70 mi)."
        confidence={95}
        supportStatus="supported"
      />
      <CitationCard
        citationNumber={2}
        wikipediaClaim="Construction began in the 7th century BC."
        sourceExcerpt="Early wall segments were built by various states during the Warring States period, with major construction occurring around the 3rd century BC under Emperor Qin."
        confidence={65}
        supportStatus="partially_supported"
      />
      <CitationCard
        citationNumber={3}
        wikipediaClaim="The wall is visible from space with the naked eye."
        sourceExcerpt="Contrary to popular belief, the Great Wall is not visible from space without aid. Astronauts have confirmed this myth is false."
        confidence={15}
        supportStatus="not_supported"
      />
    </div>
  );
}
