import { useQuery, UseQueryOptions, QueryClient } from "@tanstack/react-query";

function useDefaultQuery(
  params: UseQueryOptions,
  client?: QueryClient
): ReturnType<typeof useQuery> {
  const defaultParams = {
    // tanstack-query is pretty aggressive by default about refetching, which
    // is probably good for most applications but isn't appropriate for data
    // that changes as slowly as this data will
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };

  return useQuery({ ...defaultParams, ...params }, client);
}

export default useDefaultQuery;
