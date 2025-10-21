import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/calls/stats/summary`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={stats?.total_calls || 0}
          bgColor="bg-blue-500"
        />
        <StatCard
          title="Answered Calls"
          value={stats?.answered_calls || 0}
          bgColor="bg-green-500"
        />
        <StatCard
          title="Human Answered"
          value={stats?.human_answered || 0}
          bgColor="bg-purple-500"
        />
        <StatCard
          title="Avg Duration"
          value={stats?.avg_duration ? `${Math.round(stats.avg_duration)}s` : '0s'}
          bgColor="bg-yellow-500"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Call Breakdown</h3>
            <div className="space-y-2">
              <BreakdownRow label="Answered" value={stats?.answered_calls || 0} />
              <BreakdownRow label="Voicemail" value={stats?.voicemail_calls || 0} />
              <BreakdownRow label="No Answer" value={stats?.no_answer_calls || 0} />
              <BreakdownRow label="Busy" value={stats?.busy_calls || 0} />
              <BreakdownRow label="Failed" value={stats?.failed_calls || 0} />
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-2">
              <BreakdownRow
                label="Avg Talk Time"
                value={stats?.avg_talk_time ? `${Math.round(stats.avg_talk_time)}s` : '0s'}
              />
              <BreakdownRow
                label="Total Cost"
                value={stats?.total_cost ? `$${parseFloat(stats.total_cost).toFixed(2)}` : '$0.00'}
              />
              <BreakdownRow
                label="Machine Detected"
                value={stats?.machine_answered || 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, bgColor }) {
  return (
    <div className={`${bgColor} overflow-hidden shadow rounded-lg`}>
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-white truncate">{title}</dt>
        <dd className="mt-1 text-3xl font-semibold text-white">{value}</dd>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
