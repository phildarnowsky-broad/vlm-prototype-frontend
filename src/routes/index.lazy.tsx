import React, { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";

function Index() {
  return "";
}

export const Route = createLazyFileRoute("/")({
  component: Index,
});
