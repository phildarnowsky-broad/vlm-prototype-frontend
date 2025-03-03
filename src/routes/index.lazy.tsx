import { createLazyFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React, { useState } from "react";
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

export const Route = createLazyFileRoute("/")({
  component: Index,
});

type NodeMetadata = {
  nodeName?: string;
  hostingInstitutionName?: string;
};

const nodeMetadata: Record<string, NodeMetadata> = {
  "1": { nodeName: "Alpha Gene Repo", hostingInstitutionName: "Alpha Labs" },
  "2": {
    nodeName: "Boston Genome Project",
    hostingInstitutionName: "Boston Biopharmaceuticals",
  },
  "3": {
    nodeName: "ManyVariants",
    hostingInstitutionName: "Charles River Medical Center",
  },
  "4": {
    nodeName: "Winnemac Biobank",
    hostingInstitutionName: "University of Winnemac",
  },
  "5": {
    nodeName: "BIGDB",
    hostingInstitutionName:
      "Institute for the General Betterment of Everything",
  },
  "6": { nodeName: "geneoid", hostingInstitutionName: "genetixco" },
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
    <>
      Hosted by <a href="#">{name}</a>
    </>
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
  return <Avvvatars style="shape" value={nodeName(id)} />;
}

function NodeName({ id }: { id: string }) {
  return <div className="font-bold">{nodeName(id)}</div>;
}

function ResultItem({ resultSet }: { resultSet: ResultSet }) {
  return (
    <>
      <div>
        <Avatar id={resultSet.id} />
      </div>
      <div className="col-span-3">
        <NodeName id={resultSet.id} />
        <HostLink id={resultSet.id} />
      </div>
      <div>
        <AC ac={resultSet.info.ac} />
        <Associations associations={resultSet.info.associations} />
      </div>{" "}
    </>
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
    <div className="grid grid-cols-5 gap-4">
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
