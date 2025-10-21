import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function LeadUpload() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedCampaign) {
      setError('Please select a campaign');
      return;
    }

    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaign_id', selectedCampaign);

    try {
      const response = await axios.post(`${API_URL}/leads/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data.results);
      setFile(null);
      e.target.reset();
    } catch (error) {
      setError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Leads</h1>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            CSV Upload
          </h3>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">Upload Results:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>Total rows: {result.total}</li>
                <li>Valid: {result.valid}</li>
                <li>Inserted: {result.inserted}</li>
                <li>Invalid: {result.invalid}</li>
                <li>Duplicates: {result.duplicates}</li>
                <li>DNC: {result.dnc}</li>
              </ul>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="campaign" className="block text-sm font-medium text-gray-700">
                Select Campaign
              </label>
              <select
                id="campaign"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">-- Select a campaign --</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                CSV File
              </label>
              <input
                type="file"
                id="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
              />
              <p className="mt-2 text-sm text-gray-500">
                CSV format: first_name, last_name, phone, country, type, priority, do_not_call, notes
              </p>
            </div>

            <div className="flex items-center justify-between">
              <a
                href={`${API_URL}/leads/template/csv`}
                download="leads_template.csv"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Download CSV Template
              </a>

              <button
                type="submit"
                disabled={uploading || !selectedCampaign || !file}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Leads'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Guidelines:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Phone numbers should be in international format (E.164) or will be normalized automatically</li>
          <li>Required field: phone</li>
          <li>Priority values: low, normal, high, urgent</li>
          <li>Duplicate phone numbers will be skipped</li>
          <li>Numbers on DNC list will be automatically filtered</li>
        </ul>
      </div>
    </div>
  );
}
