import React, { useState } from "react";
import axios from "axios";

const UploadZoneForm: React.FC = () => {
  const [jsonBody, setJsonBody] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [zoneCode, setZoneCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonBody);
    } catch {
      setStatusMessage("❌ Invalid JSON");
      return;
    }

    const payload = {
      city,
      zone_code: zoneCode,
      part_1_zoning_parameters: parsedJson,
    };

    try {
      const response = await axios.post("/zones/upload", payload);
      setStatusMessage(`✅ Success: Zone ID ${response.data.zone_id}`);
    } catch (error: any) {
      setStatusMessage(
        `❌ Error: ${error.response?.data?.detail || error.message}`
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Upload Zoning Data
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-1 font-medium text-gray-700">City</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-400"
          >
            <option value="Vancouver">Vancouver</option>
            <option value="Victoria">Victoria</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Zone Name
          </label>
          <input
            type="text"
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Zoning JSON Body
          </label>
          <textarea
            value={jsonBody}
            onChange={(e) => setJsonBody(e.target.value)}
            required
            rows={12}
            className="w-full font-mono text-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-400"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
        >
          Submit
        </button>
      </form>

      {statusMessage && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-800 whitespace-pre-wrap">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default UploadZoneForm;
