// Completely white loader - no blue elements at all
export function InstantLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-400 text-sm">•••</div>
    </div>
  );
}