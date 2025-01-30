import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

type ApiParams = {
  assembly: "GRCh37" | "GRCh38";
  chrom: number | "X" | "Y";
  pos: number;
  ref: string;
  alt: string;
  beacon: string[];
};

interface VariationSearchResults {}

export const Route = createLazyFileRoute("/")({
  component: Index,
});

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

function fetchVariant(): Promise<VariationSearchResults> {
  return fakeFetch("fake_endpoint", {}).then((response) => {
    return response.json();
  });
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

  return <pre>{JSON.stringify(query.data)}</pre>;
}

function Index() {
  const apiParams: ApiParams = {
    assembly: "GRCh38",
    chrom: 1,
    pos: 55051215,
    ref: "G",
    alt: "GA",
    beacon: [],
  };

  const queryClient = new QueryClient();

  return apiParams ? (
    <QueryClientProvider client={queryClient}>
      <SearchResults apiParams={apiParams} />
    </QueryClientProvider>
  ) : (
    <>"input field here"</>
  );
}
