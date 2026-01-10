import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Landing from "@/pages/Landing";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        <Landing />
      </div>
    </QueryClientProvider>
  );
}

export default App;