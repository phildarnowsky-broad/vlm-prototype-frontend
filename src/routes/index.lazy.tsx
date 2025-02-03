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

// Temporary mock for fetch until API is ready to test against

const MOCK_API_RESPONSE = `
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "meta": {
        "apiVersion": "v2.0",
        "beaconId": "org.example.beacon.v2",
        "receivedRequestSummary": {
            "apiVersion": "2.0",
            "pagination": {
                "limit": 10,
                "skip": 0
            },
            "requestedSchemas": [
                {
                    "entityType": "EntryTypeB",
                    "schema": "entry-typeB-schema-v1.0"
                }
            ]
        },
        "returnedSchemas": [
            {
                "entityType": "EntryTypeB",
                "schema": "entry-typeB-schema-v1.0"
            }
        ]
    },
    "responseSummary": {
        "exists": true
    },
    "resultSets": [
        {
            "exists": true,
            "id": "node1",
            "results": [
                {
                    "id": "BEex1",
                    "name": "Basic Element example one"
                }
            ],
            "resultsCount": 1,
            "type": "dataset",
	    "info": {
	        "ac": 123,
		"phenotype": "phenotype1"
	    }
        },
        {
            "exists": true,
            "id": "node3",
            "results": [
                {
                    "id": "BEex1",
                    "name": "Basic Element example one"
                }
            ],
            "resultsCount": 1,
            "type": "dataset",
	    "info": {
	        "ac": 456,
		"phenotype": "phenotype2"
	    }

        },
	{
            "exists": true,
            "id": "node4",
            "results": [
                {
                    "id": "BEex1",
                    "name": "Basic Element example one"
                }
            ],
            "resultsCount": 1,
            "type": "dataset",
	    "info": {
	        "ac": 789,
		"phenotype": "phenotype3"
	    }
        }
    ]
}
`;

const fakeFetch: typeof fetch = (_input, _init) => {
  const response = new Response(MOCK_API_RESPONSE, {
    status: 200,
    statusText: "OK",
  });

  return new Promise((resolve) => resolve(response));
};

async function fetchVariant(): Promise<VariationSearchResults> {
  return fakeFetch("fake_endpoint", {}).then((response) => {
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
  const queryInProgress = queryClient.isFetching() > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-10 flex flex-col justify-center items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!queryInProgress) {
              setApiParams(mockApiParams);
            }
          }}
        >
          <input
            className="border mr-5 p-3"
            placeholder="Variant ID"
            type="text"
          />
          <button
            className="bg-cyan-200 p-2 border-1 rounded-full"
            disabled={queryInProgress}
          >
            Search
          </button>
        </form>
        {apiParams && <SearchResults apiParams={apiParams} />}
      </div>
    </QueryClientProvider>
  );
}
