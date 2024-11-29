import { groupByAnalytics } from "@/lib/utils";

interface AnalyticsDataListProps {
  data: AnalyticsDataWithSessionData[];
  groupBy: AnalyticsGroupBy;
}

const AnalyticsDataList = ({ data, groupBy }: AnalyticsDataListProps) => {
  const groupedData = groupByAnalytics(groupBy, data);

  return (
    <div className="pt-2 px-4 md:px-8 md:pt-4 text-sm md:text-base">
      <div className="flex justify-between items-center font-medium">
        <span>
          {groupBy.slice(0, 1).toUpperCase() +
            groupBy.slice(1).split("_").join(" ")}
        </span>
        <span>Visits</span>
      </div>
      <hr className="border-t border-stone-800 my-4" />
      {groupedData.length ? (
        <div>
          {groupedData.map((item) => (
            <div
              key={item.group}
              className="flex justify-between items-center mt-4 text-xs md:text-sm text-muted-foreground"
            >
              <span>{item.group}</span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AnalyticsDataList;
