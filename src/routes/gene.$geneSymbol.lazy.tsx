import React from "react";
import { createLazyFileRoute } from "@tanstack/react-router";

function GeneResults() {
  const { geneSymbol } = Route.useParams();
  console.log(geneSymbol);
  return <div>TK genes here soon</div>;
}

export const Route = createLazyFileRoute("/gene/$geneSymbol")({
  component: GeneResults,
});
