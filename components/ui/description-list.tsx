interface DescriptionListProps {
  term: string;
  detail: string;
}

const DescriptionList = ({ term, detail }: DescriptionListProps) => {
  return (
    <dl className="flex items-center gap-2">
      <dt className="font-bold">{term}:</dt>
      <dd className="lowercase">{detail}</dd>
    </dl>
  );
};

export default DescriptionList;
