import React from "react";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import "../index.css";

// Workaround for the fact that the TS type for HTMLFormControlsCollection
// doesn't allow for string indexing, although that's valid according to the
// DOM API.

interface FormElements extends HTMLFormControlsCollection {
  "search-term": HTMLInputElement;
}

function looksLikeVariantId(searchTerm: string) {
  return searchTerm.trim().match(/.+-\d+-.+-.+/);
}

export const Route = createRootRoute({
  component: () => {
    const navigate = useNavigate();
    return (
      <>
        <h1 className="mt-4 mb-6 text-center text-8xl font-bold">
          Federated VLM Prototype
        </h1>
        <div className="grid grid-cols-11">
          <form
            className="col-start-5 col-span-3 pt-6 pb-6"
            onSubmit={(e) => {
              e.preventDefault();
              const formElements = e.currentTarget.elements as FormElements;
              const newSearchTerm = formElements["search-term"].value;

              if (looksLikeVariantId(newSearchTerm)) {
                navigate({
                  to: "/variant/$variantId",
                  params: { variantId: newSearchTerm },
                });
              } else {
                navigate({
                  to: "/gene/$geneSymbol",
                  params: { geneSymbol: newSearchTerm },
                });
              }
            }}
          >
            <div>
              <input
                className="border mr-5 p-3"
                placeholder="Variant ID"
                type="text"
                name="search-term"
              />
              <button className="p-2 border-1 rounded-full">Search</button>
            </div>
          </form>
        </div>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    );
  },
});
