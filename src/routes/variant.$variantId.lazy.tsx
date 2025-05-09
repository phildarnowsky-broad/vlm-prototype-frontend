import React from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useDefaultQuery from "../hooks/useDefaultQuery";
import SearchResults, {
  ResultSet,
  parseVariantResults,
  VariantSearchResults,
  VariantResultsJson,
} from "../components/SearchResults";

export type Association = {
  id: number;
  p_value: number | null;
  phenotype_description: string;
};

interface ResponseWithResults {
  resultSets: ResultSet[];
}

const VARIANT_ENDPOINT = "http://localhost:8000/variant/";

async function fetchVariant(variantId: string): Promise<VariantSearchResults> {
  return fetch(VARIANT_ENDPOINT + variantId, {})
    .then((response) => {
      return response.json();
    })
    .then((json: VariantResultsJson) => parseVariantResults(json.resultSets));
}

function VariantSearch({ searchVariantId }: { searchVariantId: string }) {
  const normalizedVariantId = searchVariantId.toUpperCase().trim();

  const query = useDefaultQuery({
    queryKey: ["variant", normalizedVariantId],
    queryFn: () => fetchVariant(normalizedVariantId),
  });

  if (query.isPending) {
    return (
      <div className="col-span-12 text-center">
        Searching for {normalizedVariantId}...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="col-span-12 text-center">
        There was an error looking up variant {normalizedVariantId}, please try
        again later.
      </div>
    );
  }

  const resultSets = (query.data as ResponseWithResults).resultSets;

  return <SearchResults resultSets={resultSets} />;
}

const VariantResults = () => {
  const { variantId } = Route.useParams();
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="grid grid-cols-12 gap-x-20 pt-4 ps-8 pe-8">
        <VariantSearch searchVariantId={variantId} />
      </div>{" "}
    </QueryClientProvider>
  );
};

export const Route = createLazyFileRoute("/variant/$variantId")({
  component: VariantResults,
});
