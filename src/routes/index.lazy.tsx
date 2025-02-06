import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";

type ApiParams = {
  assembly: "GRCh37" | "GRCh38";
  chrom: number | "X" | "Y";
  pos: number;
  ref: string;
  alt: string;
  beacon: string[];
};

interface ResultSet {
  id: string;
  info: {
    ac: number;
    phenotype: string;
  };
}

interface VariationSearchResults {
  resultSets: ResultSet[];
}

export const Route = createLazyFileRoute("/")({
  component: Index,
});

const nodeNames: Record<string, string> = {
  node1: "Node 1",
  node2: "Node 2",
  node3: "Node 3",
  node4: "Node 4",
  node5: "Node 5",
  node6: "Node 6",
};
const nodeIds = Object.keys(nodeNames);

function nodeName(id: string) {
  return nodeNames[id] ?? id;
}

const VARIANT_ENDPOINT = "http://localhost:8000/variant/";

async function fetchVariant(): Promise<VariationSearchResults> {
  return fetch(VARIANT_ENDPOINT + "13-42298583-A-G", {}).then((response) => {
    return response.json();
  });
}

function ResultItem({ resultSet }: { resultSet: ResultSet }) {
  return (
    <div>
      <span className="font-bold">{nodeName(resultSet.id)}:</span> AC{" "}
      {resultSet.info.ac}, phenotype {resultSet.info.phenotype}
    </div>
  );
}

function SearchResults({ apiParams }: { apiParams: ApiParams }) {
  const normalizedParams = {
    ...apiParams,
    beacon: [...apiParams.beacon].sort(),
  };
  const query = useQuery({
    queryKey: ["variant", normalizedParams],
    queryFn: fetchVariant,
    // tanstack-query is pretty aggressive by default about refetching, which
    // is probably good for most applications but isn't appropriate for data
    // that changes as slowly as this data will
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (query.isPending) {
    return <>Pending</>;
  }

  if (query.isError) {
    return <>Error: {JSON.stringify(query.error)}</>;
  }

  const resultSets = query.data.resultSets;
  return (
    <div>
      {resultSets.map((resultSet) => (
        <ResultItem key={resultSet.id} resultSet={resultSet} />
      ))}
    </div>
  );
}

function Index() {
  const mockApiParams = {
    assembly: "GRCh38",
    chrom: 1,
    pos: 55051215,
    ref: "G",
    alt: "GA",
    beacon: nodeIds,
  } as const;
  const [apiParams, setApiParams] = useState<ApiParams | null>(null);

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-10 flex flex-col justify-center items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApiParams(mockApiParams);
          }}
        >
          <input
            className="border mr-5 p-3"
            placeholder="Variant ID"
            type="text"
          />
          <button className="p-2 border-1 rounded-full">Search</button>
        </form>
        {apiParams && <SearchResults apiParams={apiParams} />}
      </div>
    </QueryClientProvider>
  );
}
