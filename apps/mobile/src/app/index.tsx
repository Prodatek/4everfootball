import { Redirect } from "expo-router";

// True root — neither route group defines its own "/" route ((public)'s
// tabs all live under sub-paths, (scout)'s own index is reached via its
// group being active). This is the one concrete route the app always has
// something to render for on cold start; each group's own layout guard
// then redirects further if the auth state doesn't match where this sends
// them.
export default function Index() {
  return <Redirect href="/(public)/fixtures" />;
}
