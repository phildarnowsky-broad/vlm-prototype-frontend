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

function NodeName({ id }: { id: string }) {
  return <div className="font-bold text-xl">{nodeName(id)}</div>;
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
    <div>
      Organization <FilterAllLink setFilteredNodeIds={setFilteredNodeIds} />
      <FilterNoneLink setFilteredNodeIds={setFilteredNodeIds} />
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
            />
            {nodeName(nodeId)}
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
    return <>No unfiltered results were found for this query.</>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Variant ID</th>
          <th>Peer name</th>
          <th>Consequence</th>
          <th>AC</th>
          <th>Phenotypes</th>
        </tr>
      </thead>
      <tbody>
        {unfilteredResultSets.map((resultSet) => (
          <tr key={`${resultSet.peerNodeId}:${resultSet.variantId}`}>
            <td>{resultSet.variantId}</td>
            <td>{nodeName(resultSet.peerNodeId)}</td>
            <td>{resultSet.consequence}</td>
            <td>{resultSet.ac}</td>
            <td>
              {resultSet.associations.map((association) => (
                <React.Fragment key={association.id}>
                  {association.phenotype_description}
                  {association.p_value
                    ? ` (P-value ${association.p_value})`
                    : ""}
                </React.Fragment>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SearchResults({ searchVariantId }: { searchVariantId: string }) {
  const [filteredNodeIds, setFilteredNodeIds] = useState<NodeId[]>([]);

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

  // TODO: better layout for pending/error messages
  if (query.isPending) {
    return <>Pending</>;
  }

  if (query.isError) {
    return <>Error: {JSON.stringify(query.error)}</>;
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
      <div className="grid grid-cols-11">
        <SearchResults searchVariantId={variantId} />
      </div>{" "}
    </QueryClientProvider>
  );
};

export const Route = createLazyFileRoute("/variant/$variantId")({
  component: VariantResults,
});
