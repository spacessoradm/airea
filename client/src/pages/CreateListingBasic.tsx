function CreateListingBasic() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a href="/agent/portal" className="text-blue-600 hover:underline">← Back to Portal</a>
          <h1 className="text-3xl font-bold mt-4">Create New Listing</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="space-y-8">
            {/* Step 1: Listing Type */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Listing Type</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50">
                  <div className="text-lg font-medium">For Rent</div>
                </button>
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50">
                  <div className="text-lg font-medium">For Sale</div>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50">Residential</button>
                <button className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50">Commercial</button>
                <button className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50">Industrial</button>
              </div>
            </div>

            {/* Step 2: Location */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Location</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Property Title</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Enter property title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>Select city</option>
                      <option>Kuala Lumpur</option>
                      <option>Shah Alam</option>
                      <option>Petaling Jaya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>Select state</option>
                      <option>Selangor</option>
                      <option>Kuala Lumpur</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Unit Details */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 3: Unit Details</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bedrooms</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bathrooms</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Square Feet</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Price */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 4: Price Information</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Price (RM)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            {/* Step 5: Legal Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 5: Legal Information</h2>
              <p className="text-gray-600 mb-6">Please provide the mandatory legal information for this property. All fields are required.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Property Tenure <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg">
                    <option>Select tenure type</option>
                    <option value="freehold">Freehold</option>
                    <option value="leasehold">Leasehold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title Type <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg">
                    <option>Select title type</option>
                    <option value="individual">Individual Title</option>
                    <option value="strata">Strata Title</option>
                    <option value="master">Master Title</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Land Title Type <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg">
                    <option>Select land title type</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="agriculture">Agriculture</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-medium text-blue-900 mb-2">Legal Information Guide</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Tenure:</strong> Freehold means you own the property indefinitely. Leasehold means you own it for a specified period.</p>
                  <p><strong>Title Type:</strong> Individual (single unit), Strata (subdivided building), Master (entire development).</p>
                  <p><strong>Land Title:</strong> Indicates the approved land use - must match the property type you're listing.</p>
                </div>
              </div>
            </div>

            {/* Step 6: Preview */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 6: Preview & Submit</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Property Listing Preview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Property Type:</span>
                    <span className="ml-2 text-gray-600">To be selected</span>
                  </div>
                  <div>
                    <span className="font-medium">Listing Type:</span>
                    <span className="ml-2 text-gray-600">To be selected</span>
                  </div>
                  <div>
                    <span className="font-medium">Tenure:</span>
                    <span className="ml-2 text-gray-600">To be selected</span>
                  </div>
                  <div>
                    <span className="font-medium">Title Type:</span>
                    <span className="ml-2 text-gray-600">To be selected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-8">
              <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                Previous
              </button>
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Create Property
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateListingBasic;