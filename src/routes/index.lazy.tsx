import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React, { useState } from "react";

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

function nodeName(id: string) {
  return nodeNames[id] ?? id;
}

const VARIANT_ENDPOINT = "http://localhost:8000/variant/";

async function fetchVariant(
  variantId: string
): Promise<VariationSearchResults> {
  return fetch(VARIANT_ENDPOINT + variantId, {}).then((response) => {
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

function SearchResults({ searchVariantId }: { searchVariantId: string }) {
  const query = useQuery({
    queryKey: ["variant", searchVariantId],
    queryFn: () => fetchVariant(searchVariantId),
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

// Workaround for the fact that the TS type for HTMLFormControlsCollection
// doesn't allow for string indexing, although that's valid according to the
// DOM API.

interface FormElements extends HTMLFormControlsCollection {
  "variant-id": HTMLInputElement;
}

function Index() {
  const [searchVariantId, setSearchVariantId] = useState<string | null>(null);

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-10 flex flex-col justify-center items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formElements = e.currentTarget.elements as FormElements;
            const newVariantId = formElements["variant-id"].value;
            setSearchVariantId(newVariantId);
          }}
        >
          <input
            className="border mr-5 p-3"
            placeholder="Variant ID"
            type="text"
            name="variant-id"
          />
          <button className="p-2 border-1 rounded-full">Search</button>
        </form>
        {searchVariantId && <SearchResults searchVariantId={searchVariantId} />}
      </div>
    </QueryClientProvider>
  );
}
