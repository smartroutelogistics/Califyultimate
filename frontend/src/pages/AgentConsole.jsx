import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export default function AgentConsole() {
  const { user } = useAuth();
  const [agentStatus, setAgentStatus] = useState('offline');
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(WS_URL);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      // Join agent room
      newSocket.emit('agent:join', {
        agentId: user.id,
        tenantId: user.tenant_id
      });
    });

    newSocket.on('incoming:call', (data) => {
      console.log('Incoming call:', data);
      setIncomingCall(data);
    });

    newSocket.on('call:ended', () => {
      setCurrentCall(null);
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const updateStatus = async (newStatus) => {
    try {
      await axios.put(`${API_URL}/agents/${user.id}/status`, {
        status: newStatus
      });
      setAgentStatus(newStatus);

      if (socket) {
        socket.emit('agent:status', {
          agentId: user.id,
          status: newStatus
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const acceptCall = () => {
    setCurrentCall(incomingCall);
    setIncomingCall(null);
    setAgentStatus('busy');
  };

  const declineCall = () => {
    setIncomingCall(null);
  };

  const endCall = () => {
    setCurrentCall(null);
    setAgentStatus('available');
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Agent Console</h1>

      {/* Status Control */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
          <div className="flex space-x-3">
            <StatusButton
              label="Available"
              status="available"
              currentStatus={agentStatus}
              onClick={() => updateStatus('available')}
              color="green"
            />
            <StatusButton
              label="Break"
              status="break"
              currentStatus={agentStatus}
              onClick={() => updateStatus('break')}
              color="yellow"
            />
            <StatusButton
              label="Offline"
              status="offline"
              currentStatus={agentStatus}
              onClick={() => updateStatus('offline')}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Incoming Call */}
      {incomingCall && (
        <div className="bg-blue-50 border-2 border-blue-500 shadow-lg rounded-lg mb-6 animate-pulse">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Incoming Call</h3>
            <div className="space-y-2 mb-4">
              <p className="text-gray-800">
                <strong>Name:</strong> {incomingCall.first_name} {incomingCall.last_name}
              </p>
              <p className="text-gray-800">
                <strong>Phone:</strong> {incomingCall.phone}
              </p>
              {incomingCall.type && (
                <p className="text-gray-800">
                  <strong>Type:</strong> {incomingCall.type}
                </p>
              )}
              {incomingCall.notes && (
                <p className="text-gray-800">
                  <strong>Notes:</strong> {incomingCall.notes}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={acceptCall}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Accept Call
              </button>
              <button
                onClick={declineCall}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Call */}
      {currentCall && (
        <div className="bg-green-50 border-2 border-green-500 shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">Active Call</h3>
            <div className="space-y-2 mb-4">
              <p className="text-gray-800">
                <strong>Name:</strong> {currentCall.first_name} {currentCall.last_name}
              </p>
              <p className="text-gray-800">
                <strong>Phone:</strong> {currentCall.phone}
              </p>
              {currentCall.type && (
                <p className="text-gray-800">
                  <strong>Type:</strong> {currentCall.type}
                </p>
              )}
            </div>
            <button
              onClick={endCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Idle State */}
      {!incomingCall && !currentCall && (
        <div className="bg-white shadow rounded-lg text-center py-12">
          <p className="text-gray-500 text-lg">
            {agentStatus === 'available'
              ? 'Waiting for calls...'
              : agentStatus === 'break'
              ? 'On break - No calls will be routed to you'
              : 'Offline - Set status to "Available" to receive calls'}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusButton({ label, status, currentStatus, onClick, color }) {
  const colors = {
    green: currentStatus === status ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200',
    yellow: currentStatus === status ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    gray: currentStatus === status ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium ${colors[color]}`}
    >
      {label}
    </button>
  );
}
