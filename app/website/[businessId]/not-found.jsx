export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mt-2">
          Website Not Found
        </h2>
        <p className="mt-4 text-gray-500">
          The website you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
