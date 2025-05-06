import React from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import Avvvatars from "avvvatars-react";

type Association = {
  id: number;
  p_value: number | null;
  phenotype_id: string | null;
  phenotype_description: string;
};

interface ResultSet {
  id: string;
  info: {
    ac: number;
    associations: Association[];
  };
}

interface VariationSearchResults {
  resultSets: ResultSet[];
}

type NodeMetadata = {
  nodeName?: string;
  hostingInstitutionName?: string;
};

// TODO: better way to get these than via hardcoded peer IDs
const nodeMetadata: Record<string, NodeMetadata> = {
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

function hostingInstitutionName(id: string): string | undefined {
  return nodeMetadata[id]?.hostingInstitutionName;
}

function nodeName(id: string): string {
  return nodeMetadata[id]?.nodeName ?? `Peer ${id}`;
}

const VARIANT_ENDPOINT = "http://localhost:8000/variant/";

async function fetchVariant(
  variantId: string
): Promise<VariationSearchResults> {
  return fetch(VARIANT_ENDPOINT + variantId, {}).then((response) => {
    return response.json();
  });
}

function Associations({ associations }: { associations: Association[] }) {
  if (associations.length === 0) {
    return null;
  }

  return (
    <div>
      <span className="font-bold">Associations:</span>
      {associations.map((association) => (
        <div key={association.id}>{association.phenotype_description}</div>
      ))}
    </div>
  );
}

function HostLink({ id }: { id: string }) {
  const name = hostingInstitutionName(id);
  if (name === undefined) {
    return null;
  }
  return (
    <div className="text-xs text-gray-400">
      Hosted by{" "}
      <a className="text-blue-400" href="#">
        {name}
      </a>
    </div>
  );
}

function AC({ ac }: { ac: number }) {
  return (
    <div>
      <span className="font-bold">AC</span>:{ac}
    </div>
  );
}

function Avatar({ id }: { id: string }) {
  // TODO: use real logos where available
  return <Avvvatars size={64} style="shape" value={nodeName(id)} />;
}

function NodeName({ id }: { id: string }) {
  return <div className="font-bold text-xl">{nodeName(id)}</div>;
}

function ResultItem({ resultSet }: { resultSet: ResultSet }) {
  return (
    <div className="border border-gray-200 p-4 col-start-4 grid grid-cols-subgrid col-span-5">
      <div className="">
        <Avatar id={resultSet.id} />
      </div>
      <div className="col-span-2">
        <NodeName id={resultSet.id} />
        <HostLink id={resultSet.id} />
      </div>
      <div>
        <div>
          <AC ac={resultSet.info.ac} />
          <Associations associations={resultSet.info.associations} />
        </div>
      </div>
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
      {resultSets.map((resultSet) => (
        <ResultItem key={resultSet.id} resultSet={resultSet} />
      ))}
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
