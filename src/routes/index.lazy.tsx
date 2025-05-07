import React, { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";

function Index() {
  return <div>TK index</div>;
}

export const Route = createLazyFileRoute("/")({
  component: Index,
});
