import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (id) => {
    try {
      await axios.post(`${API_URL}/campaigns/${id}/start`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error starting campaign:', error);
      alert('Failed to start campaign');
    }
  };

  const pauseCampaign = async (id) => {
    try {
      await axios.post(`${API_URL}/campaigns/${id}/pause`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading campaigns...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No campaigns found. Create your first campaign to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="mr-4">Caller ID: {campaign.caller_id}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="mr-4">Total Leads: {campaign.total_leads}</span>
                        <span className="mr-4">Calls Made: {campaign.calls_made}</span>
                        <span>Completed: {campaign.calls_completed}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {campaign.status === 'active' ? (
                        <button
                          onClick={() => pauseCampaign(campaign.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Pause
                        </button>
                      ) : campaign.status === 'draft' || campaign.status === 'paused' ? (
                        <button
                          onClick={() => startCampaign(campaign.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Start
                        </button>
                      ) : null}
                      <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
