export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-gray-200 p-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          App Ideas Finder
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          This Domain Is For Sale
        </h2>
        <div className="text-gray-600 text-lg mb-8 space-y-3">
          <p>This website is no longer active.</p>
          <p>
            The domain <strong className="text-gray-900">appideasfinder.com</strong> is available for purchase.
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 mt-8">
          <p className="font-semibold text-gray-900 mb-2">
            Interested in purchasing this domain?
          </p>
          <p className="text-gray-600 mb-4">
            Please contact us to discuss.
          </p>
          <p className="mt-4">
            <a 
              href="mailto:contact@appideasfinder.com" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              contact@appideasfinder.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
