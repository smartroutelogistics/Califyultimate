const twilio = require('twilio');
const pool = require('../config/database');
require('dotenv').config();

/**
 * Twilio Integration Service
 * Handles outbound calling with AMD, warm-transfer via conference, and call tracking
 */

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.twilioNumber = process.env.TWILIO_NUMBER;
    this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.BASE_URL;
  }

  /**
   * Initiate outbound call to lead with AMD enabled
   * @param {object} options - Call options
   * @returns {Promise<object>} Call details with SID
   */
  async initiateCall(options) {
    const {
      leadId,
      campaignId,
      tenantId,
      toNumber,
      callerId,
      amdEnabled = true
    } = options;

    try {
      // Update lead status to 'calling'
      await pool.query(
        'UPDATE leads SET status = $1, call_attempts = call_attempts + 1, last_call_at = NOW() WHERE id = $2',
        ['calling', leadId]
      );

      // Create call record in database
      const callResult = await pool.query(`
        INSERT INTO calls (
          tenant_id, campaign_id, lead_id, from_number, to_number,
          direction, status, start_time
        ) VALUES ($1, $2, $3, $4, $5, 'outbound', 'initiated', NOW())
        RETURNING id
      `, [tenantId, campaignId, leadId, callerId, toNumber]);

      const callId = callResult.rows[0].id;

      // Initiate Twilio call with AMD
      const call = await this.client.calls.create({
        to: toNumber,
        from: callerId,
        url: `${this.webhookBaseUrl}/webhooks/twilio/answer?leadId=${leadId}&callId=${callId}`,
        statusCallback: `${this.webhookBaseUrl}/webhooks/twilio/status?callId=${callId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        machineDetection: amdEnabled ? 'DetectMessageEnd' : 'Enable',
        asyncAmd: true, // Get AMD results via webhook
        asyncAmdStatusCallback: `${this.webhookBaseUrl}/webhooks/twilio/amd?callId=${callId}`,
        timeout: 30,
        record: false // We'll enable recording after transfer if needed
      });

      // Update call record with Twilio SID
      await pool.query(
        'UPDATE calls SET call_sid = $1 WHERE id = $2',
        [call.sid, callId]
      );

      // Update campaign calls_made count
      await pool.query(
        'UPDATE campaigns SET calls_made = calls_made + 1 WHERE id = $1',
        [campaignId]
      );

      return {
        success: true,
        callId,
        callSid: call.sid,
        status: call.status
      };

    } catch (error) {
      // Update lead status to 'failed'
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['failed', leadId]
      );

      console.error('Call initiation error:', error);
      throw new Error(`Failed to initiate call: ${error.message}`);
    }
  }

  /**
   * Generate TwiML for answered call (handles AMD result)
   * @param {object} params - Request parameters
   * @returns {string} TwiML response
   */
  async handleAnsweredCall(params) {
    const { leadId, callId, AnsweredBy, CallSid } = params;

    const twiml = new twilio.twiml.VoiceResponse();

    try {
      // Get lead and campaign details
      const result = await pool.query(`
        SELECT l.*, c.voicemail_message_url, c.record_calls, c.agent_group_id
        FROM leads l
        JOIN campaigns c ON l.campaign_id = c.id
        WHERE l.id = $1
      `, [leadId]);

      if (result.rows.length === 0) {
        twiml.say('An error occurred. Please try again later.');
        twiml.hangup();
        return twiml.toString();
      }

      const lead = result.rows[0];

      // Update call with answered_by status
      await pool.query(
        'UPDATE calls SET answered_by = $1, answer_time = NOW(), status = $2 WHERE id = $3',
        [AnsweredBy || 'unknown', 'answered', callId]
      );

      // Handle based on AMD result
      if (AnsweredBy === 'human') {
        // HUMAN DETECTED - Initiate warm transfer (conference)
        console.log(`Human detected for lead ${leadId}, initiating warm transfer`);

        return await this.createWarmTransfer(twiml, {
          leadId,
          callId,
          callSid: CallSid,
          leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
          agentGroupId: lead.agent_group_id,
          recordCall: lead.record_calls
        });

      } else {
        // MACHINE/VOICEMAIL DETECTED
        console.log(`Machine detected for lead ${leadId}, playing voicemail message`);

        await pool.query(
          'UPDATE calls SET disposition = $1 WHERE id = $2',
          ['voicemail', callId]
        );

        if (lead.voicemail_message_url) {
          // Play pre-recorded voicemail message
          twiml.play(lead.voicemail_message_url);
        } else {
          // Default voicemail message
          twiml.say({
            voice: 'alice',
            language: 'en-US'
          }, 'Hello, this is an important message. Please call us back at your earliest convenience. Thank you.');
        }

        // Start recording after beep
        twiml.record({
          maxLength: 120,
          playBeep: false,
          recordingStatusCallback: `${this.webhookBaseUrl}/webhooks/twilio/recording?callId=${callId}`
        });

        twiml.hangup();

        // Schedule retry based on campaign retry policy
        await this.scheduleRetry(lead);

        return twiml.toString();
      }

    } catch (error) {
      console.error('Error handling answered call:', error);
      twiml.say('An error occurred. Please try again later.');
      twiml.hangup();
      return twiml.toString();
    }
  }

  /**
   * Create warm transfer using Twilio Conference
   * Lead stays in conference, agent is called and added
   */
  async createWarmTransfer(twiml, options) {
    const { leadId, callId, callSid, leadName, agentGroupId, recordCall } = options;

    // Create unique conference name
    const conferenceName = `call_${callId}`;

    // Put the lead in a conference room
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Please hold while we connect you with an agent.');

    const dial = twiml.dial();

    dial.conference({
      waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
      statusCallback: `${this.webhookBaseUrl}/webhooks/twilio/conference-status?callId=${callId}`,
      statusCallbackEvent: ['start', 'end', 'join', 'leave'],
      record: recordCall ? 'record-from-start' : 'do-not-record',
      recordingStatusCallback: `${this.webhookBaseUrl}/webhooks/twilio/recording?callId=${callId}`
    }, conferenceName);

    // Store conference name in call record
    await pool.query(
      'UPDATE calls SET conference_sid = $1 WHERE id = $2',
      [conferenceName, callId]
    );

    // Find available agent and initiate call to agent
    await this.callAgent({
      conferenceName,
      leadId,
      callId,
      leadName,
      agentGroupId
    });

    return twiml.toString();
  }

  /**
   * Call an available agent and add them to the conference
   */
  async callAgent(options) {
    const { conferenceName, leadId, callId, leadName, agentGroupId } = options;

    try {
      // Find available agent
      const agentQuery = agentGroupId
        ? 'SELECT * FROM agents WHERE agent_group_id = $1 AND status = $2 AND is_active = true ORDER BY current_calls ASC LIMIT 1'
        : 'SELECT * FROM agents WHERE status = $1 AND is_active = true ORDER BY current_calls ASC LIMIT 1';

      const agentParams = agentGroupId ? [agentGroupId, 'available'] : ['available'];

      const agentResult = await pool.query(agentQuery, agentParams);

      if (agentResult.rows.length === 0) {
        console.error('No available agents found');
        // TODO: Implement fallback (voicemail, callback queue, etc.)
        return;
      }

      const agent = agentResult.rows[0];

      // Update agent status
      await pool.query(
        'UPDATE agents SET current_calls = current_calls + 1, status = $1 WHERE id = $2',
        ['busy', agent.id]
      );

      // Update call record with agent
      await pool.query(
        'UPDATE calls SET agent_id = $1 WHERE id = $2',
        [agent.id, callId]
      );

      // Call the agent
      const agentCall = await this.client.calls.create({
        to: agent.phone,
        from: this.twilioNumber,
        url: `${this.webhookBaseUrl}/webhooks/twilio/agent-answer?conferenceName=${encodeURIComponent(conferenceName)}&leadName=${encodeURIComponent(leadName)}&callId=${callId}`,
        statusCallback: `${this.webhookBaseUrl}/webhooks/twilio/agent-status?callId=${callId}&agentId=${agent.id}`,
        timeout: 20
      });

      console.log(`Agent ${agent.name} called for lead ${leadId}, agent call SID: ${agentCall.sid}`);

    } catch (error) {
      console.error('Error calling agent:', error);
    }
  }

  /**
   * Generate TwiML for agent answer (whisper + join conference)
   */
  generateAgentAnswerTwiML(conferenceName, leadName) {
    const twiml = new twilio.twiml.VoiceResponse();

    // Whisper to agent (brief preview)
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, `Connecting you with ${leadName || 'a customer'}. Press any key to accept.`);

    // Wait for agent to press any key
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 10,
      action: `${this.webhookBaseUrl}/webhooks/twilio/agent-accept?conferenceName=${encodeURIComponent(conferenceName)}`
    });

    gather.say('Press any key to accept this call.');

    // If no input, hang up
    twiml.say('No response received. Call ended.');
    twiml.hangup();

    return twiml.toString();
  }

  /**
   * Add agent to conference after they accept
   */
  generateAgentJoinConferenceTwiML(conferenceName) {
    const twiml = new twilio.twiml.VoiceResponse();

    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Connecting now.');

    const dial = twiml.dial();
    dial.conference({
      startConferenceOnEnter: false,
      endConferenceOnExit: true, // End conference when agent leaves
      beep: false
    }, conferenceName);

    return twiml.toString();
  }

  /**
   * Schedule retry for lead based on campaign retry policy
   */
  async scheduleRetry(lead) {
    try {
      // Get campaign retry policy
      const result = await pool.query(
        'SELECT retry_policy FROM campaigns WHERE id = $1',
        [lead.campaign_id]
      );

      if (result.rows.length === 0) return;

      const retryPolicy = result.rows[0].retry_policy;

      // Check if we should retry
      if (lead.call_attempts >= (retryPolicy.max_attempts || 3)) {
        // Max attempts reached, mark as completed
        await pool.query(
          'UPDATE leads SET status = $1 WHERE id = $2',
          ['completed', lead.id]
        );
        return;
      }

      // Calculate next call time
      const delayMinutes = retryPolicy.delay_minutes || 60;
      const nextCallAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      // Update lead with next call time
      await pool.query(
        'UPDATE leads SET status = $1, next_call_at = $2 WHERE id = $3',
        ['queued', nextCallAt, lead.id]
      );

      // Add to call queue
      await pool.query(
        'INSERT INTO call_queue (campaign_id, lead_id, scheduled_at, priority) VALUES ($1, $2, $3, $4)',
        [lead.campaign_id, lead.id, nextCallAt, lead.priority === 'high' ? 8 : 5]
      );

      console.log(`Retry scheduled for lead ${lead.id} at ${nextCallAt}`);

    } catch (error) {
      console.error('Error scheduling retry:', error);
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhookSignature(req) {
    const signature = req.headers['x-twilio-signature'];
    const url = `${this.webhookBaseUrl}${req.originalUrl}`;
    const params = req.body;

    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  }

  /**
   * Get call details from Twilio
   */
  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error) {
      console.error('Error fetching call details:', error);
      return null;
    }
  }
}

module.exports = new TwilioService();
