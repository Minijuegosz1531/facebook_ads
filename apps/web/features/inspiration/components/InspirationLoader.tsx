export function InspirationLoader() {
  return (
    <div data-testid="inspiration-loader" className="space-y-4">
      <p className="text-sm text-gray-600">
        Generando imágenes y copies con IA…
      </p>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded bg-gray-200"
          />
        ))}
      </div>
    </div>
  );
}
