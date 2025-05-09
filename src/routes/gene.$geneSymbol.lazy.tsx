import React from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import useDefaultQuery from "../hooks/useDefaultQuery";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchResults, {
  parseVariantResults,
  VariantResultJson,
  VariantSearchResults,
} from "../components/SearchResults";
import { RegionViewer, PositionAxisTrack } from "@gnomad/region-viewer";
// @ts-ignore (we don't care about missing declarations and skipLibCheck is not working for whatever reason)
import { RegionsTrack } from "@gnomad/track-regions";

const GENE_ENDPOINT = "http://localhost:8000/gene/";

type Exon = {
  start: number;
  stop: number;
  feature_type: string;
};

type GeneResultSet = {
  geneSymbol: string;
  variants: VariantSearchResults;
  exons: Exon[];
};

interface GeneResultJson {
  info: {
    gene_symbol: string;
    variants: VariantResultJson[];
    exons: Exon[];
  };
}

interface GeneResultsJson {
  exists: boolean;
  resultSets: GeneResultJson[];
}

type GeneResponseWithResults = {
  resultSets: GeneResultSet[];
};

function parseGeneResultSet(json: GeneResultJson): GeneResultSet {
  const { info } = json;
  const variants = parseVariantResults(info.variants);
  return { geneSymbol: info.gene_symbol, variants, exons: info.exons };
}

function parseGeneResponse(json: GeneResultsJson): GeneResponseWithResults {
  if (json.exists === false) {
    return { resultSets: [] };
  }
  const resultSets = json.resultSets.map(parseGeneResultSet);
  return { resultSets };
}

async function fetchGene(variantId: string): Promise<GeneResponseWithResults> {
  return fetch(GENE_ENDPOINT + variantId, {})
    .then((response) => {
      return response.json();
    })
    .then((json) => parseGeneResponse(json));
}

type GeneSearchResultsProps = {
  resultSets: GeneResultSet[];
  geneSymbol: string;
};

function GeneSearchResults({ resultSets, geneSymbol }: GeneSearchResultsProps) {
  if (resultSets.length === 0) {
    return (
      <div className="col-span-12 text-center">
        No gene with symbol <span className="font-bold">{geneSymbol}</span> was
        found.
      </div>
    );
  }
  const resultSet = resultSets[0];
  const { variants, exons } = resultSet;
  const codingExons = exons.filter((exon) => exon.feature_type === "CDS");

  return (
    <>
      <div className="col-start-4 col-span-9 text-center text-xl">
        {exons.length > 1 && (
          <>
            <div className="mb-5">
              Coding exons for gene{" "}
              <span className="font-bold">{geneSymbol}</span>
            </div>
            <RegionViewer
              leftPanelWidth={0}
              rightPanelWidth={0}
              width={800}
              regions={exons}
            >
              <RegionsTrack regions={codingExons} height={10} />
              <div className="mt-2">
                <PositionAxisTrack />
              </div>
            </RegionViewer>
          </>
        )}

        <div className="mt-5">
          Variants for gene <span className="font-bold">{geneSymbol}</span>
        </div>
      </div>
      <SearchResults resultSets={variants.resultSets} />
    </>
  );
}

function GeneSearch({ geneSymbol }: { geneSymbol: string }) {
  const normalizedGeneSymbol = geneSymbol.toUpperCase().trim();
  const query = useDefaultQuery({
    queryKey: ["gene", normalizedGeneSymbol],
    queryFn: () => fetchGene(normalizedGeneSymbol),
  });

  if (query.isPending) {
    return (
      <div className="col-span-12 text-center">
        Searching for {normalizedGeneSymbol}...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="col-span-12 text-center">
        There was an error looking up gene {normalizedGeneSymbol}, please try
        again later.
      </div>
    );
  }

  const { resultSets } = query.data as GeneResponseWithResults;

  return (
    <>
      <GeneSearchResults
        resultSets={resultSets}
        geneSymbol={normalizedGeneSymbol}
      />
    </>
  );
}

const GeneResults = () => {
  const { geneSymbol } = Route.useParams();
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="grid grid-cols-12 gap-x-20 gap-y-4 pt-4 ps-8 pe-8">
        <GeneSearch geneSymbol={geneSymbol} />
      </div>{" "}
    </QueryClientProvider>
  );
};

export const Route = createLazyFileRoute("/gene/$geneSymbol")({
  component: GeneResults,
});
