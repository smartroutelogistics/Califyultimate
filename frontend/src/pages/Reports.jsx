import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Reports() {
  const [calls, setCalls] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filters, setFilters] = useState({
    campaign_id: '',
    disposition: '',
    date_from: '',
    date_to: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchCalls();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_URL}/calls?${params.toString()}`);
      setCalls(response.data.calls);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchCalls();
  };

  const exportCSV = () => {
    // Simple CSV export
    const headers = ['Date', 'Campaign', 'Lead Name', 'Phone', 'Duration', 'Disposition', 'Agent'];
    const rows = calls.map(call => [
      new Date(call.start_time).toLocaleString(),
      call.campaign_name || 'N/A',
      `${call.first_name || ''} ${call.last_name || ''}`.trim() || 'N/A',
      call.to_number,
      call.duration || 0,
      call.disposition || 'N/A',
      call.agent_name || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Call Reports</h1>
        <button
          onClick={exportCSV}
          disabled={calls.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign
              </label>
              <select
                value={filters.campaign_id}
                onChange={(e) => handleFilterChange('campaign_id', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Campaigns</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disposition
              </label>
              <select
                value={filters.disposition}
                onChange={(e) => handleFilterChange('disposition', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Dispositions</option>
                <option value="answered">Answered</option>
                <option value="voicemail">Voicemail</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={applyFilters}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disposition
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No calls found
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr key={call.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.start_time ? new Date(call.start_time).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.first_name} {call.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.to_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.duration ? `${call.duration}s` : '0s'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getDispositionColor(call.disposition)}`}>
                      {call.disposition || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.agent_name || 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getDispositionColor(disposition) {
  const colors = {
    answered: 'bg-green-100 text-green-800',
    voicemail: 'bg-blue-100 text-blue-800',
    no_answer: 'bg-yellow-100 text-yellow-800',
    busy: 'bg-orange-100 text-orange-800',
    failed: 'bg-red-100 text-red-800',
    completed: 'bg-purple-100 text-purple-800'
  };
  return colors[disposition] || 'bg-gray-100 text-gray-800';
}
