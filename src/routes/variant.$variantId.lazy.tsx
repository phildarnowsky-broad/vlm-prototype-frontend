import React, { Dispatch, SetStateAction, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

type Association = {
  id: number;
  p_value: number | null;
  phenotype_description: string;
};

interface ResultSet {
  variantId: string;
  peerNodeId: string;
  associations: Association[];
  ac: number;
  consequence: string;
}

interface VariationSearchResults {
  resultSets: ResultSet[];
}

type NodeMetadata = {
  nodeName?: string;
  hostingInstitutionName?: string;
};

type NodeId = string;

// TODO: better way to get these than via hardcoded peer IDs
const nodeMetadata: Record<NodeId, NodeMetadata> = {
  "1": { nodeName: "gnomAD", hostingInstitutionName: "Broad Institute" },
  "2": {
    nodeName: "Autism Sequencing Consortium",
    hostingInstitutionName: "Broad Institute",
  },
  "3": {
    nodeName: "BipEx",
    hostingInstitutionName: "Broad Institute",
  },
  "4": {
    nodeName: "Epi25",
    hostingInstitutionName: "Epi25 Collaborative",
  },
  "5": {
    nodeName: "Schema",
    hostingInstitutionName: "Broad Institute",
  },
};

function nodeName(id: string): string {
  return nodeMetadata[id]?.nodeName ?? `Peer ${id}`;
}

const nodeIdsInNodenameOrder: NodeId[] = Object.keys(nodeMetadata).sort(
  (nodeId1, nodeId2) => nodeName(nodeId1).localeCompare(nodeName(nodeId2))
);

const VARIANT_ENDPOINT = "http://localhost:8000/variant/";

interface VariantResultJson {
  resultSets: {
    id: string;
    results: { id: string }[];
    info: {
      ac: number;
      consequence: string;
      associations: Association[];
    };
  }[];
}

const CONSEQUENCE_TRANSLATIONS: Record<string, string> = {
  "3_prime_UTR_variant": "3' UTR variant",
  "5_prime_UTR_variant": "5' UTR variant",
  "missense_variant_mpc_<2": "Missense variant (MPC < 2)",
  "missense_variant_mpc_2-3": "Missense variant (2 <= MPC < 3)",
  "missense_variant_mpc_>=3": "Missense variant (MPC > 3)",
  NA: "N/A",
  non_coding: "Non-coding",
  non_coding_transcript_exon_variant: "Non-coding transcript exon variant",
  pLof: "pLoF",
  ptv: "PTV",
} as const;

function prettyConsequence(rawConsequence: string): string {
  if (CONSEQUENCE_TRANSLATIONS[rawConsequence]) {
    return CONSEQUENCE_TRANSLATIONS[rawConsequence];
  }

  const [firstWord, ...remainingWords] = rawConsequence.split("_");
  const firstWordUppercased =
    firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  return [firstWordUppercased, ...remainingWords].join(" ");
}

function parseVariantResult(json: VariantResultJson): VariationSearchResults {
  return {
    resultSets: json.resultSets.map((jsonResultSet) => {
      return {
        variantId: jsonResultSet.results[0].id,
        peerNodeId: jsonResultSet.id,
        associations: jsonResultSet.info.associations,
        ac: jsonResultSet.info.ac,
        consequence: prettyConsequence(jsonResultSet.info.consequence),
      };
    }),
  };
}

async function fetchVariant(
  variantId: string
): Promise<VariationSearchResults> {
  return fetch(VARIANT_ENDPOINT + variantId, {})
    .then((response) => {
      return response.json();
    })
    .then((json) => parseVariantResult(json));
}

type SearchResultFiltersProps = {
  resultSets: ResultSet[];
  filteredNodeIds: NodeId[];
  setFilteredNodeIds: Dispatch<SetStateAction<NodeId[]>>;
};

type SearchResultTableProps = {
  resultSets: ResultSet[];
  filteredNodeIds: NodeId[];
};

function toggleNodeFiltering(
  filteredNodeIds: NodeId[],
  setFilteredNodeIds: Dispatch<SetStateAction<NodeId[]>>,
  toggledNodeId: NodeId
) {
  if (filteredNodeIds.includes(toggledNodeId)) {
    setFilteredNodeIds(
      filteredNodeIds.filter(
        (filteredNodeId) => filteredNodeId !== toggledNodeId
      )
    );
  } else {
    setFilteredNodeIds([...filteredNodeIds, toggledNodeId]);
  }
}

type FilterLinkProps = {
  setFilteredNodeIds: Dispatch<SetStateAction<NodeId[]>>;
};

function FilterNoneLink({ setFilteredNodeIds }: FilterLinkProps) {
  return (
    <a href="#" onClick={() => setFilteredNodeIds(nodeIdsInNodenameOrder)}>
      None
    </a>
  );
}

function FilterAllLink({ setFilteredNodeIds }: FilterLinkProps) {
  return (
    <a href="#" onClick={() => setFilteredNodeIds([])}>
      All
    </a>
  );
}

function SearchResultFilters({
  filteredNodeIds,
  setFilteredNodeIds,
}: SearchResultFiltersProps) {
  return (
    <div className="col-span-3 border border-gray-300 p-2">
      <div>
        <h2 className="font-bold inline-block">Organization</h2>
        <div className="inline-block text-cyan-500 float-right">
          <FilterAllLink setFilteredNodeIds={setFilteredNodeIds} />{" "}
          <FilterNoneLink setFilteredNodeIds={setFilteredNodeIds} />
        </div>
      </div>
      {nodeIdsInNodenameOrder.map((nodeId) => {
        return (
          <React.Fragment key={nodeId}>
            <input
              type="checkbox"
              readOnly
              checked={!filteredNodeIds.includes(nodeId)}
              onInput={() =>
                toggleNodeFiltering(filteredNodeIds, setFilteredNodeIds, nodeId)
              }
            />{" "}
            {nodeName(nodeId)}
            <br />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SearchResultTable({
  resultSets,
  filteredNodeIds,
}: SearchResultTableProps) {
  const unfilteredResultSets = resultSets.filter(
    (resultSet) => !filteredNodeIds.includes(resultSet.peerNodeId)
  );

  if (unfilteredResultSets.length === 0) {
    return (
      <div className="col-span-9">
        No unfiltered results were found for this query.
      </div>
    );
  }

  return (
    <div className="col-span-9">
      <table>
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left pt-2 pl-5 pb-5">Variant ID</th>
            <th className="text-left pt-2 pb-5">Peer name</th>
            <th className="text-left pt-2 pb-5">Consequence</th>
            <th className="text-left pt-2 pb-5">AC</th>
            <th className="text-left pt-2 pb-5 pr-5">Phenotypes</th>
          </tr>
        </thead>
        <tbody>
          {unfilteredResultSets.map((resultSet) => (
            <tr
              key={`${resultSet.peerNodeId}:${resultSet.variantId}`}
              className="even:bg-gray-100"
            >
              <td className="pt-2 pb-2 pl-5 pr-10">{resultSet.variantId}</td>
              <td className="pt-2 pb-2 pr-10">
                {nodeName(resultSet.peerNodeId)}
              </td>
              <td className="pt-2 pb-2 pr-10">{resultSet.consequence}</td>
              <td className="pt-2 pb-2 pr-10">{resultSet.ac}</td>
              <td className="pt-2 pb-2 pr-5">
                {resultSet.associations.map((association) => (
                  <React.Fragment key={association.id}>
                    {association.phenotype_description}
                    {association.p_value
                      ? ` (P-value ${association.p_value})`
                      : ""}
                    <br />
                  </React.Fragment>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchResults({ searchVariantId }: { searchVariantId: string }) {
  const [filteredNodeIds, setFilteredNodeIds] = useState<NodeId[]>([]);
  const normalizedVariantId = searchVariantId.toUpperCase();

  const query = useQuery({
    queryKey: ["variant", normalizedVariantId],
    queryFn: () => fetchVariant(normalizedVariantId),
    // tanstack-query is pretty aggressive by default about refetching, which
    // is probably good for most applications but isn't appropriate for data
    // that changes as slowly as this data will
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  const resultSets = query.data.resultSets;
  return (
    <>
      <SearchResultFilters
        resultSets={resultSets}
        filteredNodeIds={filteredNodeIds}
        setFilteredNodeIds={setFilteredNodeIds}
      />
      <SearchResultTable
        resultSets={resultSets}
        filteredNodeIds={filteredNodeIds}
      />
    </>
  );
}

const VariantResults = () => {
  const { variantId } = Route.useParams();
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="grid grid-cols-12 gap-20 pt-4 ps-8 pe-8">
        <SearchResults searchVariantId={variantId} />
      </div>{" "}
    </QueryClientProvider>
  );
};

export const Route = createLazyFileRoute("/variant/$variantId")({
  component: VariantResults,
});
