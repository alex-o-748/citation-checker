import CitationInputForm from '../CitationInputForm';

export default function CitationInputFormExample() {
  return (
    <div className="p-6">
      <CitationInputForm
        onSubmit={(data) => console.log('Form submitted:', data)}
        isLoading={false}
      />
    </div>
  );
}
