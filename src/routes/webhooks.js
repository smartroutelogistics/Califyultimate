const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const twilioService = require('../services/twilioService');
const { validateTwilioSignature } = require('../middleware/auth');

/**
 * Twilio Webhook Endpoints
 * These endpoints are called by Twilio during call flows
 */

/**
 * POST /webhooks/twilio/answer - Handle call answered (after AMD)
 * Called when lead answers the phone
 */
router.post('/twilio/answer', validateTwilioSignature, async (req, res) => {
  try {
    const { leadId, callId, AnsweredBy, CallSid, CallStatus } = req.body;

    console.log(`Call answered - CallSid: ${CallSid}, AnsweredBy: ${AnsweredBy}, Status: ${CallStatus}`);

    // Generate TwiML response based on AMD result
    const twiml = await twilioService.handleAnsweredCall({
      leadId,
      callId,
      AnsweredBy,
      CallSid,
      CallStatus
    });

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error in answer webhook:', error);

    // Return error TwiML
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * POST /webhooks/twilio/amd - Handle AMD result (async callback)
 * Called when AMD (Answering Machine Detection) completes
 */
router.post('/twilio/amd', validateTwilioSignature, async (req, res) => {
  try {
    const { callId } = req.query;
    const { AnsweredBy, CallSid } = req.body;

    console.log(`AMD Result - CallSid: ${CallSid}, AnsweredBy: ${AnsweredBy}`);

    // Update call record with AMD result
    await pool.query(
      'UPDATE calls SET answered_by = $1, metadata = metadata || $2::jsonb WHERE call_sid = $3',
      [AnsweredBy, JSON.stringify({ amd_result: AnsweredBy }), CallSid]
    );

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error in AMD webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /webhooks/twilio/status - Handle call status updates
 * Called when call status changes (initiated, ringing, answered, completed)
 */
router.post('/twilio/status', validateTwilioSignature, async (req, res) => {
  try {
    const { callId } = req.query;
    const {
      CallSid,
      CallStatus,
      CallDuration,
      Direction,
      From,
      To
    } = req.body;

    console.log(`Call status update - CallSid: ${CallSid}, Status: ${CallStatus}`);

    const updates = {
      status: CallStatus
    };

    if (CallStatus === 'completed') {
      updates.end_time = new Date();
      updates.duration = parseInt(CallDuration) || 0;

      // If no disposition set yet, set default based on status
      const callResult = await pool.query(
        'SELECT disposition FROM calls WHERE call_sid = $1',
        [CallSid]
      );

      if (callResult.rows.length > 0 && !callResult.rows[0].disposition) {
        updates.disposition = 'completed';
      }

      // Update campaign completed count
      await pool.query(`
        UPDATE campaigns
        SET calls_completed = calls_completed + 1
        WHERE id = (SELECT campaign_id FROM calls WHERE call_sid = $1)
      `, [CallSid]);

      // Update agent current_calls count
      await pool.query(`
        UPDATE agents
        SET current_calls = GREATEST(0, current_calls - 1),
            total_calls_handled = total_calls_handled + 1,
            total_call_duration_seconds = total_call_duration_seconds + $1
        WHERE id = (SELECT agent_id FROM calls WHERE call_sid = $2)
      `, [parseInt(CallDuration) || 0, CallSid]);

      // Update lead status based on disposition
      const leadResult = await pool.query(`
        SELECT lead_id, disposition FROM calls WHERE call_sid = $1
      `, [CallSid]);

      if (leadResult.rows.length > 0) {
        const leadId = leadResult.rows[0].lead_id;
        const disposition = leadResult.rows[0].disposition;

        if (disposition === 'answered' || disposition === 'completed') {
          await pool.query(
            'UPDATE leads SET status = $1 WHERE id = $2',
            ['completed', leadId]
          );
        }
      }
    } else if (CallStatus === 'busy') {
      updates.disposition = 'busy';
    } else if (CallStatus === 'no-answer') {
      updates.disposition = 'no_answer';
    } else if (CallStatus === 'failed' || CallStatus === 'canceled') {
      updates.disposition = 'failed';
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [field, value] of Object.entries(updates)) {
      updateFields.push(`${field} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    if (updateFields.length > 0) {
      values.push(CallSid);
      const query = `UPDATE calls SET ${updateFields.join(', ')} WHERE call_sid = $${paramCount}`;
      await pool.query(query, values);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error in status webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /webhooks/twilio/agent-answer - Handle agent phone answered
 * Called when agent's phone is answered
 */
router.post('/twilio/agent-answer', validateTwilioSignature, async (req, res) => {
  try {
    const { conferenceName, leadName, callId } = req.query;

    console.log(`Agent phone answered for conference: ${conferenceName}`);

    // Generate TwiML to play whisper and wait for agent acceptance
    const twiml = twilioService.generateAgentAnswerTwiML(
      conferenceName,
      leadName
    );

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error in agent-answer webhook:', error);

    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * POST /webhooks/twilio/agent-accept - Handle agent accepting the call
 * Called when agent presses a key to accept
 */
router.post('/twilio/agent-accept', validateTwilioSignature, async (req, res) => {
  try {
    const { conferenceName } = req.query;
    const { Digits } = req.body;

    console.log(`Agent accepted call - Conference: ${conferenceName}, Digits: ${Digits}`);

    // Generate TwiML to join agent to conference
    const twiml = twilioService.generateAgentJoinConferenceTwiML(conferenceName);

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error in agent-accept webhook:', error);

    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred.');
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * POST /webhooks/twilio/agent-status - Handle agent call status
 * Called when agent call status changes
 */
router.post('/twilio/agent-status', validateTwilioSignature, async (req, res) => {
  try {
    const { callId, agentId } = req.query;
    const { CallStatus, CallDuration } = req.body;

    console.log(`Agent call status: ${CallStatus}`);

    if (CallStatus === 'completed' || CallStatus === 'no-answer' || CallStatus === 'busy') {
      // Update agent status back to available if call ended
      await pool.query(
        'UPDATE agents SET current_calls = GREATEST(0, current_calls - 1) WHERE id = $1',
        [agentId]
      );

      // Check if agent has no more calls, set to available
      const agentResult = await pool.query(
        'SELECT current_calls FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length > 0 && agentResult.rows[0].current_calls === 0) {
        await pool.query(
          'UPDATE agents SET status = $1 WHERE id = $2',
          ['available', agentId]
        );
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error in agent-status webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /webhooks/twilio/conference-status - Handle conference events
 * Called for conference lifecycle events
 */
router.post('/twilio/conference-status', validateTwilioSignature, async (req, res) => {
  try {
    const { callId } = req.query;
    const {
      ConferenceSid,
      FriendlyName,
      StatusCallbackEvent,
      Timestamp
    } = req.body;

    console.log(`Conference event: ${StatusCallbackEvent} - ${FriendlyName}`);

    // Update call metadata with conference events
    await pool.query(`
      UPDATE calls
      SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
      WHERE id = $2
    `, [
      JSON.stringify({
        conference_events: {
          [StatusCallbackEvent]: Timestamp
        }
      }),
      callId
    ]);

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error in conference-status webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /webhooks/twilio/recording - Handle recording completed
 * Called when call recording is available
 */
router.post('/twilio/recording', validateTwilioSignature, async (req, res) => {
  try {
    const { callId } = req.query;
    const {
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      CallSid
    } = req.body;

    console.log(`Recording completed - SID: ${RecordingSid}, Duration: ${RecordingDuration}s`);

    // Update call with recording information
    await pool.query(`
      UPDATE calls
      SET recording_sid = $1,
          recording_url = $2,
          recording_duration = $3
      WHERE call_sid = $4
    `, [RecordingSid, RecordingUrl, parseInt(RecordingDuration), CallSid]);

    // TODO: Optional - Download and upload to S3 for long-term storage
    // const s3Url = await uploadRecordingToS3(RecordingUrl, RecordingSid);

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error in recording webhook:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
